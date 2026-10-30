import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import School from "@/models/School";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { requireSuperAdmin } from "@/lib/auth";

function generateAccessCode(subject: string): string {
  const prefix = (subject.replace(/[^a-zA-Z]/g, "").slice(0, 3) || "OLY").toUpperCase();
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const schoolId = searchParams.get("schoolId") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (schoolId && schoolId !== "all") {
      query.$or = [{ schoolId }, { participatingSchoolIds: schoolId }];
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const matchingSchools = await School.find({ name: searchRegex }).select("_id").lean();
      const matchingSchoolIds = matchingSchools.map((s: any) => s._id);

      const searchOr: any[] = [
        { title: searchRegex },
        { accessCode: searchRegex },
        { subject: searchRegex },
        { classGrade: searchRegex },
      ];

      if (matchingSchoolIds.length > 0) {
        searchOr.push(
          { schoolId: { $in: matchingSchoolIds } },
          { participatingSchoolIds: { $in: matchingSchoolIds } }
        );
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const exams = await Exam.find(query)
      .populate("schoolId", "name slug code logo")
      .populate("participatingSchoolIds", "name slug code logo")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    // Attach attempt stats to each exam
    const examsWithStats = await Promise.all(
      exams.map(async (exam: any) => {
        const [totalAttempts, submittedAttempts, inProgressAttempts, flaggedAttempts, scoreAgg] =
          await Promise.all([
            ExamAttempt.countDocuments({ examId: exam._id }),
            ExamAttempt.countDocuments({
              examId: exam._id,
              status: { $in: ["submitted", "auto_submitted"] },
            }),
            ExamAttempt.countDocuments({ examId: exam._id, status: "in_progress" }),
            ExamAttempt.countDocuments({
              examId: exam._id,
              $or: [{ status: "flagged" }, { violationCount: { $gt: 0 } }],
            }),
            ExamAttempt.aggregate([
              { $match: { examId: exam._id, status: { $in: ["submitted", "auto_submitted"] } } },
              { $group: { _id: null, avgScore: { $avg: "$scores.percentage" } } },
            ]),
          ]);

        const avgScore = scoreAgg[0]?.avgScore ? Math.round(scoreAgg[0].avgScore) : 0;

        const startTime = new Date(exam.config?.startTime);
        const endTime = new Date(exam.config?.endTime);
        const isCurrentlyOngoing =
          exam.status === "published" && now >= startTime && now <= endTime;

        return {
          ...exam,
          stats: {
            totalAttempts,
            submittedAttempts,
            inProgressAttempts,
            flaggedAttempts,
            avgScore,
            isCurrentlyOngoing,
          },
        };
      })
    );

    // Compute top-level summary metrics
    const totalExams = await Exam.countDocuments({});
    const publishedCount = await Exam.countDocuments({ status: "published" });
    const draftCount = await Exam.countDocuments({ status: "draft" });
    const totalPlatformAttempts = await ExamAttempt.countDocuments({});

    const ongoingCount = examsWithStats.filter((e) => e.stats.isCurrentlyOngoing).length;

    return NextResponse.json({
      success: true,
      exams: examsWithStats,
      metrics: {
        totalExams,
        publishedCount,
        draftCount,
        ongoingCount,
        totalPlatformAttempts,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    await connectDB();

    const body = await req.json();
    const {
      title,
      subject,
      classGrade,
      description,
      customAccessCode,
      participatingSchoolIds,
      isPlatformExam,
      durationMinutes,
      startTime,
      endTime,
      questions,
      config,
      antiCheating,
      status,
      resultReleaseMode,
    } = body;

    if (!title || !title.trim() || !subject || !subject.trim()) {
      return NextResponse.json(
        { success: false, error: "Exam Title and Subject are mandatory." },
        { status: 400 }
      );
    }

    // Determine participating schools
    let targetSchoolIds = Array.isArray(participatingSchoolIds) ? participatingSchoolIds : [];
    let isPlatformWide = Boolean(isPlatformExam);

    if (isPlatformWide || targetSchoolIds.length === 0 || targetSchoolIds.includes("all")) {
      const allActiveSchools = await School.find({ status: "active" }).select("_id").lean();
      targetSchoolIds = allActiveSchools.map((s: any) => s._id.toString());
      isPlatformWide = true;
    }

    if (targetSchoolIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one registered partner school." },
        { status: 400 }
      );
    }

    // Generate or validate Access Code
    let accessCode = (customAccessCode || "").toUpperCase().trim();
    if (accessCode) {
      const existing = await Exam.findOne({ accessCode });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Access code '${accessCode}' is already taken by another examination.` },
          { status: 400 }
        );
      }
    } else {
      accessCode = generateAccessCode(subject);
      let existing = await Exam.findOne({ accessCode });
      while (existing) {
        accessCode = generateAccessCode(subject);
        existing = await Exam.findOne({ accessCode });
      }
    }

    const slug = `${title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")}-${accessCode.toLowerCase()}`;

    const now = new Date();
    const parsedStart = startTime ? new Date(startTime) : now;
    const parsedEnd = endTime
      ? new Date(endTime)
      : new Date(parsedStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const fullConfig = {
      durationMinutes: Number(durationMinutes) || 60,
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
      attemptLimit: 1,
      shuffleQuestions: config?.shuffleQuestions ?? true,
      shuffleOptions: config?.shuffleOptions ?? true,
      verificationMode: config?.verificationMode || "roll_or_admission",
      resultReleaseMode: resultReleaseMode || "manual",
      antiCheating: {
        enabled: antiCheating?.enabled ?? true,
        maxViolations: antiCheating?.maxViolations || 3,
        actionOnThreshold: antiCheating?.actionOnThreshold || "auto_submit",
        blockCopyPaste: antiCheating?.blockCopyPaste ?? true,
        enforceFullscreen: antiCheating?.enforceFullscreen ?? false,
        detectTabSwitch: antiCheating?.detectTabSwitch ?? true,
        preventContextMenu: antiCheating?.preventContextMenu ?? true,
      },
    };

    const finalQuestions = Array.isArray(questions) && questions.length > 0 ? questions : [];

    const exam = await Exam.create({
      schoolId: targetSchoolIds[0], // Primary host school reference for legacy compatibility
      isPlatformExam: isPlatformWide,
      participatingSchoolIds: targetSchoolIds,
      createdByRole: "super_admin",
      title: title.trim(),
      slug,
      accessCode,
      description: description?.trim() || "",
      subject: subject.trim(),
      classGrade: classGrade?.trim() || "All Classes",
      targeting: {
        type: classGrade && classGrade !== "All Classes" ? "assigned_class" : "all",
        classes: classGrade && classGrade !== "All Classes" ? [classGrade.trim()] : [],
        streams: [],
        sections: [],
      },
      questions: finalQuestions,
      config: fullConfig,
      status: status === "published" ? "published" : "draft",
      isResultsPublished: false,
    });

    // Write audit log
    await AuditLog.create({
      schoolId: targetSchoolIds[0],
      actorId: admin.userId,
      actorName: admin.name,
      actorRole: "super_admin",
      action: "SUPER_ADMIN_CREATE_EXAM",
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: {
        title: exam.title,
        accessCode: exam.accessCode,
        isPlatformExam: isPlatformWide,
        participatingCount: targetSchoolIds.length,
        status: exam.status,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Examination '${exam.title}' successfully created for ${targetSchoolIds.length} institution(s).`,
      exam,
    });
  } catch (error: any) {
    const status = error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

