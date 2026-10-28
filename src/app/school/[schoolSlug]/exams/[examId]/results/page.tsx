"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  BarChart2,
  Download,
  Share2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  ShieldAlert,
  Award,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

function ExamResultsContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const examId = params.examId as string;

  const [school, setSchool] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [selectedScorecard, setSelectedScorecard] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolRes, resultsRes] = await Promise.all([
        fetch(`/api/school/${schoolSlug}/profile`),
        fetch(`/api/school/${schoolSlug}/exams/${examId}/results`),
      ]);

      const [schoolData, resultsData] = await Promise.all([
        schoolRes.json(),
        resultsRes.json(),
      ]);

      if (schoolData.success) setSchool(schoolData.school);
      if (resultsData.success) {
        setExam(resultsData.exam);
        setStats(resultsData.stats);
        setAttempts(resultsData.attempts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolSlug && examId) fetchData();
  }, [schoolSlug, examId]);

  const handleTogglePublishResults = async () => {
    if (!exam) return;
    setIsPublishing(true);
    try {
      const nextStatus = !exam.isResultsPublished;
      const res = await fetch(`/api/school/${schoolSlug}/exams/${examId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResultsPublished: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setExam({ ...exam, isResultsPublished: nextStatus });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportExcel = () => {
    window.open(`/api/school/${schoolSlug}/exams/${examId}/results?format=xlsx`, "_blank");
  };

  if (isLoading && (!school || !exam)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading performance report...
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Examination not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/school/${schoolSlug}/exams`}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Examination Results</h1>
              <Badge variant={exam.isResultsPublished ? "success" : "warning"}>
                {exam.isResultsPublished ? "Results Published" : "Results Hidden from Students"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{exam.title} ({exam.accessCode})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/school/${schoolSlug}/exams/${examId}/invigilation`}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Invigilation Room</span>
          </Link>

          <button
            onClick={handleTogglePublishResults}
            disabled={isPublishing}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              exam.isResultsPublished
                ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            }`}
          >
            {exam.isResultsPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{exam.isResultsPublished ? "Unpublish Results" : "Publish Results to Students"}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Aggregated Statistical Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Attempts
            </span>
            <span className="block mt-1 text-2xl font-black text-slate-900 font-mono">
              {stats.submittedCount}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Average Score
            </span>
            <span className="block mt-1 text-2xl font-black text-indigo-600 font-mono">
              {stats.averagePercentage}%
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Highest Score
            </span>
            <span className="block mt-1 text-2xl font-black text-emerald-600 font-mono">
              {stats.highestScore}%
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lowest Score
            </span>
            <span className="block mt-1 text-2xl font-black text-rose-600 font-mono">
              {stats.lowestScore}%
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pass Rate
            </span>
            <span className="block mt-1 text-2xl font-black text-sky-600 font-mono">
              {stats.passPercentage}%
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Grading
            </span>
            <span className="block mt-2 text-xs font-bold text-indigo-600">
              <Link href={`/school/${schoolSlug}/exams/${examId}/grading`} className="hover:underline">
                Manual Studio →
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Results Candidate Roster Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-5 py-3 text-center w-14">Rank</th>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-5 py-3">Roll Number</th>
                <th className="px-5 py-3">Class / Sec</th>
                <th className="px-5 py-3 text-center">MCQ / Written</th>
                <th className="px-5 py-3 text-center">Total Marks</th>
                <th className="px-5 py-3 text-center">Violations</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    No attempts recorded for this examination yet.
                  </td>
                </tr>
              ) : (
                attempts.map((att, idx) => (
                  <tr key={att._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-indigo-600">
                      #{idx + 1}
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {att.studentSnapshot?.name}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-indigo-600 font-semibold">
                      {att.studentSnapshot?.rollNumber}
                    </td>

                    <td className="px-5 py-3.5">
                      {att.studentSnapshot?.classGrade} - {att.studentSnapshot?.section}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-slate-600">
                      {att.scores?.mcqMarks} / {att.scores?.writtenMarks}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-900 text-sm">
                      {att.scores?.totalMarks} <span className="text-xs text-slate-400 font-normal">({att.scores?.percentage}%)</span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {att.violationCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-mono text-xs font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {att.violationCount}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">0</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          att.status === "submitted"
                            ? "success"
                            : att.status === "auto_submitted"
                            ? "warning"
                            : "default"
                        }
                      >
                        {att.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedScorecard(att)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Scorecard Detail Modal */}
      {selectedScorecard && (
        <Modal
          isOpen={Boolean(selectedScorecard)}
          onClose={() => setSelectedScorecard(null)}
          title={`Scorecard: ${selectedScorecard.studentSnapshot?.name}`}
          description={`Roll No: ${selectedScorecard.studentSnapshot?.rollNumber} · Class: ${selectedScorecard.studentSnapshot?.classGrade} - ${selectedScorecard.studentSnapshot?.section}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 py-1">
            {/* Summary Banner */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 flex items-center justify-between font-mono">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Final Score</span>
                <span className="text-2xl font-bold text-slate-900">
                  {selectedScorecard.scores?.totalMarks} / {selectedScorecard.scores?.maxMarks} pts
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block uppercase font-medium">Performance</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {selectedScorecard.scores?.percentage}%
                </span>
              </div>
            </div>

            {/* Questions Evaluated */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Question Breakdown & Teacher Evaluations
              </h4>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedScorecard.questionEvaluations?.map((ev: any, idx: number) => {
                  const q = exam.questions?.find((quest: any) => quest.id === ev.questionId);
                  const resp = selectedScorecard.responses?.find((r: any) => r.questionId === ev.questionId);

                  return (
                    <div
                      key={ev.questionId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          Q{idx + 1}: {q?.prompt || "Question"}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {ev.marksAwarded} / {ev.maxMarks} pts
                        </span>
                      </div>

                      {q?.type === "written" ? (
                        <div className="pt-1 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                          <strong>Response:</strong> {resp?.writtenAnswer || "(Left blank)"}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">
                          Chosen: <span className="text-indigo-600 font-semibold font-mono">{resp?.selectedOptions?.join(", ") || "(None)"}</span>
                        </div>
                      )}

                      {ev.feedback && (
                        <div className="text-[11px] text-amber-800 font-medium">
                          Feedback: {ev.feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Integrity Audit Events */}
            {selectedScorecard.integrityLog?.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Integrity Events Logged ({selectedScorecard.integrityLog.length})</span>
                </h4>
                <div className="divide-y divide-slate-100 text-[11px] text-slate-600 max-h-32 overflow-y-auto">
                  {selectedScorecard.integrityLog.map((log: any, i: number) => (
                    <div key={i} className="py-1.5 flex items-center justify-between">
                      <span className="text-slate-800">{log.details || log.type}</span>
                      <span className="font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ExamResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <ExamResultsContent />
    </Suspense>
  );
}
