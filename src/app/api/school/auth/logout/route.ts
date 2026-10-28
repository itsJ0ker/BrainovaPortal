import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out from school workspace.",
  });

  response.cookies.set("school_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/school/login", req.url));

  response.cookies.set("school_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
