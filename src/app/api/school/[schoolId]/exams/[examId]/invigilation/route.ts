import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import Student from "@/models/Student";
import ExamAttempt from "@/models/ExamAttempt";
import { requireSchoolAccess } from "@/lib/auth";
import { evaluateAttempt } from "@/lib/grading";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; examId: string }> }
) {
  try {
    const { schoolId, examId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const exam = await Exam.findOne({ _id: examId, schoolId: school._id }).lean();
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    // 1. Fetch all students eligible for this exam
    let studentQuery: any = { schoolId: school._id, status: "active" };
    const targeting = exam.targeting;
    const targetingType = targeting?.type || (exam.classGrade ? "assigned_class" : "all");

    if (targetingType === "assigned_class" && exam.classGrade) {
      studentQuery.classGrade = exam.classGrade;
    } else if (targetingType === "class_section") {
      if (targeting?.classes?.length) studentQuery.classGrade = { $in: targeting.classes };
      if (targeting?.sections?.length) studentQuery.section = { $in: targeting.sections };
    } else if (targetingType === "custom_list" && targeting?.studentIds?.length) {
      studentQuery._id = { $in: targeting.studentIds };
    }

    const [allStudents, attempts] = await Promise.all([
      Student.find(studentQuery).sort({ rollNumber: 1 }).lean(),
      ExamAttempt.find({ examId: exam._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const attemptMap = new Map<string, any>();
    attempts.forEach((att: any) => {
      const studentIdStr = att.studentId?.toString();
      if (studentIdStr && !attemptMap.has(studentIdStr)) {
        attemptMap.set(studentIdStr, att);
      }
    });

    const now = Date.now();
    let activeCount = 0;
    let submittedCount = 0;
    let flaggedCount = 0;
    let violationTotal = 0;

    const totalQuestions = exam.questions?.length || 0;

    // Build unified live roster
    const candidates = allStudents.map((student: any) => {
      const attempt = attemptMap.get(student._id.toString());

      if (!attempt) {
        return {
          studentId: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          admissionNumber: student.admissionNumber,
          classGrade: student.classGrade,
          section: student.section,
          status: "not_started",
          answeredQuestions: 0,
          totalQuestions,
          violationCount: 0,
          recentEvent: null,
          remainingSeconds: null,
          startedAt: null,
          submittedAt: null,
          attemptId: null,
        };
      }

      const deadlineMs = new Date(attempt.serverDeadline).getTime();
      const remainingSeconds = Math.max(0, Math.floor((deadlineMs - now) / 1000));

      const answeredCount = (attempt.responses || []).filter(
        (r: any) =>
          (r.selectedOptions && r.selectedOptions.length > 0) ||
          (r.writtenAnswer && r.writtenAnswer.trim().length > 0)
      ).length;

      const lastActivityTime = attempt.responses?.length
        ? Math.max(
            ...attempt.responses.map((r: any) =>
              r.answeredAt ? new Date(r.answeredAt).getTime() : 0
            )
          )
        : new Date(attempt.startedAt).getTime();

      const isRecentActivity = now - lastActivityTime < 180000; // within 3 minutes

      let liveStatus = attempt.status;
      if (attempt.status === "in_progress") {
        if (remainingSeconds <= 0) {
          liveStatus = "timed_out";
        } else if (isRecentActivity) {
          liveStatus = "active";
          activeCount += 1;
        } else {
          liveStatus = "idle";
          activeCount += 1;
        }
      } else if (["submitted", "auto_submitted"].includes(attempt.status)) {
        submittedCount += 1;
      }

      if (attempt.status === "flagged") {
        flaggedCount += 1;
      }

      const violations = attempt.violationCount || 0;
      violationTotal += violations;

      const recentEvent = attempt.integrityLog?.length
        ? attempt.integrityLog[attempt.integrityLog.length - 1]
        : null;

      return {
        studentId: student._id,
        attemptId: attempt._id,
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        classGrade: student.classGrade,
        section: student.section,
        status: liveStatus,
        rawStatus: attempt.status,
        answeredQuestions: answeredCount,
        totalQuestions,
        violationCount: violations,
        recentEvent,
        remainingSeconds,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        scores: attempt.scores || null,
      };
    });

    return NextResponse.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        subject: exam.subject,
        accessCode: exam.accessCode,
        durationMinutes: exam.config?.durationMinutes,
        startTime: exam.config?.startTime,
        endTime: exam.config?.endTime,
        maxViolations: exam.config?.antiCheating?.maxViolations || 3,
        antiCheatingEnabled: exam.config?.antiCheating?.enabled ?? true,
      },
      summary: {
        totalEnrolled: allStudents.length,
        activeNow: activeCount,
        submitted: submittedCount,
        flagged: flaggedCount,
        notStarted: allStudents.length - attempts.length,
        totalViolations: violationTotal,
      },
      candidates,
    });
  } catch (error: any) {
    const status = error.message?.includes("FORBIDDEN") || error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; examId: string }> }
) {
  try {
    const { schoolId, examId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const body = await req.json();
    const { action, attemptId, extraMinutes } = body;

    if (!attemptId) {
      return NextResponse.json({ success: false, error: "attemptId is required." }, { status: 400 });
    }

    const [attempt, exam] = await Promise.all([
      ExamAttempt.findOne({ _id: attemptId, schoolId: school._id }),
      Exam.findOne({ _id: examId, schoolId: school._id }),
    ]);

    if (!attempt || !exam) {
      return NextResponse.json({ success: false, error: "Attempt or Exam not found." }, { status: 404 });
    }

    if (action === "extend_time") {
      const minutes = Number(extraMinutes) || 5;
      const currentDeadline = new Date(attempt.serverDeadline).getTime();
      const newDeadline = new Date(currentDeadline + minutes * 60 * 1000);
      attempt.serverDeadline = newDeadline.toISOString();

      if (attempt.status === "timed_out") {
        attempt.status = "in_progress";
      }

      await attempt.save();

      return NextResponse.json({
        success: true,
        message: `Extended candidate examination time by +${minutes} minutes.`,
        serverDeadline: attempt.serverDeadline,
      });
    }

    if (action === "reset_violations") {
      attempt.violationCount = 0;
      if (attempt.status === "flagged") {
        attempt.status = "in_progress";
      }
      await attempt.save();

      return NextResponse.json({
        success: true,
        message: "Candidate violation warnings reset to 0.",
      });
    }

    if (action === "force_submit") {
      const evalResult = evaluateAttempt(exam, attempt.responses);
      attempt.scores = evalResult.scores;
      attempt.questionEvaluations = evalResult.questionEvaluations;
      attempt.status = "auto_submitted";
      attempt.submittedAt = new Date().toISOString();
      await attempt.save();

      return NextResponse.json({
        success: true,
        message: "Candidate exam successfully force-submitted and auto-evaluated.",
      });
    }

    if (action === "toggle_flag") {
      attempt.status = attempt.status === "flagged" ? "in_progress" : "flagged";
      await attempt.save();

      return NextResponse.json({
        success: true,
        status: attempt.status,
        message: `Candidate status updated to '${attempt.status}'.`,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid invigilation action." }, { status: 400 });
  } catch (error: any) {
    const status = error.message?.includes("FORBIDDEN") || error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

