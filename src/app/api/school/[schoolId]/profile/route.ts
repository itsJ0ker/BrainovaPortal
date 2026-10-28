import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import { requireSchoolAccess } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const school = await findSchoolByIdOrSlug(schoolId, true);

    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    await requireSchoolAccess(schoolId);
    await connectDB();

    const body = await req.json();
    const school = await findSchoolByIdOrSlug(schoolId, false);

    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const { name, contactEmail, contactPhone, address, logo, settings, onboardingStatus, newPassword } = body;

    if (name) school.name = name;
    if (contactEmail) school.contactEmail = contactEmail;
    if (contactPhone !== undefined) school.contactPhone = contactPhone;
    if (address !== undefined) school.address = address;
    if (logo !== undefined) school.logo = logo;
    if (settings) school.settings = { ...school.settings, ...settings };
    if (onboardingStatus) school.onboardingStatus = onboardingStatus;

    if (newPassword && newPassword.length >= 6) {
      const bcrypt = await import("bcryptjs");
      school.adminPassword = await bcrypt.hash(newPassword, 10);
    }

    await school.save();

    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    const status = error.message.includes("FORBIDDEN") || error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
