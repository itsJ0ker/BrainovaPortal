import React from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser, requireSchoolAccess } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { SchoolDashboardShell } from "@/components/school/SchoolDashboardShell";

export const dynamic = "force-dynamic";

export default async function SchoolTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const headerList = await headers();
  const pathname =
    headerList.get("x-pathname") ||
    headerList.get("next-url") ||
    headerList.get("x-invoke-path") ||
    "";

  // Allow unauthenticated visitors to render the dedicated school login page without redirect loops
  if (pathname.includes("/login")) {
    return <>{children}</>;
  }

  const { schoolSlug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/school/${schoolSlug}/login`);
  }

  // Cross-tenant protection: Super admin has global access, school admin only has access to their own school
  try {
    await requireSchoolAccess(schoolSlug);
  } catch (err: any) {
    if (user.role === "school_admin" && user.schoolSlug && user.schoolSlug !== schoolSlug) {
      redirect(`/school/${user.schoolSlug}`);
    }

    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-center font-sans">
        <div className="rounded-3xl border border-rose-200 bg-white p-8 max-w-md space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Cross-Tenant Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your credentials do not grant permission to view or manage records for{" "}
            <span className="font-mono font-bold text-slate-900">"{schoolSlug}"</span>. Each institution operates in strict data isolation.
          </p>
          <div className="pt-2">
            <Link
              href={user.schoolSlug ? `/school/${user.schoolSlug}` : "/sign-in"}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{user.schoolSlug ? "Return to My School Workspace" : "Back to Sign In"}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  await connectDB();
  const schoolRaw = await School.findOne({ slug: schoolSlug }).lean();
  if (!schoolRaw) {
    notFound();
  }
  const school = JSON.parse(JSON.stringify(schoolRaw));

  return (
    <SchoolDashboardShell school={school} user={user}>
      {children}
    </SchoolDashboardShell>
  );
}
