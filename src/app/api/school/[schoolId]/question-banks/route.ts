import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import QuestionBank from "@/models/QuestionBank";
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
    const subject = searchParams.get("subject");

    const query: any = { schoolId: school._id };
    if (subject) query.subject = subject;

    const questionBanks = await QuestionBank.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ success: true, questionBanks });
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
    const { title, subject, classGrade, questions } = body;

    if (!title || !subject) {
      return NextResponse.json(
        { success: false, error: "Title and subject are required." },
        { status: 400 }
      );
    }

    const bank = await QuestionBank.create({
      schoolId: school._id,
      title: title.trim(),
      subject: subject.trim(),
      classGrade: classGrade || "",
      questions: questions || [],
    });

    return NextResponse.json({ success: true, questionBank: bank });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
