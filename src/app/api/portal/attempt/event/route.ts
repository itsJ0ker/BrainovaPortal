import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import { verifyStudentSession } from "@/lib/session";
import { evaluateAttempt } from "@/lib/grading";
import { IntegrityEventType } from "@/types";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { sessionToken, type, details } = body;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || sessionToken;

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

    if (attempt.status !== "in_progress") {
      return NextResponse.json({ success: true, message: "Attempt already finalized." });
    }

    const now = new Date();
    const validTypes: IntegrityEventType[] = [
      "tab_switch",
      "fullscreen_exit",
      "focus_loss",
      "copy_paste_attempt",
      "devtools_attempt",
      "right_click",
    ];

    const eventType = validTypes.includes(type) ? type : "tab_switch";

    // Server-side duplicate suppression: check if last event was within 2000ms
    const lastEvent = attempt.integrityLog?.[attempt.integrityLog.length - 1];
    if (lastEvent) {
      const lastTime = new Date(lastEvent.timestamp).getTime();
      const diffMs = now.getTime() - lastTime;

      // Companion focus_loss right after tab_switch or exact duplicate within 2s
      if (
        diffMs < 2000 &&
        ((eventType === "focus_loss" && lastEvent.type === "tab_switch") ||
          eventType === lastEvent.type)
      ) {
        return NextResponse.json({
          success: true,
          violationCount: attempt.violationCount,
          maxViolations: exam.config.antiCheating?.maxViolations || 3,
          autoSubmitted: attempt.status === "auto_submitted",
          remainingWarnings: Math.max(
            0,
            (exam.config.antiCheating?.maxViolations || 3) - attempt.violationCount
          ),
          status: attempt.status,
          deduplicated: true,
        });
      }
    }

    // Append integrity event
    attempt.integrityLog.push({
      timestamp: now.toISOString(),
      type: eventType,
      details: details || `Recorded ${eventType} integrity trigger`,
    });

    attempt.violationCount = (attempt.violationCount || 0) + 1;

    const antiCheating = exam.config.antiCheating;
    const maxViolations = antiCheating?.maxViolations || 3;
    const action = antiCheating?.actionOnThreshold || "auto_submit";

    let autoSubmitted = false;

    if (antiCheating?.enabled && attempt.violationCount >= maxViolations) {
      if (action === "auto_submit") {
        // Auto-finalize exam submission
        const evalResult = evaluateAttempt(exam, attempt.responses);
        attempt.scores = evalResult.scores;
        attempt.questionEvaluations = evalResult.questionEvaluations;
        attempt.status = "auto_submitted";
        attempt.submittedAt = now.toISOString();
        autoSubmitted = true;
      } else if (action === "flag") {
        attempt.status = "flagged";
      }
    }

    await attempt.save();

    return NextResponse.json({
      success: true,
      violationCount: attempt.violationCount,
      maxViolations,
      autoSubmitted,
      remainingWarnings: Math.max(0, maxViolations - attempt.violationCount),
      status: attempt.status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
