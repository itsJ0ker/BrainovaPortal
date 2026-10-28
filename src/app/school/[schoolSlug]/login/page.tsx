import React from "react";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import School, { findSchoolByIdOrSlug } from "@/models/School";
import { SchoolLoginBox } from "./SchoolLoginBox";
import { Building, Shield, FileCheck2, ArrowLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DedicatedSchoolLoginPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await connectDB();

  const schoolDoc = await findSchoolByIdOrSlug(schoolSlug, true);

  if (!schoolDoc) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 font-sans text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 max-w-md space-y-4 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">School Not Found</h2>
          <p className="text-xs text-slate-500">
            No active institutional workspace matching identifier{" "}
            <span className="font-mono text-slate-800 font-bold">"{schoolSlug}"</span> was found.
          </p>
          <div className="pt-2">
            <Link
              href="/school/login"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Choose Another School</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const school = JSON.parse(JSON.stringify(schoolDoc));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 font-sans relative">
      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* School Branded Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white font-bold text-base shadow-sm">
            <Building className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{school.name}</h1>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 font-semibold">
                {school.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Institutional Administrator & Faculty Workspace Access
            </p>
          </div>
        </div>

        {/* School Login Box */}
        <SchoolLoginBox
          schoolSlug={school.slug}
          schoolName={school.name}
          hasPasswordSet={Boolean(school.adminPassword)}
        />

        {/* Notice for Students & Switching */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-500 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-semibold text-slate-800">Are you a candidate taking a test?</p>
            <p className="text-[11px] text-slate-500">No staff login needed. Enter via student portal.</p>
          </div>
          <Link
            href="/portal"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <span>Exam Portal</span>
          </Link>
        </div>

        <div className="text-center pt-1 space-y-2">
          <Link
            href="/school/login"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium block"
          >
            ← Switch to another school
          </Link>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-3.5 w-3.5 object-contain inline" />
            <span>Powered by Brainova Olympiad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
