"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ScorecardView } from "@/components/portal/ScorecardView";
import {
  FileCheck2,
  Clock,
  AlertCircle,
  Building,
  GraduationCap,
  Calendar,
  ArrowLeft,
  Search,
  BookOpen,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const attemptId = searchParams.get("attemptId");
  const code = searchParams.get("code") || searchParams.get("accessCode");
  const roll = searchParams.get("roll") || searchParams.get("rollNumber");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState<any | null>(null);

  // Manual search fallback inputs
  const [inputCode, setInputCode] = useState(code || "");
  const [inputRoll, setInputRoll] = useState(roll || "");

  const fetchResult = async (queryAttemptId?: string, queryCode?: string, queryRoll?: string) => {
    setIsLoading(true);
    setError("");

    try {
      let url = "/api/portal/attempt/result?";
      if (queryAttemptId) {
        url += `attemptId=${encodeURIComponent(queryAttemptId)}`;
      } else if (queryCode && queryRoll) {
        url += `code=${encodeURIComponent(queryCode)}&roll=${encodeURIComponent(queryRoll)}`;
      } else {
        setIsLoading(false);
        return;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "No matching result record found.");
        setResultData(null);
      } else {
        setResultData(data);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading scorecard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (attemptId || (code && roll)) {
      fetchResult(attemptId || undefined, code || undefined, roll || undefined);
    } else {
      setIsLoading(false);
    }
  }, [attemptId, code, roll]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || !inputRoll) {
      setError("Please provide both the Exam Access Code and Roll Number.");
      return;
    }
    fetchResult(undefined, inputCode, inputRoll);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb / Toolbar (print:hidden) */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/portal?tab=history"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Test History</span>
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-800">Scorecard & Verification</span>
          </div>

          <Link
            href="/portal"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Take Another Exam →
          </Link>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3 text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-full border-3 border-slate-900 border-t-transparent animate-spin" />
            <span className="font-semibold">Retrieving verified examination scorecard...</span>
          </div>
        )}

        {/* Manual Lookup Card when no params provided or on error */}
        {!isLoading && (!resultData || error) && (
          <div className="max-w-xl mx-auto space-y-6 pt-4">
            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200/80 p-2 overflow-hidden">
                <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Search Exam Scorecard</h1>
              <p className="text-xs text-slate-500">
                Brainova Olympiad verified examination scorecard retrieval. Enter your exam code and roll number.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleManualSearch} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Exam Access Code
                  </label>
                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PHYS101"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Student Roll Number
                  </label>
                  <input
                    type="text"
                    required
                    value={inputRoll}
                    onChange={(e) => setInputRoll(e.target.value.toUpperCase())}
                    placeholder="e.g. GRN-101"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Check Result Scorecard</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Result Found & Published */}
        {!isLoading && resultData && resultData.isPublished && (
          <ScorecardView data={resultData} />
        )}

        {/* Result Found but NOT Yet Published */}
        {!isLoading && resultData && !resultData.isPublished && (
          <div className="max-w-xl mx-auto rounded-3xl border border-amber-200 bg-amber-50/60 p-7 sm:p-8 text-center space-y-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Evaluation In Progress
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Results Not Yet Published
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {resultData.message ||
                  "The institutional administration has not officially published the scorecards for this exam yet. Please check back later."}
              </p>
            </div>

            {/* Candidate & Exam Summary */}
            <div className="rounded-2xl border border-amber-200/80 bg-white p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Candidate:</span>
                <span className="font-bold text-slate-900">
                  {resultData.studentSnapshot?.name} ({resultData.studentSnapshot?.rollNumber})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Examination:</span>
                <span className="font-semibold text-slate-900">
                  {resultData.exam?.title || resultData.examTitle}
                </span>
              </div>
              {resultData.submittedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Submitted At:</span>
                  <span className="font-medium text-slate-700">
                    {formatInIST(resultData.submittedAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/portal?tab=history"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                View Full Test History
              </Link>
              <Link
                href="/portal"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                Return to Exam Portal
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc]" />}>
      <ResultsContent />
    </Suspense>
  );
}

