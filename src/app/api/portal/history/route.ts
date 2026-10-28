import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Student from "@/models/Student";
import ExamAttempt from "@/models/ExamAttempt";
import Exam from "@/models/Exam";
import School from "@/models/School";
import { checkRateLimit } from "@/lib/rate-limit";

async function handleStudentHistory(params: {
  rollNumber?: string | null;
  admissionNumber?: string | null;
  email?: string | null;
  schoolCode?: string | null;
  schoolSlug?: string | null;
  accessCode?: string | null;
}) {
  await connectDB();

  const roll = params.rollNumber?.toUpperCase().trim();
  const admission = params.admissionNumber?.toUpperCase().trim();
  const email = params.email?.toLowerCase().trim();
  const schoolCode = params.schoolCode?.toUpperCase().trim();
  const schoolSlug = params.schoolSlug?.toLowerCase().trim();
  const accessCode = params.accessCode?.toUpperCase().trim();

  if (!roll && !admission && !email) {
    return NextResponse.json(
      { success: false, error: "Please provide a Roll Number, Admission Number, or Email Address." },
      { status: 400 }
    );
  }

  let schoolId: any = null;

  // Resolve schoolId if accessCode or schoolCode or slug is given
  if (accessCode) {
    const examMatch = await Exam.findOne({ accessCode }).lean();
    if (examMatch) {
      schoolId = examMatch.schoolId;
    }
  } else if (schoolCode) {
    const schoolMatch = await School.findOne({ code: schoolCode }).lean();
    if (schoolMatch) {
      schoolId = schoolMatch._id;
    }
  } else if (schoolSlug) {
    const schoolMatch = await School.findOne({ slug: schoolSlug }).lean();
    if (schoolMatch) {
      schoolId = schoolMatch._id;
    }
  }

  // Find student record
  const studentQuery: any = {};
  if (schoolId) {
    studentQuery.schoolId = schoolId;
  }

  const orConditions: any[] = [];
  if (roll) orConditions.push({ rollNumber: roll });
  if (admission) orConditions.push({ admissionNumber: admission });
  if (email) orConditions.push({ email: email });

  studentQuery.$or = orConditions;

  let student: any = await Student.findOne(studentQuery).lean();

  // If not found with school constraint, try finding by identifier across all schools
  if (!student && schoolId) {
    student = await Student.findOne({ $or: orConditions }).lean();
  }

  // Fallback: check ExamAttempt directly if student document was purged or modified
  let school: any = null;
  let attempts: any[] = [];

  if (student) {
    school = await School.findById(student.schoolId).lean();
    attempts = await ExamAttempt.find({
      $or: [
        { studentId: student._id },
        { "studentSnapshot.rollNumber": student.rollNumber, schoolId: student.schoolId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
  } else {
    // Attempt lookup by snapshot
    const snapshotQuery: any[] = [];
    if (roll) snapshotQuery.push({ "studentSnapshot.rollNumber": roll });
    if (admission) snapshotQuery.push({ "studentSnapshot.admissionNumber": admission });
    if (email) snapshotQuery.push({ "studentSnapshot.email": email });

    attempts = await ExamAttempt.find({ $or: snapshotQuery })
      .sort({ createdAt: -1 })
      .lean();

    if (attempts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No matching student record or examination history found. Please check your credentials.",
        },
        { status: 404 }
      );
    }

    const firstAttempt = attempts[0];
    school = await School.findById(firstAttempt.schoolId).lean();
    student = {
      _id: firstAttempt.studentId,
      name: firstAttempt.studentSnapshot.name,
      rollNumber: firstAttempt.studentSnapshot.rollNumber,
      admissionNumber: firstAttempt.studentSnapshot.admissionNumber,
      email: firstAttempt.studentSnapshot.email,
      classGrade: firstAttempt.studentSnapshot.classGrade,
      section: firstAttempt.studentSnapshot.section,
      schoolId: firstAttempt.schoolId,
    };
  }

  // Populate exams for each attempt
  const examIds = [...new Set(attempts.map((a) => a.examId.toString()))];
  const exams = await Exam.find({ _id: { $in: examIds } }).lean();
  const examMap = new Map(exams.map((e: any) => [e._id.toString(), e]));

  let publishedCount = 0;
  let totalScoreSum = 0;
  let highestPercentage = 0;
  let passedCount = 0;
  let failedCount = 0;

  const history = attempts.map((attempt) => {
    const exam: any = examMap.get(attempt.examId.toString());

    const isPublished = Boolean(
      exam &&
        (exam.isResultsPublished ||
          exam.config?.resultReleaseMode === "immediate" ||
          (exam.config?.resultReleaseMode === "scheduled" &&
            exam.config?.resultReleaseDate &&
            new Date() >= new Date(exam.config.resultReleaseDate)))
    );

    const hasScores = attempt.scores && typeof attempt.scores.totalMarks === "number";
    const percentage = hasScores ? attempt.scores.percentage ?? 0 : 0;

    if (isPublished && hasScores) {
      publishedCount += 1;
      totalScoreSum += percentage;
      if (percentage > highestPercentage) {
        highestPercentage = percentage;
      }
      if (percentage >= 40) {
        passedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return {
      attemptId: attempt._id,
      examId: exam?._id || attempt.examId,
      title: exam?.title || "Examination",
      subject: exam?.subject || "Subject",
      accessCode: exam?.accessCode || "",
      classGrade: exam?.classGrade || student.classGrade,
      durationMinutes: exam?.config?.durationMinutes || 0,
      totalQuestions: exam?.questions?.length || 0,
      maxMarks: attempt.scores?.maxMarks || exam?.questions?.reduce((s: number, q: any) => s + (q.points || 1), 0) || 0,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      isResultsPublished: isPublished,
      scores: isPublished && hasScores
        ? {
            totalMarks: attempt.scores.totalMarks,
            maxMarks: attempt.scores.maxMarks,
            percentage: attempt.scores.percentage,
            mcqMarks: attempt.scores.mcqMarks,
            writtenMarks: attempt.scores.writtenMarks,
            isGradingComplete: attempt.scores.isGradingComplete ?? false,
          }
        : null,
      violationCount: attempt.violationCount || 0,
    };
  });

  const averagePercentage =
    publishedCount > 0 ? Math.round((totalScoreSum / publishedCount) * 10) / 10 : 0;

  return NextResponse.json({
    success: true,
    student: {
      id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      admissionNumber: student.admissionNumber,
      email: student.email,
      classGrade: student.classGrade,
      section: student.section,
      stream: student.stream || "General",
      school: {
        id: school?._id,
        name: school?.name || "Institution",
        slug: school?.slug || "",
        code: school?.code || "",
        logo: school?.logo || "",
      },
    },
    summary: {
      totalAttempts: attempts.length,
      completedCount: attempts.filter((a) =>
        ["submitted", "auto_submitted", "timed_out"].includes(a.status)
      ).length,
      publishedCount,
      averagePercentage,
      highestPercentage: Math.round(highestPercentage * 10) / 10,
      passedCount,
      failedCount,
    },
    history,
  });
}

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { limit: 30, windowSeconds: 60, prefix: "portal_history" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many portfolio search requests. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
      );
    }

    const { searchParams } = new URL(req.url);
    return await handleStudentHistory({
      rollNumber: searchParams.get("roll") || searchParams.get("rollNumber"),
      admissionNumber: searchParams.get("admission") || searchParams.get("admissionNumber"),
      email: searchParams.get("email"),
      schoolCode: searchParams.get("schoolCode"),
      schoolSlug: searchParams.get("schoolSlug"),
      accessCode: searchParams.get("code") || searchParams.get("accessCode"),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { limit: 30, windowSeconds: 60, prefix: "portal_history" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many portfolio search requests. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    return await handleStudentHistory({
      rollNumber: body.rollNumber || body.roll,
      admissionNumber: body.admissionNumber || body.admission,
      email: body.email,
      schoolCode: body.schoolCode,
      schoolSlug: body.schoolSlug,
      accessCode: body.accessCode || body.code,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

