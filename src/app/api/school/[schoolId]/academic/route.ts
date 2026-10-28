import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import { AcademicYear, ClassGrade, Subject } from "@/models/Academic";
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

    const [academicYears, classes, subjects] = await Promise.all([
      AcademicYear.find({ schoolId: school._id }).sort({ name: -1 }).lean(),
      ClassGrade.find({ schoolId: school._id }).sort({ order: 1, name: 1 }).lean(),
      Subject.find({ schoolId: school._id }).sort({ name: 1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      academicYears,
      classes,
      subjects,
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
    const { type, data } = body;

    if (type === "class") {
      const { name, streams, sections, order } = data;
      if (!name) {
        return NextResponse.json({ success: false, error: "Class name is required." }, { status: 400 });
      }

      const classDoc = await ClassGrade.findOneAndUpdate(
        { schoolId: school._id, name },
        {
          schoolId: school._id,
          name,
          streams: streams && streams.length ? streams : ["General"],
          sections: sections && sections.length ? sections : ["A"],
          order: order || 1,
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({ success: true, item: classDoc });
    } else if (type === "subject") {
      const { name, code, department } = data;
      if (!name || !code) {
        return NextResponse.json({ success: false, error: "Name and code are required." }, { status: 400 });
      }

      const subjectDoc = await Subject.findOneAndUpdate(
        { schoolId: school._id, code: code.toUpperCase() },
        {
          schoolId: school._id,
          name,
          code: code.toUpperCase(),
          department,
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({ success: true, item: subjectDoc });
    } else if (type === "year") {
      const { name, isCurrent, startDate, endDate } = data;
      if (!name) {
        return NextResponse.json({ success: false, error: "Academic year name is required." }, { status: 400 });
      }

      if (isCurrent) {
        await AcademicYear.updateMany({ schoolId: school._id }, { isCurrent: false });
      }

      const yearDoc = await AcademicYear.create({
        schoolId: school._id,
        name,
        isCurrent: Boolean(isCurrent),
        startDate,
        endDate,
      });

      return NextResponse.json({ success: true, item: yearDoc });
    }

    return NextResponse.json({ success: false, error: "Invalid academic entity type." }, { status: 400 });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
