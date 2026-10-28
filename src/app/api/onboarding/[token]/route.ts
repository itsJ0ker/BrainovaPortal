import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import SchoolAdminInvite from "@/models/SchoolAdminInvite";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await connectDB();

    const invite = await SchoolAdminInvite.findOne({ token }).populate("schoolId").lean();

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invalid invitation token." }, { status: 404 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, error: "This invitation link has expired." }, { status: 410 });
    }

    if (invite.status === "accepted") {
      return NextResponse.json({ success: false, error: "This invitation has already been accepted." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email,
        school: invite.schoolId,
        status: invite.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await connectDB();

    const invite = await SchoolAdminInvite.findOne({ token });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ success: false, error: "Invalid or already accepted invitation." }, { status: 400 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, error: "Invitation expired." }, { status: 410 });
    }

    const body = await req.json();
    const { password, adminName, contactPhone, address, defaultExamDuration } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Please enter a secure password (minimum 6 characters)." },
        { status: 400 }
      );
    }

    const school = await School.findById(invite.schoolId);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    // Hash password with bcrypt
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    school.adminPassword = hashedPassword;
    if (adminName) school.adminName = adminName.trim();
    if (contactPhone) school.contactPhone = contactPhone.trim();
    if (address) school.address = address.trim();
    if (defaultExamDuration) {
      school.settings.defaultExamDuration = Number(defaultExamDuration);
    }
    school.onboardingStatus = "completed";
    await school.save();

    invite.status = "accepted";
    await invite.save();

    // Auto-login: Sign school session JWT and set cookie
    const { signSchoolSession } = await import("@/lib/session");
    const sessionToken = signSchoolSession({
      schoolId: school._id.toString(),
      schoolSlug: school.slug,
      email: school.adminEmail,
      name: school.adminName || `${school.name} Admin`,
      role: "school_admin",
    });

    const response = NextResponse.json({
      success: true,
      message: "School administrator account activated successfully.",
      schoolSlug: school.slug,
    });

    response.cookies.set("school_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
