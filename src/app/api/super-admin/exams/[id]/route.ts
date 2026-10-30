import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import School from "@/models/School";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    await connectDB();

    const { id } = await params;
    const exam = await Exam.findById(id)
      .populate("schoolId", "name slug code logo")
      .populate("participatingSchoolIds", "name slug code logo")
      .lean();

    if (!exam) {
      return NextResponse.json({ success: false, error: "Examination not found." }, { status: 404 });
    }

    const [totalAttempts, submittedAttempts, attempts] = await Promise.all([
      ExamAttempt.countDocuments({ examId: exam._id }),
      ExamAttempt.countDocuments({ examId: exam._id, status: { $in: ["submitted", "auto_submitted"] } }),
      ExamAttempt.find({ examId: exam._id })
        .select("studentSnapshot status scores startedAt submittedAt violationCount")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      exam,
      metrics: {
        totalAttempts,
        submittedAttempts,
      },
      recentAttempts: attempts,
    });
  } catch (error: any) {
    const status = error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    await connectDB();

    const { id } = await params;
    const exam = await Exam.findById(id);

    if (!exam) {
      return NextResponse.json({ success: false, error: "Examination not found." }, { status: 404 });
    }

    const body = await req.json();
    const { status, isResultsPublished, title, description, classGrade, participatingSchoolIds, config } = body;

    let auditAction = "SUPER_ADMIN_UPDATE_EXAM";

    if (status !== undefined) {
      exam.status = status;
      auditAction = `SUPER_ADMIN_EXAM_STATUS_${status.toUpperCase()}`;
    }

    if (isResultsPublished !== undefined) {
      exam.isResultsPublished = Boolean(isResultsPublished);
      auditAction = exam.isResultsPublished
        ? "SUPER_ADMIN_PUBLISH_RESULTS"
        : "SUPER_ADMIN_UNPUBLISH_RESULTS";
    }

    if (title && title.trim()) exam.title = title.trim();
    if (description !== undefined) exam.description = description;
    if (classGrade !== undefined) exam.classGrade = classGrade;

    if (Array.isArray(participatingSchoolIds) && participatingSchoolIds.length > 0) {
      exam.participatingSchoolIds = participatingSchoolIds;
    }

    if (config) {
      exam.config = {
        ...exam.config,
        ...config,
        antiCheating: {
          ...exam.config?.antiCheating,
          ...config.antiCheating,
        },
      };
    }

    await exam.save();

    await AuditLog.create({
      schoolId: exam.schoolId,
      actorId: admin.userId,
      actorName: admin.name,
      actorRole: "super_admin",
      action: auditAction,
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: {
        title: exam.title,
        status: exam.status,
        isResultsPublished: exam.isResultsPublished,
        updates: body,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Exam '${exam.title}' updated successfully.`,
      exam,
    });
  } catch (error: any) {
    const status = error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    await connectDB();

    const { id } = await params;
    const exam = await Exam.findById(id);

    if (!exam) {
      return NextResponse.json({ success: false, error: "Examination not found." }, { status: 404 });
    }

    // Check if exam has existing attempts
    const attemptCount = await ExamAttempt.countDocuments({ examId: exam._id });
    if (attemptCount > 0) {
      // Archive instead of deleting if attempts exist
      exam.status = "archived";
      await exam.save();

      await AuditLog.create({
        schoolId: exam.schoolId,
        actorId: admin.userId,
        actorName: admin.name,
        actorRole: "super_admin",
        action: "SUPER_ADMIN_ARCHIVE_EXAM",
        resourceType: "Exam",
        resourceId: exam._id.toString(),
        details: { title: exam.title, attemptCount, reason: "Attempt records preserved via archiving" },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        message: `Exam has ${attemptCount} student attempts on record. Safely archived to preserve candidate history.`,
        isArchived: true,
      });
    }

    await Exam.deleteOne({ _id: exam._id });

    await AuditLog.create({
      schoolId: exam.schoolId,
      actorId: admin.userId,
      actorName: admin.name,
      actorRole: "super_admin",
      action: "SUPER_ADMIN_DELETE_EXAM",
      resourceType: "Exam",
      resourceId: id,
      details: { title: exam.title },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Examination '${exam.title}' deleted permanently.`,
    });
  } catch (error: any) {
    const status = error.message?.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

