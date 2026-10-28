import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import AuditLog from "@/models/AuditLog";
import SchoolAdminInvite from "@/models/SchoolAdminInvite";
import { requireSuperAdmin } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { adminEmail: { $regex: search, $options: "i" } },
      ];
    }

    const schools = await School.find(query).sort({ createdAt: -1 }).lean();

    // Attach student and exam counts for each school
    const schoolsWithCounts = await Promise.all(
      schools.map(async (school: any) => {
        const [studentCount, examCount] = await Promise.all([
          Student.countDocuments({ schoolId: school._id }),
          Exam.countDocuments({ schoolId: school._id }),
        ]);
        return {
          ...school,
          studentCount,
          examCount,
        };
      })
    );

    return NextResponse.json({ success: true, schools: schoolsWithCounts });
  } catch (error: any) {
    const status = error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    await connectDB();

    const body = await req.json();
    const { name, code, adminEmail, contactPhone, address, defaultExamDuration } = body;

    if (!name || !code || !adminEmail) {
      return NextResponse.json(
        { success: false, error: "Name, Code, and Admin Email are required." },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check unique code and slug
    const existing = await School.findOne({
      $or: [{ code: code.toUpperCase() }, { slug }],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A school with this code or name already exists." },
        { status: 400 }
      );
    }

    const school = await School.create({
      name,
      slug,
      code: code.toUpperCase(),
      adminEmail: adminEmail.toLowerCase().trim(),
      contactEmail: adminEmail.toLowerCase().trim(),
      contactPhone,
      address,
      status: "active",
      onboardingStatus: "invited",
      settings: {
        defaultExamDuration: Number(defaultExamDuration) || 60,
        allowSelfRegistration: false,
        enableAntiCheatingByDefault: true,
        themeColor: "#4f46e5",
      },
    });

    // Create an invite token for the school administrator
    const token = crypto.randomBytes(32).toString("hex");
    const invite = await SchoolAdminInvite.create({
      schoolId: school._id,
      email: adminEmail.toLowerCase().trim(),
      token,
      status: "pending",
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });

    // Record audit log
    await AuditLog.create({
      actorId: admin.userId,
      actorName: admin.name,
      actorRole: admin.role,
      action: "CREATE_SCHOOL",
      resourceType: "School",
      resourceId: school._id.toString(),
      details: { name: school.name, code: school.code, adminEmail },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      school,
      inviteLink: `/onboarding/${invite.token}`,
    });
  } catch (error: any) {
    const status = error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
