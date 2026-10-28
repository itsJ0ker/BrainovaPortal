import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Student from "@/models/Student";
import { requireSchoolAccess } from "@/lib/auth";
import { parseStudentsFromSpreadsheet, ParsedStudentRow } from "@/lib/excel";

export async function POST(
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

    let candidateRows: ParsedStudentRow[] = [];
    let parsingErrors: { row: number; error: string }[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided in form data." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parseRes = parseStudentsFromSpreadsheet(buffer);
      candidateRows = parseRes.valid;
      parsingErrors = parseRes.errors;
    } else {
      const body = await req.json();
      if (Array.isArray(body.students)) {
        candidateRows = body.students;
      } else {
        return NextResponse.json({ success: false, error: "Expected 'students' array or file upload." }, { status: 400 });
      }
    }

    if (candidateRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid student rows found in the provided file.",
        errors: parsingErrors,
      }, { status: 400 });
    }

    // Check collisions against existing records in this school
    const existingStudents = await Student.find(
      { schoolId: school._id },
      { rollNumber: 1, admissionNumber: 1 }
    ).lean();

    const existingRolls = new Set(existingStudents.map((s: any) => s.rollNumber.toUpperCase()));
    const existingAdmissions = new Set(existingStudents.map((s: any) => s.admissionNumber.toUpperCase()));

    const toInsert: any[] = [];
    const skipped: { row: number; reason: string }[] = [];

    const seenInBatchRoll = new Set<string>();
    const seenInBatchAdm = new Set<string>();

    candidateRows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const roll = r.rollNumber.toUpperCase().trim();
      const adm = r.admissionNumber.toUpperCase().trim();

      if (existingRolls.has(roll) || seenInBatchRoll.has(roll)) {
        skipped.push({ row: rowNum, reason: `Duplicate Roll Number: ${roll}` });
        return;
      }
      if (existingAdmissions.has(adm) || seenInBatchAdm.has(adm)) {
        skipped.push({ row: rowNum, reason: `Duplicate Admission Number: ${adm}` });
        return;
      }

      seenInBatchRoll.add(roll);
      seenInBatchAdm.add(adm);

      toInsert.push({
        schoolId: school._id,
        name: r.name.trim(),
        rollNumber: roll,
        admissionNumber: adm,
        email: r.email.toLowerCase().trim(),
        classGrade: r.classGrade,
        stream: r.stream || "General",
        section: r.section || "A",
        status: "active",
        customFields: r.customFields || {},
      });
    });

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const docs = await Student.insertMany(toInsert);
      insertedCount = docs.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} student(s).`,
      insertedCount,
      skippedCount: skipped.length,
      skipped,
      parsingErrors,
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
