import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { requireSchoolAccess } from "@/lib/auth";
import crypto from "crypto";

function generateAccessCode(subject: string): string {
  const prefix = (subject.replace(/[^a-zA-Z]/g, "").slice(0, 3) || "EXM").toUpperCase();
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const exams = await Exam.find({
      $or: [{ schoolId: school._id }, { participatingSchoolIds: school._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    // Attach attempt metrics to each exam
    const examsWithStats = await Promise.all(
      exams.map(async (exam: any) => {
        const [totalAttempts, submittedAttempts, pendingGrading] = await Promise.all([
          ExamAttempt.countDocuments({ examId: exam._id }),
          ExamAttempt.countDocuments({ examId: exam._id, status: { $in: ["submitted", "auto_submitted"] } }),
          ExamAttempt.countDocuments({
            examId: exam._id,
            status: { $in: ["submitted", "auto_submitted"] },
            "scores.isGradingComplete": false,
          }),
        ]);

        return {
          ...exam,
          stats: {
            totalAttempts,
            submittedAttempts,
            pendingGrading,
          },
        };
      })
    );

    return NextResponse.json({ success: true, exams: examsWithStats });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const user = await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      subject,
      classGrade,
      description,
      targeting,
      questions,
      config,
      status,
    } = body;

    if (!title || !subject) {
      return NextResponse.json(
        { success: false, error: "Exam title and subject are required." },
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Generate unique access code
    let accessCode = generateAccessCode(subject);
    let codeExists = await Exam.findOne({ accessCode });
    while (codeExists) {
      accessCode = generateAccessCode(subject);
      codeExists = await Exam.findOne({ accessCode });
    }

    const now = new Date();
    const defaultConfig = {
      durationMinutes: 45,
      startTime: now.toISOString(),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      attemptLimit: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      verificationMode: "roll_or_admission",
      resultReleaseMode: "manual",
      antiCheating: {
        enabled: true,
        maxViolations: 3,
        actionOnThreshold: "auto_submit",
        blockCopyPaste: true,
        enforceFullscreen: false,
        detectTabSwitch: true,
        preventContextMenu: true,
      },
      ...config,
    };

    const effectiveClass = (classGrade || "").trim();
    let finalTargeting = targeting;
    if (!finalTargeting) {
      if (effectiveClass) {
        finalTargeting = {
          type: "assigned_class",
          classes: [effectiveClass],
          streams: [],
          sections: [],
        };
      } else {
        finalTargeting = { type: "all", classes: [], streams: [], sections: [] };
      }
    } else if (finalTargeting.type === "assigned_class") {
      finalTargeting.classes = effectiveClass ? [effectiveClass] : [];
    } else if (finalTargeting.type === "class_section" && (!finalTargeting.classes || finalTargeting.classes.length === 0)) {
      if (effectiveClass) finalTargeting.classes = [effectiveClass];
    }

    const exam = await Exam.create({
      schoolId: school._id,
      title: title.trim(),
      slug: `${slug}-${crypto.randomBytes(3).toString("hex")}`,
      accessCode,
      description: description || "",
      subject: subject.trim(),
      classGrade: effectiveClass,
      targeting: finalTargeting,
      questions: questions || [],
      config: defaultConfig,
      status: status || "draft",
      isResultsPublished: false,
    });

    await AuditLog.create({
      schoolId: school._id,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: "CREATE_EXAM",
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: { title: exam.title, accessCode: exam.accessCode },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
