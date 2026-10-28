import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import School from "@/models/School";
import { connectDB } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    let school = null;
    if (user.schoolId) {
      await connectDB();
      school = await School.findById(user.schoolId).lean();
    }

    return NextResponse.json({
      authenticated: true,
      user,
      school,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
