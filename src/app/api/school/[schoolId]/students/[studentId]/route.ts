import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Student from "@/models/Student";
import { requireSchoolAccess } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  try {
    const { schoolId, studentId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const student = await Student.findOne({ _id: studentId, schoolId: school._id });
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    const body = await req.json();
    const { name, rollNumber, admissionNumber, email, classGrade, stream, section, status, customFields } = body;

    if (name) student.name = name.trim();
    if (rollNumber) student.rollNumber = rollNumber.toUpperCase().trim();
    if (admissionNumber) student.admissionNumber = admissionNumber.toUpperCase().trim();
    if (email) student.email = email.toLowerCase().trim();
    if (classGrade) student.classGrade = classGrade.trim();
    if (stream) student.stream = stream.trim();
    if (section) student.section = section.toUpperCase().trim();
    if (status) student.status = status;
    if (customFields) student.customFields = customFields;

    await student.save();

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  try {
    const { schoolId, studentId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const result = await Student.deleteOne({ _id: studentId, schoolId: school._id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Student not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Student removed successfully." });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
