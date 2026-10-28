import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import { verifyStudentSession } from "@/lib/session";
import { evaluateAttempt } from "@/lib/grading";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || body.sessionToken;

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing session token." }, { status: 401 });
    }

    const session = verifyStudentSession(token);
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid or expired session token." }, { status: 401 });
    }

    const [attempt, exam] = await Promise.all([
      ExamAttempt.findById(session.attemptId),
      Exam.findById(session.examId),
    ]);

    if (!attempt || !exam) {
      return NextResponse.json({ success: false, error: "Attempt or Exam not found." }, { status: 404 });
    }

    if (["submitted", "auto_submitted"].includes(attempt.status)) {
      return NextResponse.json({
        success: true,
        message: "Attempt already submitted.",
        attemptId: attempt._id,
        scores: exam.config.resultReleaseMode === "immediate" || exam.isResultsPublished ? attempt.scores : null,
      });
    }

    const now = new Date();

    // Auto-grade attempt
    const evalResult = evaluateAttempt(exam, attempt.responses);
    attempt.scores = evalResult.scores;
    attempt.questionEvaluations = evalResult.questionEvaluations;
    attempt.status = "submitted";
    attempt.submittedAt = now.toISOString();

    await attempt.save();

    const isInstantRelease = exam.config.resultReleaseMode === "immediate" || exam.isResultsPublished;

    return NextResponse.json({
      success: true,
      message: "Examination submitted successfully.",
      attemptId: attempt._id,
      submittedAt: attempt.submittedAt,
      scores: isInstantRelease ? attempt.scores : null,
      isInstantRelease,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
