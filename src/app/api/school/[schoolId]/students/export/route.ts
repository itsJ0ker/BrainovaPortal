import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import Student from "@/models/Student";
import { requireSchoolAccess } from "@/lib/auth";
import { exportStudentsToBuffer } from "@/lib/excel";

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
    const classGrade = searchParams.get("classGrade") || "";

    const query: any = { schoolId: school._id };
    if (classGrade && classGrade !== "all") {
      query.classGrade = classGrade;
    }

    const students = await Student.find(query).sort({ classGrade: 1, section: 1, rollNumber: 1 }).lean();

    const buffer = exportStudentsToBuffer(students as any);

    const filename = `${school.slug}-students-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
