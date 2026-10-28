import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import bcrypt from "bcryptjs";
import { signSchoolSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit login attempts to prevent brute-force attacks (10 attempts / min per IP)
    const rl = checkRateLimit(req, { limit: 10, windowSeconds: 60, prefix: "school_login" });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${rl.resetInSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.resetInSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const identifier = body.email || body.identifier;
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your email address and password." },
        { status: 400 }
      );
    }

    await connectDB();

    const cleanId = identifier.trim();
    const school = await School.findOne({
      $or: [
        { adminEmail: cleanId.toLowerCase() },
        { contactEmail: cleanId.toLowerCase() },
        { code: cleanId.toUpperCase() },
        { slug: cleanId.toLowerCase() },
      ],
    });

    if (!school) {
      return NextResponse.json(
        { success: false, error: "No school workspace found matching this email address." },
        { status: 404 }
      );
    }

    if (!school.adminPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password has not been activated for this school. Please use the onboarding invitation link to set your password.",
        },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, school.adminPassword);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Sign session JWT
    const token = signSchoolSession({
      schoolId: school._id.toString(),
      schoolSlug: school.slug,
      email: school.adminEmail,
      name: school.adminName || `${school.name} Admin`,
      role: "school_admin",
    });

    const response = NextResponse.json({
      success: true,
      message: `Successfully authenticated for ${school.name}.`,
      schoolSlug: school.slug,
      schoolName: school.name,
    });

    response.cookies.set("school_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Server error during school authentication." },
      { status: 500 }
    );
  }
}
