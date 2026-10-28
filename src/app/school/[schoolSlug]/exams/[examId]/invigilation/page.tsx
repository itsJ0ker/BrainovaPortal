"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  ArrowLeft,
  Users,
  Eye,
  PlusCircle,
  RotateCcw,
  Flag,
  FileCheck2,
  Calendar,
  Building,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function InvigilationContent() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;
  const examId = params.examId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const [exam, setExam] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "alerts" | "submitted" | "not_started">("all");

  // Action status feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchInvigilationData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/school/${schoolSlug}/exams/${examId}/invigilation`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load invigilation stream.");
      } else {
        setExam(data.exam);
        setSummary(data.summary);
        setCandidates(data.candidates);
        setLastRefreshedAt(new Date());
      }
    } catch (err: any) {
      setError(err.message || "Network error loading invigilation feed.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolSlug && examId) {
      fetchInvigilationData(false);
    }
  }, [schoolSlug, examId]);

  // Polling loop (every 4 seconds)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchInvigilationData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, schoolSlug, examId]);

  const handleAction = async (action: string, attemptId: string, extraMinutes?: number) => {
    setActionLoadingId(`${action}-${attemptId}`);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/school/${schoolSlug}/exams/${examId}/invigilation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, attemptId, extraMinutes }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        await fetchInvigilationData(true);
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        setError(data.error || "Action failed.");
      }
    } catch (err: any) {
      setError(err.message || "Network error dispatching action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null || totalSeconds === undefined) return "--:--";
    if (totalSeconds <= 0) return "Time Expired";
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterTab === "all") return matchesSearch;
    if (filterTab === "active") return matchesSearch && (c.status === "active" || c.status === "idle");
    if (filterTab === "alerts") return matchesSearch && c.violationCount > 0;
    if (filterTab === "submitted") return matchesSearch && (c.status === "submitted" || c.status === "auto_submitted");
    if (filterTab === "not_started") return matchesSearch && c.status === "not_started";
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Breadcrumb & Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/school/${schoolSlug}/exams`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Examinations</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">Live Examination Invigilation Room</span>
        </div>

        {/* Polling Toggle & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isAutoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {isAutoRefresh ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <Pause className="w-3.5 h-3.5" />
                <span>Live Feed Active (4s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Feed Paused</span>
              </>
            )}
          </button>

          <button
            onClick={() => fetchInvigilationData(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            title="Refresh Now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Examination Banner */}
      {exam && (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-emerald-300 border border-white/15">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Assessment Room
              </span>
              <span className="font-mono text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white border border-white/15">
                {exam.accessCode}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {exam.title}
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              Subject: <strong className="text-white">{exam.subject}</strong> • Duration:{" "}
              {exam.durationMinutes} Minutes • Anti-Cheating:{" "}
              {exam.antiCheatingEnabled ? `Active (Max ${exam.maxViolations} warnings)` : "Disabled"}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono">
              Live IST Time
            </span>
            <div className="text-xs text-slate-300 font-medium">
              Window: {formatInIST(exam.startTime)} – {formatInIST(exam.endTime)}
            </div>
          </div>
        </div>
      )}

      {/* Live Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Roster
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {summary.totalEnrolled}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Eligible candidates</span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Answering
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
              {summary.activeNow}
            </div>
            <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Live candidate sessions</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Submitted
            </span>
            <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
              {summary.submitted}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Finished examination</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Not Started
            </span>
            <div className="text-2xl font-black text-slate-600 font-mono mt-1">
              {summary.notStarted}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Awaiting candidate entry</span>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Total Violations
            </span>
            <div className="text-2xl font-black text-amber-700 font-mono mt-1">
              {summary.totalViolations}
            </div>
            <span className="text-[11px] text-amber-600/80 mt-0.5 block">Proctoring warnings</span>
          </div>
        </div>
      )}

      {/* Candidate Live Stream Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === "active" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Active Now ({summary?.activeNow || 0})
            </button>
            <button
              onClick={() => setFilterTab("alerts")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === "alerts" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Alerts ({candidates.filter((c) => c.violationCount > 0).length})
            </button>
            <button
              onClick={() => setFilterTab("submitted")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === "submitted" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              Submitted ({summary?.submitted || 0})
            </button>
            <button
              onClick={() => setFilterTab("not_started")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === "not_started" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Not Started ({summary?.notStarted || 0})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or roll..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-full sm:w-56"
            />
          </div>
        </div>

        {/* Candidate Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Live Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Time Remaining</th>
                <th className="px-4 py-3">Proctoring Audit</th>
                <th className="px-4 py-3 text-right">Invigilator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No candidates match this filter.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const isAttemptActive = c.status === "active" || c.status === "idle";
                  const isSubmitted = c.status === "submitted" || c.status === "auto_submitted";

                  return (
                    <tr key={c.studentId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Candidate */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <span>{c.rollNumber}</span>
                          <span>•</span>
                          <span>{c.classGrade} ({c.section})</span>
                        </div>
                      </td>

                      {/* Live Status */}
                      <td className="px-4 py-3">
                        {c.status === "active" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Answering Live
                          </span>
                        )}
                        {c.status === "idle" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Idle / Focus Away
                          </span>
                        )}
                        {c.status === "submitted" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                            Submitted
                          </span>
                        )}
                        {c.status === "auto_submitted" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Auto Submitted
                          </span>
                        )}
                        {c.status === "timed_out" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Timed Out
                          </span>
                        )}
                        {c.status === "flagged" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <Flag className="w-3 h-3 text-rose-600" />
                            Flagged for Review
                          </span>
                        )}
                        {c.status === "not_started" && (
                          <span className="text-[11px] text-slate-400 font-medium">Not Entered Yet</span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-[11px] font-mono font-bold text-slate-700">
                            {c.answeredQuestions} / {c.totalQuestions} Questions
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{
                                width: `${c.totalQuestions > 0 ? (c.answeredQuestions / c.totalQuestions) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remaining Timer */}
                      <td className="px-4 py-3 font-mono font-bold">
                        {isAttemptActive ? (
                          <span
                            className={
                              c.remainingSeconds && c.remainingSeconds < 300
                                ? "text-rose-600 font-black animate-pulse"
                                : "text-slate-800"
                            }
                          >
                            {formatTimer(c.remainingSeconds)}
                          </span>
                        ) : isSubmitted ? (
                          <span className="text-[11px] text-slate-400 font-sans font-medium">Completed</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-sans">--:--</span>
                        )}
                      </td>

                      {/* Proctoring */}
                      <td className="px-4 py-3">
                        {c.violationCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                              {c.violationCount} Alert{c.violationCount > 1 ? "s" : ""}
                            </span>
                            {c.recentEvent && (
                              <p className="text-[10px] text-slate-500 line-clamp-1 truncate max-w-xs">
                                {c.recentEvent.details}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Clean
                          </span>
                        )}
                      </td>

                      {/* Invigilator Actions */}
                      <td className="px-4 py-3 text-right">
                        {c.attemptId ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {isAttemptActive && (
                              <>
                                <button
                                  onClick={() => handleAction("extend_time", c.attemptId, 5)}
                                  disabled={actionLoadingId === `extend_time-${c.attemptId}`}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 shadow-2xs transition-colors"
                                  title="Add +5 Minutes"
                                >
                                  +5m
                                </button>
                                <button
                                  onClick={() => handleAction("extend_time", c.attemptId, 10)}
                                  disabled={actionLoadingId === `extend_time-${c.attemptId}`}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 shadow-2xs transition-colors"
                                  title="Add +10 Minutes"
                                >
                                  +10m
                                </button>
                              </>
                            )}

                            {c.violationCount > 0 && (
                              <button
                                onClick={() => handleAction("reset_violations", c.attemptId)}
                                disabled={actionLoadingId === `reset_violations-${c.attemptId}`}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 shadow-2xs transition-colors"
                                title="Reset candidate violations to zero"
                              >
                                Reset Warnings
                              </button>
                            )}

                            {isAttemptActive && (
                              <button
                                onClick={() => handleAction("force_submit", c.attemptId)}
                                disabled={actionLoadingId === `force_submit-${c.attemptId}`}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 shadow-2xs transition-colors"
                                title="Force immediate submission and grading"
                              >
                                Force Submit
                              </button>
                            )}

                            {isSubmitted && (
                              <Link
                                href={`/portal/results?attemptId=${c.attemptId}`}
                                target="_blank"
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold shadow-2xs transition-colors"
                              >
                                Scorecard
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No attempt record</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function InvigilationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading live invigilation room...</div>}>
      <InvigilationContent />
    </Suspense>
  );
}

