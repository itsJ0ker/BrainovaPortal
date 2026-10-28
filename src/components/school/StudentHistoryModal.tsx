"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ScorecardView } from "@/components/portal/ScorecardView";
import { IStudent } from "@/types";
import { formatInIST } from "@/lib/timezone";
import {
  FileCheck2,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  Building,
  GraduationCap,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  ArrowLeft,
} from "lucide-react";

interface StudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: IStudent | null;
  schoolSlug: string;
}

export function StudentHistoryModal({
  isOpen,
  onClose,
  student,
  schoolSlug,
}: StudentHistoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [scorecardData, setScorecardData] = useState<any | null>(null);
  const [isLoadingScorecard, setIsLoadingScorecard] = useState(false);

  useEffect(() => {
    if (isOpen && student && schoolSlug) {
      setSelectedAttemptId(null);
      setScorecardData(null);
      fetchStudentHistory();
    }
  }, [isOpen, student, schoolSlug]);

  const fetchStudentHistory = async () => {
    if (!student) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/school/${schoolSlug}/students/${student._id}/history`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load examination history.");
      } else {
        setHistoryData(data);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading student history.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenScorecard = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setIsLoadingScorecard(true);
    try {
      const res = await fetch(`/api/portal/attempt/result?attemptId=${encodeURIComponent(attemptId)}`);
      const data = await res.json();
      if (data.success) {
        setScorecardData(data);
      } else {
        setError(data.error || "Failed to load detailed scorecard.");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching scorecard.");
    } finally {
      setIsLoadingScorecard(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scorecardData ? "Examination Scorecard" : `Test History: ${student.name}`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* If Scorecard is open, render ScorecardView */}
        {scorecardData ? (
          <div className="space-y-4">
            <button
              onClick={() => {
                setScorecardData(null);
                setSelectedAttemptId(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Attempt List</span>
            </button>
            <ScorecardView data={scorecardData} />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Student Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{student.name}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-mono text-indigo-700 font-semibold">{student.rollNumber}</span>
                    <span>•</span>
                    <span>Adm: {student.admissionNumber}</span>
                    <span>•</span>
                    <span>{student.classGrade} ({student.section})</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Roster Status</span>
                <span className="block text-xs font-bold text-emerald-600 uppercase">
                  {student.status || "Active"}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading examination history...</span>
              </div>
            ) : historyData ? (
              <div className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Attempts
                    </span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {historyData.summary?.totalAttempts || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Graded Tests
                    </span>
                    <div className="text-xl font-black text-indigo-600 font-mono mt-0.5">
                      {historyData.summary?.gradedCount || 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Average Score
                    </span>
                    <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">
                      {historyData.summary?.averagePercentage || 0}%
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Points Scored
                    </span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {historyData.summary?.totalMarksSum || 0}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        / {historyData.summary?.maxMarksSum || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attempts Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Exam Title & Code</th>
                          <th className="px-4 py-2.5">Submitted (IST)</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Score</th>
                          <th className="px-4 py-2.5">Integrity</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!historyData.history || historyData.history.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              No examination attempts recorded for this candidate yet.
                            </td>
                          </tr>
                        ) : (
                          historyData.history.map((att: any) => {
                            const percentage = att.scores?.percentage ?? null;

                            return (
                              <tr key={att.attemptId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-slate-900">{att.title}</div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                    <span className="font-mono text-slate-700 font-semibold">{att.accessCode}</span>
                                    <span>•</span>
                                    <span>{att.subject}</span>
                                  </div>
                                </td>

                                <td className="px-4 py-3 text-slate-600">
                                  {att.submittedAt ? formatInIST(att.submittedAt) : "In Progress"}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      att.status === "submitted"
                                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                        : "text-amber-700 bg-amber-50 border-amber-200"
                                    }`}
                                  >
                                    {att.status}
                                  </span>
                                </td>

                                <td className="px-4 py-3 font-mono">
                                  {att.scores ? (
                                    <div>
                                      <span className="font-bold text-slate-900">
                                        {att.scores.totalMarks} / {att.scores.maxMarks}
                                      </span>
                                      <span className="text-[10px] text-emerald-600 ml-1.5 font-sans font-bold">
                                        ({percentage}%)
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">Pending</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {att.violationCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                      {att.violationCount} flag{att.violationCount > 1 ? "s" : ""}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      Clean
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleOpenScorecard(att.attemptId)}
                                    disabled={isLoadingScorecard}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Scorecard</span>
                                  </button>
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
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

