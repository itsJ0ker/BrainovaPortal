import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { requireSchoolAccess } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; examId: string }> }
) {
  try {
    const { schoolId, examId } = await params;
    const user = await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const exam = await Exam.findOne({
      _id: examId,
      $or: [{ schoolId: school._id }, { participatingSchoolIds: school._id }],
    });
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const body = await req.json();
    const { attemptId, evaluations } = body;
    // evaluations: Array of { questionId, marksAwarded, feedback }

    if (!attemptId || !Array.isArray(evaluations)) {
      return NextResponse.json(
        { success: false, error: "attemptId and evaluations array are required." },
        { status: 400 }
      );
    }

    const attempt = await ExamAttempt.findOne({ _id: attemptId, examId: exam._id });
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt record not found." }, { status: 404 });
    }

    // Merge manual evaluations with existing question evaluations
    const evalMap = new Map<string, any>(attempt.questionEvaluations.map((e: any) => [e.questionId, e]));

    for (const update of evaluations) {
      const q = exam.questions.find((quest: any) => quest.id === update.questionId);
      const maxMarks = q ? q.points : 10;
      const marksAwarded = Math.min(maxMarks, Math.max(0, Number(update.marksAwarded) || 0));

      evalMap.set(update.questionId, {
        questionId: update.questionId,
        marksAwarded,
        maxMarks,
        isAutoGraded: false,
        feedback: update.feedback || "",
        gradedBy: user.name,
      });
    }

    const mergedEvaluations = Array.from(evalMap.values());

    // Recalculate scores
    let mcqTotal = 0;
    let writtenTotal = 0;
    let maxTotal = 0;
    let hasPending = false;

    for (const q of exam.questions) {
      maxTotal += q.points;
      const ev: any = evalMap.get(q.id);
      if (!ev) {
        if (q.type === "written") hasPending = true;
        continue;
      }
      if (ev.isAutoGraded) {
        mcqTotal += ev.marksAwarded;
      } else {
        writtenTotal += ev.marksAwarded;
      }
    }

    const totalMarks = Number(Math.max(0, mcqTotal + writtenTotal).toFixed(2));
    const percentage = maxTotal > 0 ? Math.round((totalMarks / maxTotal) * 100) : 0;

    attempt.questionEvaluations = mergedEvaluations;
    attempt.scores = {
      totalMarks,
      maxMarks: maxTotal,
      percentage,
      mcqMarks: Number(mcqTotal.toFixed(2)),
      writtenMarks: Number(writtenTotal.toFixed(2)),
      isGradingComplete: !hasPending,
    };

    await attempt.save();

    await AuditLog.create({
      schoolId: school._id,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: "MANUAL_GRADING",
      resourceType: "ExamAttempt",
      resourceId: attempt._id.toString(),
      details: {
        studentName: attempt.studentSnapshot.name,
        newScore: totalMarks,
        isGradingComplete: attempt.scores.isGradingComplete,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Grades saved successfully.",
      scores: attempt.scores,
      evaluations: attempt.questionEvaluations,
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
