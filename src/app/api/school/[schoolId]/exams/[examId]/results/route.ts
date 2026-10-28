import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { requireSchoolAccess } from "@/lib/auth";
import { exportExamResultsToBuffer } from "@/lib/excel";

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

    const attempts = await ExamAttempt.find({ examId: exam._id })
      .sort({ "scores.totalMarks": -1, submittedAt: 1 })
      .lean();

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "xlsx") {
      const buffer = exportExamResultsToBuffer(exam.title, attempts as any);
      const filename = `${exam.slug}-results.xlsx`;
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Compute aggregated exam statistics
    const submittedAttempts = attempts.filter((a: any) =>
      ["submitted", "auto_submitted"].includes(a.status)
    );

    let highestScore = 0;
    let lowestScore = submittedAttempts.length ? 100 : 0;
    let sumPercentage = 0;
    let passCount = 0;
    const passThreshold = 40; // 40%

    submittedAttempts.forEach((a: any) => {
      const p = a.scores.percentage || 0;
      if (p > highestScore) highestScore = p;
      if (p < lowestScore) lowestScore = p;
      sumPercentage += p;
      if (p >= passThreshold) passCount++;
    });

    const averagePercentage =
      submittedAttempts.length > 0 ? Math.round(sumPercentage / submittedAttempts.length) : 0;
    const passPercentage =
      submittedAttempts.length > 0
        ? Math.round((passCount / submittedAttempts.length) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        accessCode: exam.accessCode,
        subject: exam.subject,
        isResultsPublished: exam.isResultsPublished,
        questions: exam.questions,
      },
      stats: {
        totalEnrolledEligible: attempts.length,
        totalAttempts: attempts.length,
        submittedCount: submittedAttempts.length,
        averagePercentage,
        highestScore,
        lowestScore: submittedAttempts.length ? lowestScore : 0,
        passPercentage,
      },
      attempts,
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
