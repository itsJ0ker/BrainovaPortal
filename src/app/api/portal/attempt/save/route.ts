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

    const { questionId, selectedOptions, writtenAnswer } = body;

    if (!questionId) {
      return NextResponse.json({ success: false, error: "questionId is required." }, { status: 400 });
    }

    const attempt = await ExamAttempt.findById(session.attemptId);
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt record not found." }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { success: false, error: "This exam attempt has already been submitted.", isFinalized: true },
        { status: 400 }
      );
    }

    // Check authoritative deadline
    const now = new Date();
    const deadline = new Date(attempt.serverDeadline);

    if (now > deadline) {
      // Auto-submit due to time elapsed
      const exam = await Exam.findById(attempt.examId);
      if (exam) {
        const evalResult = evaluateAttempt(exam, attempt.responses);
        attempt.scores = evalResult.scores;
        attempt.questionEvaluations = evalResult.questionEvaluations;
      }
      attempt.status = "timed_out";
      attempt.submittedAt = now.toISOString();
      await attempt.save();

      return NextResponse.json({
        success: false,
        error: "Exam time has expired. Your responses have been submitted automatically.",
        timedOut: true,
      });
    }

    const updatedResponse = {
      questionId,
      selectedOptions: selectedOptions || [],
      writtenAnswer: writtenAnswer !== undefined ? String(writtenAnswer) : "",
      answeredAt: now.toISOString(),
    };

    // Atomic update to prevent race conditions during rapid concurrent autosaves
    const updateExisting = await ExamAttempt.updateOne(
      {
        _id: attempt._id,
        status: "in_progress",
        "responses.questionId": questionId,
      },
      {
        $set: {
          "responses.$.selectedOptions": updatedResponse.selectedOptions,
          "responses.$.writtenAnswer": updatedResponse.writtenAnswer,
          "responses.$.answeredAt": updatedResponse.answeredAt,
        },
      }
    );

    if (updateExisting.matchedCount === 0) {
      await ExamAttempt.updateOne(
        {
          _id: attempt._id,
          status: "in_progress",
          "responses.questionId": { $ne: questionId },
        },
        {
          $push: { responses: updatedResponse },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Response saved.",
      savedAt: updatedResponse.answeredAt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
