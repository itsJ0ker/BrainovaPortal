import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/school(.*)",
  "/api/school(.*)",
  "/portal(.*)",
  "/exam(.*)",
  "/onboarding(.*)",
  "/api/portal(.*)",
  "/api/onboarding(.*)",
  "/api/seed(.*)",
  "/api/auth(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-pathname", request.nextUrl.pathname);

  // Allow direct school session cookie without requiring Clerk session
  const hasSchoolSession = Boolean(request.cookies.get("school_session")?.value);
  if (hasSchoolSession) {
    return NextResponse.next({
      request: {
        headers: reqHeaders,
      },
    });
  }

  if (!isPublicRoute(request)) {
    // In dev fallback without Clerk session, avoid blocking if user is testing with DevAuth
    if (
      process.env.CLERK_SECRET_KEY &&
      !process.env.CLERK_SECRET_KEY.includes("your_") &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_")
    ) {
      await auth.protect();
    }
  }

  return NextResponse.next({
    request: {
      headers: reqHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
