"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Search,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  GraduationCap,
  Calendar,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Eye,
  BookOpen,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";
import { ScorecardView } from "./ScorecardView";

interface TestHistoryItem {
  attemptId: string;
  examId: string;
  title: string;
  subject: string;
  accessCode: string;
  classGrade: string;
  durationMinutes: number;
  totalQuestions: number;
  maxMarks: number;
  startedAt?: string;
  submittedAt?: string;
  status: string;
  isResultsPublished: boolean;
  scores?: {
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    mcqMarks: number;
    writtenMarks: number;
    isGradingComplete: boolean;
  } | null;
  violationCount: number;
}

interface StudentData {
  id: string;
  name: string;
  rollNumber: string;
  admissionNumber: string;
  email: string;
  classGrade: string;
  section: string;
  stream?: string;
  school?: {
    id: string;
    name: string;
    slug: string;
    code: string;
    logo?: string;
  };
}

interface SummaryData {
  totalAttempts: number;
  completedCount: number;
  publishedCount: number;
  averagePercentage: number;
  highestPercentage: number;
  passedCount: number;
  failedCount: number;
}

export function StudentTestHistoryView({
  initialRoll = "",
  initialCode = "",
}: {
  initialRoll?: string;
  initialCode?: string;
}) {
  const [rollNumber, setRollNumber] = useState(initialRoll);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState(initialCode);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [student, setStudent] = useState<StudentData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [history, setHistory] = useState<TestHistoryItem[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending">("all");

  // Selected Scorecard View
  const [activeScorecard, setActiveScorecard] = useState<any | null>(null);
  const [isLoadingScorecard, setIsLoadingScorecard] = useState(false);

  // Auto-search if initialRoll is provided
  useEffect(() => {
    if (initialRoll) {
      handleSearch(undefined, initialRoll, initialCode);
    }
  }, [initialRoll, initialCode]);

  const handleSearch = async (
    e?: React.FormEvent,
    overrideRoll?: string,
    overrideCode?: string
  ) => {
    if (e) e.preventDefault();
    const queryRoll = overrideRoll !== undefined ? overrideRoll : rollNumber;
    const queryCode = overrideCode !== undefined ? overrideCode : accessCode;

    if (!queryRoll && !admissionNumber && !email) {
      setError("Please provide a Roll Number, Admission Number, or registered Email.");
      return;
    }

    setIsLoading(true);
    setError("");
    setActiveScorecard(null);

    try {
      const res = await fetch("/api/portal/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollNumber: queryRoll,
          admissionNumber,
          email,
          accessCode: queryCode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "No test records found for the provided information.");
        setStudent(null);
        setSummary(null);
        setHistory([]);
      } else {
        setStudent(data.student);
        setSummary(data.summary);
        setHistory(data.history || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve student test history.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewScorecard = async (attemptId: string) => {
    setIsLoadingScorecard(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/attempt/result?attemptId=${encodeURIComponent(attemptId)}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load examination result.");
      } else {
        setActiveScorecard(data);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading scorecard.");
    } finally {
      setIsLoadingScorecard(false);
    }
  };

  // If a scorecard is active, render it
  if (activeScorecard) {
    return (
      <div className="w-full">
        <ScorecardView
          data={activeScorecard}
          onClose={() => setActiveScorecard(null)}
          showBackButton={true}
        />
      </div>
    );
  }

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.accessCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && item.isResultsPublished) ||
      (statusFilter === "pending" && !item.isResultsPublished);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full space-y-6">
      {/* Lookup Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Check Results & Test History
          </h2>
          <p className="text-xs text-slate-500">
            Enter your Roll Number or Admission Number to access your complete institutional exam portfolio and scorecards.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSearch(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Roll Number *
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. GRN-101"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Admission Number (Optional)
              </label>
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ADM-2025-001"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Exam Code (Optional Filter)
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="e.g. PHYS101"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? "Searching Portfolio..." : "Retrieve Test History"}</span>
          </button>
        </form>
      </div>

      {/* Results & History Display */}
      {student && summary && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Student Profile Header & Metrics */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    {student.name}
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {student.rollNumber}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {student.school?.name || "Institution"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {student.classGrade} – Section {student.section}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSearch()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Performance Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Tests Attempted
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {summary.totalAttempts}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {summary.completedCount} Submissions
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Average Score
                </span>
                <div className="text-2xl font-black text-indigo-600 font-mono mt-1">
                  {summary.averagePercentage}%
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Across published exams
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Highest Score
                </span>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {summary.highestPercentage}%
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Peak performance
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pass Record
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {summary.passedCount}{" "}
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    / {summary.publishedCount} passed
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {summary.publishedCount > 0
                    ? `${Math.round((summary.passedCount / summary.publishedCount) * 100)}% Pass rate`
                    : "No published records"}
                </span>
              </div>
            </div>
          </div>

          {/* Test History List */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-base font-bold text-slate-900">
                  Examination Portfolio & Attempt History
                </h4>
                <p className="text-xs text-slate-500">
                  Select any examination to inspect the official scorecard, marks breakdown, and correct answers.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject or title..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-44"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("published")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      statusFilter === "published"
                        ? "bg-white text-emerald-700 shadow-2xs"
                        : "text-slate-600"
                    }`}
                  >
                    Published
                  </button>
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      statusFilter === "pending" ? "bg-white text-amber-700 shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* History Items */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No test attempts match the criteria.</p>
                <p className="text-[11px] text-slate-400">
                  Try clearing filters or search keywords.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => {
                  const percentage = item.scores ? Math.round(item.scores.percentage * 10) / 10 : null;

                  return (
                    <div
                      key={item.attemptId}
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 hover:border-slate-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {item.accessCode}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            <BookOpen className="w-3 h-3 text-indigo-500" />
                            {item.subject}
                          </span>

                          {item.isResultsPublished ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Results Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Release
                            </span>
                          )}
                        </div>

                        <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {item.submittedAt ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatInIST(item.submittedAt)}
                            </span>
                          ) : (
                            <span>In Progress</span>
                          )}
                          <span>•</span>
                          <span>
                            {item.totalQuestions} Questions ({item.durationMinutes} mins)
                          </span>
                          {item.violationCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-amber-600 font-medium">
                                <ShieldAlert className="w-3 h-3 text-amber-500" />
                                {item.violationCount} integrity flag
                                {item.violationCount > 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Scores & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        {item.isResultsPublished && item.scores ? (
                          <div className="text-left sm:text-right">
                            <div className="font-mono text-base sm:text-lg font-black text-slate-900">
                              {item.scores.totalMarks}{" "}
                              <span className="text-xs font-normal text-slate-400 font-sans">
                                / {item.scores.maxMarks}
                              </span>
                            </div>
                            <span
                              className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${
                                percentage !== null && percentage >= 75
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : percentage !== null && percentage >= 50
                                  ? "text-blue-700 bg-blue-50 border-blue-200"
                                  : "text-amber-700 bg-amber-50 border-amber-200"
                              }`}
                            >
                              {percentage}% Score
                            </span>
                          </div>
                        ) : (
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-semibold text-slate-500 block">
                              Submitted
                            </span>
                            <span className="text-[10px] text-slate-400">Under Evaluation</span>
                          </div>
                        )}

                        {item.isResultsPublished && item.scores && item.scores.percentage >= 40 && (
                          <Link
                            href={`/portal/certificate/${item.attemptId}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs transition-colors"
                            title="Official Olympiad Certificate"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">Certificate</span>
                          </Link>
                        )}

                        <button
                          onClick={() => handleViewScorecard(item.attemptId)}
                          disabled={isLoadingScorecard}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Scorecard</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

