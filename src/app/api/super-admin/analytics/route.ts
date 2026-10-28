import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    await connectDB();

    const [
      totalSchools,
      activeSchools,
      suspendedSchools,
      totalStudents,
      totalExams,
      publishedExams,
      totalAttempts,
      submittedAttempts,
    ] = await Promise.all([
      School.countDocuments({}),
      School.countDocuments({ status: "active" }),
      School.countDocuments({ status: "suspended" }),
      Student.countDocuments({}),
      Exam.countDocuments({}),
      Exam.countDocuments({ status: "published" }),
      ExamAttempt.countDocuments({}),
      ExamAttempt.countDocuments({ status: { $in: ["submitted", "auto_submitted"] } }),
    ]);

    // Calculate platform average score
    const scoreAgg = await ExamAttempt.aggregate([
      { $match: { status: { $in: ["submitted", "auto_submitted"] } } },
      { $group: { _id: null, avgScore: { $avg: "$scores.percentage" } } },
    ]);

    const averageScore = scoreAgg[0]?.avgScore ? Math.round(scoreAgg[0].avgScore) : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalSchools,
        activeSchools,
        suspendedSchools,
        totalStudents,
        totalExams,
        publishedExams,
        totalAttempts,
        submittedAttempts,
        averageScore,
        activeSessionsNow: Math.max(0, totalAttempts - submittedAttempts),
      },
    });
  } catch (error: any) {
    const status = error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
