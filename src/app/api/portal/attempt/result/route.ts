import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import School from "@/models/School";
import Student from "@/models/Student";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { limit: 60, windowSeconds: 60, prefix: "portal_result" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many scorecard requests. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.resetInSeconds) },
        }
      );
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const attemptId = searchParams.get("attemptId");
    const code = searchParams.get("code") || searchParams.get("accessCode");
    const roll = searchParams.get("roll") || searchParams.get("rollNumber");
    const admission = searchParams.get("admission") || searchParams.get("admissionNumber");
    const email = searchParams.get("email");

    let attempt: any = null;

    if (attemptId) {
      attempt = await ExamAttempt.findById(attemptId).lean();
    } else if (code && (roll || admission || email)) {
      const examMatch = await Exam.findOne({ accessCode: code.toUpperCase().trim() }).lean();
      if (examMatch) {
        const studentQuery: any = { schoolId: examMatch.schoolId };
        const orConditions: any[] = [];
        if (roll) orConditions.push({ rollNumber: roll.toUpperCase().trim() });
        if (admission) orConditions.push({ admissionNumber: admission.toUpperCase().trim() });
        if (email) orConditions.push({ email: email.toLowerCase().trim() });
        studentQuery.$or = orConditions;

        const studentMatch = await Student.findOne(studentQuery).lean();
        if (studentMatch) {
          attempt = await ExamAttempt.findOne({
            examId: examMatch._id,
            studentId: studentMatch._id,
          })
            .sort({ createdAt: -1 })
            .lean();
        }
      }
    }

    if (!attempt) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching examination attempt record found. Please verify the exam code and roll number.",
        },
        { status: 404 }
      );
    }

    const [exam, school] = await Promise.all([
      Exam.findById(attempt.examId).lean(),
      School.findById(attempt.schoolId).lean(),
    ]);

    if (!exam) {
      return NextResponse.json({ success: false, error: "Associated examination not found." }, { status: 404 });
    }

    const isPublished = Boolean(
      exam.isResultsPublished ||
      exam.config?.resultReleaseMode === "immediate" ||
      (exam.config?.resultReleaseMode === "scheduled" &&
        exam.config?.resultReleaseDate &&
        new Date() >= new Date(exam.config.resultReleaseDate))
    );

    const schoolInfo = {
      name: school?.name || "Institution",
      slug: school?.slug || "",
      code: school?.code || "",
      logo: school?.logo || "",
    };

    const examInfo = {
      id: exam._id,
      title: exam.title,
      subject: exam.subject,
      accessCode: exam.accessCode,
      classGrade: exam.classGrade,
      durationMinutes: exam.config?.durationMinutes || 0,
      totalQuestions: exam.questions?.length || 0,
      totalMarks: exam.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0,
    };

    if (!isPublished) {
      // For unpublished exams, return safe acknowledgment without exposing personal email or admission identifiers
      const safeSnapshot = {
        name: attempt.studentSnapshot?.name,
        rollNumber: attempt.studentSnapshot?.rollNumber,
        classGrade: attempt.studentSnapshot?.classGrade,
        section: attempt.studentSnapshot?.section,
      };

      return NextResponse.json({
        success: true,
        isPublished: false,
        message: "Results for this examination have not been officially published yet. Please check back later.",
        studentSnapshot: safeSnapshot,
        exam: examInfo,
        school: schoolInfo,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
      });
    }

    // Detailed question evaluation for published results
    const detailedQuestions = (exam.questions || []).map((q: any) => {
      const response = (attempt.responses || []).find((r: any) => r.questionId === q.id);
      const evaluation = (attempt.questionEvaluations || []).find((e: any) => e.questionId === q.id);

      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options || [],
        points: q.points || 1,
        negativePoints: q.negativePoints || 0,
        explanation: q.explanation || "",
        rubric: q.rubric || "",
        correctAnswer: q.correctAnswer, // Exposed only because results are published
        studentResponse: {
          selectedOptions: response?.selectedOptions || [],
          writtenAnswer: response?.writtenAnswer || "",
          answeredAt: response?.answeredAt,
        },
        evaluation: {
          marksAwarded: evaluation?.marksAwarded ?? 0,
          maxMarks: evaluation?.maxMarks ?? q.points ?? 1,
          isAutoGraded: evaluation?.isAutoGraded ?? true,
          feedback: evaluation?.feedback || "",
          gradedBy: evaluation?.gradedBy,
        },
      };
    });

    return NextResponse.json({
      success: true,
      isPublished: true,
      attemptId: attempt._id,
      studentSnapshot: attempt.studentSnapshot,
      school: schoolInfo,
      exam: examInfo,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      scores: attempt.scores,
      violationCount: attempt.violationCount,
      integrityLog: attempt.integrityLog || [],
      questions: detailedQuestions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
