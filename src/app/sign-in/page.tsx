"use client";

import React from "react";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { GraduationCap, Shield, School, ArrowRight, Lock } from "lucide-react";

export default function SignInPage() {
  const hasClerkKey =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes("your_");

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 font-sans relative">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200/80 p-2 overflow-hidden">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Brainova Olympiad
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-Tenant School Administration & Online Examination Management
          </p>
        </div>

        {/* Portal Quick Selector Pills */}
        <div className="flex items-center justify-center p-1 bg-slate-100 border border-slate-200 rounded-2xl gap-1">
          <Link
            href="/school/login"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all text-center"
          >
            <School className="w-3.5 h-3.5 text-emerald-600" />
            <span>School Login</span>
          </Link>

          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-900 bg-white shadow-sm border border-slate-200/80 text-center"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Super Admin</span>
          </button>

          <Link
            href="/portal"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white transition-all text-center"
          >
            <GraduationCap className="w-3.5 h-3.5 text-cyan-600" />
            <span>Student Portal</span>
          </Link>
        </div>

        {/* Clerk Sign In or Direct Fallback */}
        <div className="flex justify-center">
          {hasClerkKey ? (
            <div className="w-full flex justify-center">
              <SignIn
                routing="hash"
                fallbackRedirectUrl="/"
                appearance={{
                  elements: {
                    rootBox: "w-full max-w-md",
                    card: "bg-white border border-slate-200/90 shadow-sm rounded-2xl p-6",
                    headerTitle: "text-slate-900 text-lg font-bold",
                    headerSubtitle: "text-slate-500 text-xs",
                    socialButtonsBlockButton:
                      "bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-xs rounded-xl font-medium",
                    dividerLine: "bg-slate-200",
                    dividerText: "text-slate-400 text-xs",
                    formFieldLabel: "text-slate-700 text-xs font-semibold",
                    formFieldInput:
                      "bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:border-slate-400 focus:bg-white",
                    formButtonPrimary:
                      "bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all py-2.5",
                    footerActionLink: "!hidden",
                    footerActionText: "!hidden",
                    footerAction: "!hidden",
                    footer: "border-t border-slate-100 pt-3 text-xs text-slate-400",
                  },
                  variables: {
                    colorPrimary: "#0f172a",
                    colorBackground: "#ffffff",
                  },
                }}
              />
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm text-center space-y-4">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl inline-block">
                <Lock className="w-6 h-6 text-slate-700 mx-auto" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Administrator Sign In</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Select your workspace portal to continue:
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <Link
                  href="/super-admin"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-sm transition-all"
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Enter Super Admin Console</span>
                </Link>

                <Link
                  href="/school/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-all"
                >
                  <School className="w-4 h-4 text-emerald-600" />
                  <span>School Workspace Portal</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Candidate portal banner */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center justify-between text-xs shadow-sm">
          <div>
            <p className="font-semibold text-slate-800">Candidate or Student?</p>
            <p className="text-[11px] text-slate-500">No login account required. Enter with your test roll number.</p>
          </div>
          <Link
            href="/portal"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <span>Open Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
