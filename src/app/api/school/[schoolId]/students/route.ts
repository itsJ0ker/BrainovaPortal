import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Student from "@/models/Student";
import { requireSchoolAccess } from "@/lib/auth";

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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const classGrade = searchParams.get("classGrade") || "";
    const section = searchParams.get("section") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: any = { schoolId: school._id };

    if (classGrade && classGrade !== "all") {
      query.classGrade = classGrade;
    }
    if (section && section !== "all") {
      query.section = section;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
        { admissionNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query).sort({ classGrade: 1, section: 1, rollNumber: 1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const body = await req.json();
    const { name, rollNumber, admissionNumber, email, classGrade, stream, section, customFields } = body;

    if (!name || !rollNumber || !admissionNumber || !email || !classGrade || !section) {
      return NextResponse.json(
        { success: false, error: "Name, Roll Number, Admission Number, Email, Class, and Section are required." },
        { status: 400 }
      );
    }

    // Check unique constraints within this school
    const existing = await Student.findOne({
      schoolId: school._id,
      $or: [
        { rollNumber: rollNumber.toUpperCase().trim() },
        { admissionNumber: admissionNumber.toUpperCase().trim() },
      ],
    });

    if (existing) {
      const match =
        existing.rollNumber === rollNumber.toUpperCase().trim() ? "Roll Number" : "Admission Number";
      return NextResponse.json(
        { success: false, error: `A student with this ${match} already exists in this school.` },
        { status: 400 }
      );
    }

    const student = await Student.create({
      schoolId: school._id,
      name: name.trim(),
      rollNumber: rollNumber.toUpperCase().trim(),
      admissionNumber: admissionNumber.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      classGrade: classGrade.trim(),
      stream: stream ? stream.trim() : "General",
      section: section.toUpperCase().trim(),
      status: "active",
      customFields: customFields || {},
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
