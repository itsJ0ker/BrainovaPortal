import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import Student from "@/models/Student";
import ExamAttempt from "@/models/ExamAttempt";
import School from "@/models/School";
import { signStudentSession } from "@/lib/session";
import { sanitizeQuestionsForStudent } from "@/lib/sanitizer";
import { isClassEligible } from "@/lib/class-matching";
import { formatInIST } from "@/lib/timezone";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit verification attempts (max 25 requests per minute per IP)
    const rl = checkRateLimit(req, { limit: 25, windowSeconds: 60, prefix: "portal_verify" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many verification requests. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.resetInSeconds) },
        }
      );
    }

    await connectDB();
    const body = await req.json();
    const { accessCode, rollNumber, admissionNumber, email, name } = body;

    if (!accessCode) {
      return NextResponse.json(
        { success: false, error: "Exam access code is required." },
        { status: 400 }
      );
    }

    const exam = await Exam.findOne({ accessCode: accessCode.toUpperCase().trim() });
    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Invalid examination access code." },
        { status: 404 }
      );
    }

    if (exam.status !== "published" && exam.status !== "ongoing") {
      return NextResponse.json(
        { success: false, error: "This exam is currently not active or published." },
        { status: 403 }
      );
    }

    const now = new Date();
    const examStart = new Date(exam.config.startTime);
    const examEnd = new Date(exam.config.endTime);

    if (now < examStart) {
      return NextResponse.json(
        {
          success: false,
          error: `This examination has not started yet. Testing window opens on ${formatInIST(examStart)} (Delhi time).`,
        },
        { status: 403 }
      );
    }

    if (now > examEnd) {
      return NextResponse.json(
        {
          success: false,
          error: `This examination has expired. Testing window closed on ${formatInIST(examEnd)} (Delhi time).`,
        },
        { status: 403 }
      );
    }

    // Identify student by provided identifiers
    const studentQuery: any = { schoolId: exam.schoolId };
    const orConditions: any[] = [];

    if (rollNumber) {
      orConditions.push({ rollNumber: rollNumber.toUpperCase().trim() });
    }
    if (admissionNumber) {
      orConditions.push({ admissionNumber: admissionNumber.toUpperCase().trim() });
    }
    if (email) {
      orConditions.push({ email: email.toLowerCase().trim() });
    }

    if (orConditions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter your Roll Number, Admission Number, or Email Address." },
        { status: 400 }
      );
    }

    studentQuery.$or = orConditions;

    const student = await Student.findOne(studentQuery);
    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching registered student record found for this institution. Please check your credentials.",
        },
        { status: 404 }
      );
    }

    if (student.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Your student record is marked inactive. Please contact school administration." },
        { status: 403 }
      );
    }

    // Optional name check if provided
    if (name && name.trim()) {
      const studentFirstName = student.name.toLowerCase().split(" ")[0];
      const providedFirstName = name.trim().toLowerCase().split(" ")[0];
      if (!student.name.toLowerCase().includes(providedFirstName) && !providedFirstName.includes(studentFirstName)) {
        return NextResponse.json(
          {
            success: false,
            error: `The provided name does not match the registered record for roll number ${student.rollNumber}.`,
          },
          { status: 400 }
        );
      }
    }

    // Check targeting eligibility
    const targeting = exam.targeting;
    const targetingType = targeting?.type || (exam.classGrade ? "assigned_class" : "all");

    if (targetingType !== "all") {
      let eligibleClasses: string[] = [];

      if (targetingType === "assigned_class") {
        if (exam.classGrade && exam.classGrade.trim()) {
          eligibleClasses = [exam.classGrade.trim()];
        }
      } else if (targetingType === "class_section") {
        if (targeting?.classes && targeting.classes.length > 0) {
          eligibleClasses = targeting.classes.map((c: string) => c.trim()).filter(Boolean);
        } else if (exam.classGrade && exam.classGrade.trim()) {
          eligibleClasses = [exam.classGrade.trim()];
        }
      }

      // Verify student belongs to an eligible class
      if (eligibleClasses.length > 0) {
        const isEligible = isClassEligible(student.classGrade, eligibleClasses);
        if (!isEligible) {
          return NextResponse.json(
            {
              success: false,
              error: `This examination is restricted to ${eligibleClasses.join(", ")}. Your registered class is ${student.classGrade}.`,
            },
            { status: 403 }
          );
        }
      }

      // Verify section eligibility if restricted
      if (targeting?.sections && targeting.sections.length > 0) {
        const studentSection = (student.section || "").trim().toUpperCase();
        const isSectionEligible = targeting.sections.some(
          (sec: string) => sec.trim().toUpperCase() === studentSection
        );
        if (!isSectionEligible) {
          return NextResponse.json(
            {
              success: false,
              error: `This examination is designated for sections ${targeting.sections.join(", ")}. Your registered section is ${student.section || "N/A"}.`,
            },
            { status: 403 }
          );
        }
      }

      // Verify custom student list eligibility
      if (targetingType === "custom_list") {
        const isEligible = targeting.studentIds?.some(
          (id: any) => id.toString() === student._id.toString()
        );
        if (!isEligible) {
          return NextResponse.json(
            {
              success: false,
              error: "You are not included in the candidate list for this examination.",
            },
            { status: 403 }
          );
        }
      }
    }

    // Check existing attempts
    const existingAttempts = await ExamAttempt.find({
      examId: exam._id,
      studentId: student._id,
    }).sort({ createdAt: -1 });

    const activeAttempt = existingAttempts.find((a: any) => a.status === "in_progress");

    if (activeAttempt) {
      const deadline = new Date(activeAttempt.serverDeadline);
      if (now < deadline) {
        // Resume in-progress attempt seamlessly
        const sessionToken = signStudentSession({
          attemptId: activeAttempt._id.toString(),
          examId: exam._id.toString(),
          studentId: student._id.toString(),
          schoolId: exam.schoolId.toString(),
          serverDeadline: activeAttempt.serverDeadline,
        });

        const sanitized = sanitizeQuestionsForStudent(exam.questions, {
          shuffleQuestions: exam.config.shuffleQuestions,
          shuffleOptions: exam.config.shuffleOptions,
          seed: activeAttempt._id.toString(),
          orderedQuestionIds: activeAttempt.shuffledQuestionOrder,
        });

        return NextResponse.json({
          success: true,
          isResuming: true,
          sessionToken,
          attempt: {
            id: activeAttempt._id,
            serverDeadline: activeAttempt.serverDeadline,
            responses: activeAttempt.responses,
            violationCount: activeAttempt.violationCount,
          },
          exam: {
            id: exam._id,
            title: exam.title,
            subject: exam.subject,
            durationMinutes: exam.config.durationMinutes,
            antiCheating: exam.config.antiCheating,
            questions: sanitized,
          },
          student: {
            name: student.name,
            rollNumber: student.rollNumber,
            admissionNumber: student.admissionNumber,
            classGrade: student.classGrade,
            section: student.section,
          },
        });
      } else {
        // Timed out attempt: mark as timed_out
        activeAttempt.status = "timed_out";
        await activeAttempt.save();
      }
    }

    // Check attempt limits
    const submittedCount = existingAttempts.filter((a: any) =>
      ["submitted", "auto_submitted", "timed_out"].includes(a.status)
    ).length;

    if (submittedCount >= (exam.config.attemptLimit || 1)) {
      return NextResponse.json(
        {
          success: false,
          error: `You have reached the maximum attempt limit (${exam.config.attemptLimit || 1}) for this exam.`,
          alreadySubmitted: true,
          isResultsPublished: exam.isResultsPublished,
        },
        { status: 403 }
      );
    }

    // Create new attempt!
    const durationMs = exam.config.durationMinutes * 60 * 1000;
    const deadlineByDuration = new Date(now.getTime() + durationMs);
    // Crucial: Server deadline cannot exceed exam overall end time!
    const authoritativeDeadline =
      deadlineByDuration < examEnd ? deadlineByDuration : examEnd;

    // Determine question order
    const sanitizedQuestions = sanitizeQuestionsForStudent(exam.questions, {
      shuffleQuestions: exam.config.shuffleQuestions,
      shuffleOptions: exam.config.shuffleOptions,
      seed: `${student._id.toString()}-${now.getTime()}`,
    });

    const shuffledOrder = sanitizedQuestions.map((q) => q.id);

    const newAttempt = await ExamAttempt.create({
      schoolId: exam.schoolId,
      examId: exam._id,
      studentId: student._id,
      studentSnapshot: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        email: student.email,
        classGrade: student.classGrade,
        section: student.section,
      },
      startedAt: now.toISOString(),
      serverDeadline: authoritativeDeadline.toISOString(),
      status: "in_progress",
      responses: [],
      scores: {
        totalMarks: 0,
        maxMarks: exam.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
        percentage: 0,
        mcqMarks: 0,
        writtenMarks: 0,
        isGradingComplete: false,
      },
      questionEvaluations: [],
      integrityLog: [],
      violationCount: 0,
      shuffledQuestionOrder: shuffledOrder,
    });

    const sessionToken = signStudentSession({
      attemptId: newAttempt._id.toString(),
      examId: exam._id.toString(),
      studentId: student._id.toString(),
      schoolId: exam.schoolId.toString(),
      serverDeadline: newAttempt.serverDeadline,
    });

    return NextResponse.json({
      success: true,
      isResuming: false,
      sessionToken,
      attempt: {
        id: newAttempt._id,
        serverDeadline: newAttempt.serverDeadline,
        responses: [],
        violationCount: 0,
      },
      exam: {
        id: exam._id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.config.durationMinutes,
        antiCheating: exam.config.antiCheating,
        questions: sanitizedQuestions,
      },
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        classGrade: student.classGrade,
        section: student.section,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
