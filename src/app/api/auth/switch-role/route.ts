import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { role, schoolId, schoolSlug } = await req.json();

    const response = NextResponse.json({
      success: true,
      message: `Role switched to ${role}`,
      role,
      schoolId,
      schoolSlug,
    });

    response.cookies.set("dev_auth_role", role, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    if (schoolId) {
      response.cookies.set("dev_auth_school_id", schoolId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }

    if (schoolSlug) {
      response.cookies.set("dev_auth_school_slug", schoolSlug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
