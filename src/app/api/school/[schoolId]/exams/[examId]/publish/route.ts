import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Exam from "@/models/Exam";
import AuditLog from "@/models/AuditLog";
import { requireSchoolAccess } from "@/lib/auth";

export async function POST(
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
    const { action, isResultsPublished } = body;

    let auditAction = "";

    if (action === "publish") {
      exam.status = "published";
      auditAction = "PUBLISH_EXAM";
    } else if (action === "unpublish") {
      exam.status = "draft";
      auditAction = "UNPUBLISH_EXAM";
    }

    if (isResultsPublished !== undefined) {
      exam.isResultsPublished = Boolean(isResultsPublished);
      auditAction = exam.isResultsPublished ? "PUBLISH_RESULTS" : "UNPUBLISH_RESULTS";
    }

    await exam.save();

    await AuditLog.create({
      schoolId: school._id,
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      action: auditAction || "UPDATE_EXAM_PUBLICATION",
      resourceType: "Exam",
      resourceId: exam._id.toString(),
      details: {
        title: exam.title,
        status: exam.status,
        isResultsPublished: exam.isResultsPublished,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Exam updated successfully.`,
      status: exam.status,
      isResultsPublished: exam.isResultsPublished,
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
