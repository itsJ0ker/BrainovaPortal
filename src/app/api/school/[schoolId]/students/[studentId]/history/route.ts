import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Student from "@/models/Student";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import { requireSchoolAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  try {
    const { schoolId, studentId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const student = await Student.findOne({ _id: studentId, schoolId: school._id }).lean();
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    const attempts = await ExamAttempt.find({
      $or: [
        { studentId: student._id },
        { "studentSnapshot.rollNumber": student.rollNumber, schoolId: school._id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const examIds = [...new Set(attempts.map((a: any) => a.examId.toString()))];
    const exams = await Exam.find({ _id: { $in: examIds } }).lean();
    const examMap = new Map(exams.map((e: any) => [e._id.toString(), e]));

    let totalMarksSum = 0;
    let maxMarksSum = 0;
    let totalScoreSum = 0;
    let gradedCount = 0;

    const history = attempts.map((attempt: any) => {
      const exam: any = examMap.get(attempt.examId.toString());
      const hasScores = attempt.scores && typeof attempt.scores.totalMarks === "number";

      if (hasScores && attempt.scores.maxMarks > 0) {
        totalMarksSum += attempt.scores.totalMarks;
        maxMarksSum += attempt.scores.maxMarks;
        totalScoreSum += attempt.scores.percentage || 0;
        gradedCount += 1;
      }

      return {
        attemptId: attempt._id,
        examId: exam?._id || attempt.examId,
        title: exam?.title || "Examination",
        subject: exam?.subject || "Subject",
        accessCode: exam?.accessCode || "",
        classGrade: exam?.classGrade || student.classGrade,
        isResultsPublished: exam?.isResultsPublished ?? false,
        durationMinutes: exam?.config?.durationMinutes || 0,
        totalQuestions: exam?.questions?.length || 0,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        scores: attempt.scores,
        violationCount: attempt.violationCount || 0,
        integrityLog: attempt.integrityLog || [],
        questionEvaluations: attempt.questionEvaluations || [],
      };
    });

    const averagePercentage = gradedCount > 0 ? Math.round((totalScoreSum / gradedCount) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      student,
      summary: {
        totalAttempts: attempts.length,
        gradedCount,
        totalMarksSum,
        maxMarksSum,
        averagePercentage,
      },
      history,
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

