import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import School from "@/models/School";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const rl = checkRateLimit(req, { limit: 60, windowSeconds: 60, prefix: "portal_cert" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many certificate requests. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.resetInSeconds) },
        }
      );
    }

    const { attemptId } = await params;
    await connectDB();

    const attempt = await ExamAttempt.findById(attemptId).lean();
    if (!attempt) {
      return NextResponse.json({ success: false, error: "Exam attempt not found." }, { status: 404 });
    }

    const [exam, school] = await Promise.all([
      Exam.findById(attempt.examId).lean(),
      School.findById(attempt.schoolId).lean(),
    ]);

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const isPublished = Boolean(
      exam.isResultsPublished ||
      exam.config?.resultReleaseMode === "immediate" ||
      (exam.config?.resultReleaseMode === "scheduled" &&
        exam.config?.resultReleaseDate &&
        new Date() >= new Date(exam.config.resultReleaseDate))
    );

    if (!isPublished) {
      return NextResponse.json(
        {
          success: false,
          error: "Certificates are only issued after official examination results have been published.",
          isPublished: false,
        },
        { status: 403 }
      );
    }

    const percentage = attempt.scores?.percentage ?? 0;

    let distinction = "Certificate of Participation";
    let badgeTier = "bronze";

    if (percentage >= 90) {
      distinction = "Certificate of Distinction (Gold Honor Roll)";
      badgeTier = "gold";
    } else if (percentage >= 75) {
      distinction = "Certificate of Excellence";
      badgeTier = "silver";
    } else if (percentage >= 60) {
      distinction = "Certificate of Merit";
      badgeTier = "bronze";
    } else if (percentage >= 40) {
      distinction = "Certificate of Achievement";
      badgeTier = "standard";
    }

    const shortId = attempt._id.toString().slice(-8).toUpperCase();
    const certificateId = `BO-2026-${exam.accessCode || "EXAM"}-${shortId}`;

    const verificationHash = crypto
      .createHash("sha256")
      .update(`${attempt._id}-${exam._id}-${attempt.studentSnapshot?.rollNumber}-${percentage}`)
      .digest("hex")
      .slice(0, 16)
      .toUpperCase();

    return NextResponse.json({
      success: true,
      certificate: {
        certificateId,
        verificationHash,
        attemptId: attempt._id,
        issuedAt: attempt.submittedAt || new Date().toISOString(),
        student: {
          name: attempt.studentSnapshot?.name,
          rollNumber: attempt.studentSnapshot?.rollNumber,
          admissionNumber: attempt.studentSnapshot?.admissionNumber,
          classGrade: attempt.studentSnapshot?.classGrade,
          section: attempt.studentSnapshot?.section,
        },
        school: {
          name: school?.name || "Academic Institution",
          code: school?.code || "",
          logo: school?.logo || "",
        },
        exam: {
          title: exam.title,
          subject: exam.subject,
          accessCode: exam.accessCode,
          totalQuestions: exam.questions?.length || 0,
        },
        scores: {
          totalMarks: attempt.scores?.totalMarks ?? 0,
          maxMarks: attempt.scores?.maxMarks ?? 0,
          percentage,
        },
        distinction,
        badgeTier,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

