"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentTestHistoryView } from "@/components/portal/StudentTestHistoryView";
import {
  FileCheck2,
  Clock,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Building,
  CheckCircle,
  Calendar,
  History,
  PenTool,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"exam" | "history">(
    searchParams.get("tab") === "history" || searchParams.get("tab") === "results"
      ? "history"
      : "exam"
  );

  const [accessCode, setAccessCode] = useState(searchParams.get("code") || "");
  const [rollNumber, setRollNumber] = useState(searchParams.get("roll") || "");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [examPreview, setExamPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history" || tab === "results") {
      setActiveTab("history");
    } else if (tab === "exam") {
      setActiveTab("exam");
    }
  }, [searchParams]);

  // Fetch exam preview when access code changes
  useEffect(() => {
    if (!accessCode || accessCode.trim().length < 3) {
      setExamPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      setError("");
      try {
        const res = await fetch(`/api/portal/exam-info?code=${encodeURIComponent(accessCode.trim())}`);
        const data = await res.json();
        if (data.success) {
          setExamPreview(data.exam);
        } else {
          setExamPreview(null);
        }
      } catch (err) {
        setExamPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [accessCode]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode,
          rollNumber,
          admissionNumber,
          email,
          name,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Verification failed.");
        return;
      }

      // Store active session token and attempt payload in sessionStorage for runner
      sessionStorage.setItem("exam_session_token", data.sessionToken);
      sessionStorage.setItem("exam_data", JSON.stringify(data.exam));
      sessionStorage.setItem("attempt_data", JSON.stringify(data.attempt));
      sessionStorage.setItem("student_data", JSON.stringify(data.student));

      router.push("/portal/runner");
    } catch (err: any) {
      setError(err.message || "Network error occurred.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
        <div className={`w-full ${activeTab === "history" ? "max-w-4xl" : "max-w-xl"} space-y-6 transition-all duration-300`}>
          {/* Header Card */}
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200/80 mb-1 overflow-hidden p-1.5">
              <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Brainova Olympiad
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium">
              Student Examination & Assessment Portal • Take online examinations or check scorecard records
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center justify-center p-1 bg-slate-200/80 rounded-2xl max-w-md mx-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("exam")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === "exam"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>Take Examination</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>Check Results & History</span>
            </button>
          </div>

          {/* TAB 1: Check Results & Test History */}
          {activeTab === "history" && (
            <StudentTestHistoryView
              initialRoll={rollNumber}
              initialCode={accessCode}
            />
          )}

          {/* TAB 2: Take Examination Form */}
          {activeTab === "exam" && (
            <div className="space-y-6">
              {/* Verification Form Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-5">
                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Exam Live Preview if access code matches */}
                {examPreview && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Verified Examination
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {examPreview.accessCode}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{examPreview.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1 font-medium">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {examPreview.school.name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {examPreview.durationMinutes} Minutes
                      </span>
                      <span>•</span>
                      <span className="text-slate-600">
                        {examPreview.totalQuestions} Questions ({examPreview.totalMarks} Marks)
                      </span>
                    </div>
                    <div className="pt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        Eligible: {examPreview.targetDescription || examPreview.classGrade || "All Registered Students"}
                      </span>
                      {examPreview.startTime && examPreview.endTime && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 shadow-2xs font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          Window (IST): {formatInIST(examPreview.startTime)} – {formatInIST(examPreview.endTime)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Exam Access Code
                    </label>
                    <input
                      type="text"
                      required
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PHYS101"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 font-mono uppercase tracking-wider focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. GRN-101"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Full Name (Registered)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Mercer"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Registered Email Address (Optional check)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="alex.mercer@student.greenwood.edu"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-sm font-bold text-white shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isVerifying ? "Verifying Record..." : "Verify & Begin Examination"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <PortalContent />
    </Suspense>
  );
}
