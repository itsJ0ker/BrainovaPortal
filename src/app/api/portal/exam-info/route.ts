import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Exam from "@/models/Exam";
import School from "@/models/School";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || searchParams.get("accessCode");
    const id = searchParams.get("id");

    if (!code && !id) {
      return NextResponse.json(
        { success: false, error: "Access code or Exam ID is required." },
        { status: 400 }
      );
    }

    const query: any = {};
    if (code) {
      query.accessCode = code.toUpperCase().trim();
    } else if (id) {
      query._id = id;
    }

    const exam = await Exam.findOne(query).lean();
    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found. Please verify the examination code." },
        { status: 404 }
      );
    }

    const school = await School.findById(exam.schoolId).lean();

    const totalMarks = exam.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);

    let targetDescription = "All Classes";
    if (exam.targeting?.type === "assigned_class") {
      targetDescription = exam.classGrade || "Selected Grade";
    } else if (exam.targeting?.type === "class_section") {
      targetDescription =
        exam.targeting.classes && exam.targeting.classes.length > 0
          ? exam.targeting.classes.join(", ")
          : exam.classGrade || "Designated Classes";
    } else if (exam.targeting?.type === "all") {
      targetDescription = "All Registered Students";
    } else if (exam.classGrade) {
      targetDescription = exam.classGrade;
    }

    return NextResponse.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        accessCode: exam.accessCode,
        classGrade: exam.classGrade,
        targeting: exam.targeting,
        targetDescription,
        durationMinutes: exam.config.durationMinutes,
        totalQuestions: exam.questions.length,
        totalMarks,
        startTime: exam.config.startTime,
        endTime: exam.config.endTime,
        verificationMode: exam.config.verificationMode,
        antiCheating: exam.config.antiCheating,
        status: exam.status,
        school: {
          id: school?._id,
          name: school?.name || "School Assessment Portal",
          logo: school?.logo,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
