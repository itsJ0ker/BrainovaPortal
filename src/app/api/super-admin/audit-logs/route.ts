import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireSuperAdmin();
    await connectDB();

    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50).lean();

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    const status = error.message.includes("UNAUTHORIZED") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
