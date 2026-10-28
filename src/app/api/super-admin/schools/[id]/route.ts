import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const { status, name, contactEmail, contactPhone, address, settings } = body;

    const school = await School.findById(id);
    if (!school) {
      return NextResponse.json({ success: false, error: "School not found." }, { status: 404 });
    }

    const previousStatus = school.status;

    if (status && ["active", "suspended", "archived"].includes(status)) {
      school.status = status;
    }
    if (name) school.name = name;
    if (contactEmail) school.contactEmail = contactEmail;
    if (contactPhone !== undefined) school.contactPhone = contactPhone;
    if (address !== undefined) school.address = address;
    if (settings) {
      school.settings = { ...school.settings, ...settings };
    }

    await school.save();

    await AuditLog.create({
      actorId: admin.userId,
      actorName: admin.name,
      actorRole: admin.role,
      action: "UPDATE_SCHOOL_STATUS",
      resourceType: "School",
      resourceId: school._id.toString(),
      details: {
        schoolName: school.name,
        previousStatus,
        newStatus: school.status,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, school });
  } catch (error: any) {
    const statusCode = error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status: statusCode });
  }
}
