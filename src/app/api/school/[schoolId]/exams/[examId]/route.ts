import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { requireSchoolAccess } from "@/lib/auth";

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

    const exam = await Exam.findOne({
      _id: examId,
      $or: [{ schoolId: school._id }, { participatingSchoolIds: school._id }],
    }).lean();
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const [totalAttempts, submittedAttempts] = await Promise.all([
      ExamAttempt.countDocuments({ examId: exam._id }),
      ExamAttempt.countDocuments({ examId: exam._id, status: { $in: ["submitted", "auto_submitted"] } }),
    ]);

    return NextResponse.json({
      success: true,
      exam,
      metrics: {
        totalAttempts,
        submittedAttempts,
      },
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; examId: string }> }
) {
  try {
    const { schoolId, examId } = await params;
    const user = await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const exam = await Exam.findOne({
      _id: examId,
      $or: [{ schoolId: school._id }, { participatingSchoolIds: school._id }],
    });
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, subject, classGrade, targeting, questions, config, status, isResultsPublished } = body;

    if (title) exam.title = title.trim();
    if (description !== undefined) exam.description = description;
    if (subject) exam.subject = subject.trim();
    const effectiveClass = (classGrade !== undefined ? classGrade : exam.classGrade || "").trim();
    if (classGrade !== undefined) exam.classGrade = effectiveClass;
    if (targeting) {
      if (targeting.type === "assigned_class") {
        exam.targeting = {
          ...targeting,
          classes: effectiveClass ? [effectiveClass] : [],
        };
      } else if (targeting.type === "class_section" && (!targeting.classes || targeting.classes.length === 0)) {
        exam.targeting = {
          ...targeting,
          classes: effectiveClass ? [effectiveClass] : [],
        };
      } else {
        exam.targeting = targeting;
      }
    } else if (classGrade !== undefined && exam.targeting?.type === "assigned_class") {
      exam.targeting.classes = effectiveClass ? [effectiveClass] : [];
    }
    if (questions) exam.questions = questions;
    if (config) exam.config = { ...exam.config, ...config };
    if (status) exam.status = status;
    if (isResultsPublished !== undefined) exam.isResultsPublished = isResultsPublished;

    await exam.save();

    await AuditLog.create({
      schoolId: school._id,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: "UPDATE_EXAM",
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: { title: exam.title, status: exam.status },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; examId: string }> }
) {
  try {
    const { schoolId, examId } = await params;
    const user = await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const exam = await Exam.findOne({
      _id: examId,
      $or: [{ schoolId: school._id }, { participatingSchoolIds: school._id }],
    });
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    exam.status = "archived";
    await exam.save();

    await AuditLog.create({
      schoolId: school._id,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: "ARCHIVE_EXAM",
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: { title: exam.title },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Exam archived successfully." });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
