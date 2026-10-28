"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Save,
  HelpCircle,
  AlertCircle,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";

function ExamGradingContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const examId = params.examId as string;

  const [school, setSchool] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("");
  const [evaluations, setEvaluations] = useState<Record<string, { marks: number; feedback: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolRes, examRes, resultsRes] = await Promise.all([
        fetch(`/api/school/${schoolSlug}/profile`),
        fetch(`/api/school/${schoolSlug}/exams/${examId}`),
        fetch(`/api/school/${schoolSlug}/exams/${examId}/results`),
      ]);

      const [schoolData, examData, resultsData] = await Promise.all([
        schoolRes.json(),
        examRes.json(),
        resultsRes.json(),
      ]);

      if (schoolData.success) setSchool(schoolData.school);
      if (examData.success) setExam(examData.exam);
      if (resultsData.success) {
        setAttempts(resultsData.attempts);
        if (resultsData.attempts.length > 0 && !selectedAttemptId) {
          setSelectedAttemptId(resultsData.attempts[0]._id);
        }
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

  const currentAttempt = attempts.find((a) => a._id === selectedAttemptId);

  // Sync evaluations state when switching selected attempt
  useEffect(() => {
    if (!currentAttempt) return;
    const initial: Record<string, { marks: number; feedback: string }> = {};

    currentAttempt.questionEvaluations?.forEach((ev: any) => {
      initial[ev.questionId] = {
        marks: ev.marksAwarded || 0,
        feedback: ev.feedback || "",
      };
    });

    setEvaluations(initial);
    setSaveMessage("");
  }, [currentAttempt]);

  const writtenQuestions = exam?.questions?.filter((q: any) => q.type === "written") || [];

  const handleSaveGrades = async () => {
    if (!selectedAttemptId) return;
    setIsSaving(true);
    setSaveMessage("");

    const payload = Object.entries(evaluations).map(([questionId, data]) => ({
      questionId,
      marksAwarded: Number(data.marks),
      feedback: data.feedback,
    }));

    try {
      const res = await fetch(`/api/school/${schoolSlug}/exams/${examId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttemptId,
          evaluations: payload,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setSaveMessage("Evaluation and scores saved successfully!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && (!school || !exam)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading grading studio...
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manual Grading Studio</h1>
              <Badge variant="purple">{exam.subject}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{exam.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/school/${schoolSlug}/exams/${examId}/results`}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            View Full Scorecards & Analytics
          </Link>
        </div>
      </div>

      {/* 2-Column Studio View: Student List (Left) + Grading Sheet (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Candidates List (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Candidate Submissions ({attempts.length})
          </h3>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {attempts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No student attempts recorded yet.</p>
            ) : (
              attempts.map((att) => {
                const isSelected = att._id === selectedAttemptId;
                const isComplete = att.scores?.isGradingComplete;

                return (
                  <button
                    key={att._id}
                    onClick={() => setSelectedAttemptId(att._id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/30 font-semibold"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{att.studentSnapshot?.name}</span>
                      {isComplete ? (
                        <Badge variant="success">Graded</Badge>
                      ) : (
                        <Badge variant="warning">Needs Review</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono text-indigo-600 font-semibold">{att.studentSnapshot?.rollNumber}</span>
                      <span className="font-bold text-slate-900">
                        {att.scores?.totalMarks} / {att.scores?.maxMarks} pts
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Grading Evaluation Canvas (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          {currentAttempt ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
              {/* Candidate Overview Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Evaluating: {currentAttempt.studentSnapshot?.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                    <span>Roll: {currentAttempt.studentSnapshot?.rollNumber}</span>
                    <span>•</span>
                    <span>Class: {currentAttempt.studentSnapshot?.classGrade} - {currentAttempt.studentSnapshot?.section}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Auto MCQ Marks</span>
                    <span className="font-bold text-emerald-700">{currentAttempt.scores?.mcqMarks} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Written Marks</span>
                    <span className="font-bold text-indigo-600">{currentAttempt.scores?.writtenMarks} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Net Total Score</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {currentAttempt.scores?.totalMarks} / {currentAttempt.scores?.maxMarks} ({currentAttempt.scores?.percentage}%)
                    </span>
                  </div>
                </div>
              </div>

              {saveMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* Written Questions to evaluate */}
              {writtenQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  This examination contains only auto-graded multiple-choice questions. No subjective questions requiring manual evaluation.
                </div>
              ) : (
                <div className="space-y-6">
                  {writtenQuestions.map((q: any, qIdx: number) => {
                    const resp = currentAttempt.responses?.find((r: any) => r.questionId === q.id);
                    const currentMarks = evaluations[q.id]?.marks ?? 0;
                    const currentFeedback = evaluations[q.id]?.feedback ?? "";

                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4"
                      >
                        {/* Question Prompt */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                              Written Question {qIdx + 1} ({q.points} Max Marks)
                            </span>
                            <p className="text-sm font-semibold text-slate-900 mt-1">{q.prompt}</p>
                          </div>
                        </div>

                        {/* Rubric */}
                        {q.rubric && (
                          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
                            <span className="font-bold block text-[11px] text-indigo-700 uppercase tracking-wider mb-0.5">
                              Evaluation Rubric / Answer Key:
                            </span>
                            {q.rubric}
                          </div>
                        )}

                        {/* Candidate Response */}
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Candidate Written Response:
                          </span>
                          <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans min-h-[100px] shadow-2xs">
                            {resp?.writtenAnswer ? (
                              resp.writtenAnswer
                            ) : (
                              <span className="italic text-slate-400">Candidate left this question blank.</span>
                            )}
                          </div>
                        </div>

                        {/* Marks & Feedback Input */}
                        <div className="pt-2 border-t border-slate-200 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700">
                                  Marks (Max {q.points})
                                </label>
                                <span className="text-xs font-bold text-emerald-700 font-mono">
                                  {currentMarks} / {q.points}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvaluations({
                                      ...evaluations,
                                      [q.id]: { marks: 0, feedback: currentFeedback },
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] font-bold text-rose-700 border border-slate-200 shadow-2xs"
                                >
                                  0 pts
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvaluations({
                                      ...evaluations,
                                      [q.id]: {
                                        marks: Math.round((q.points / 2) * 2) / 2,
                                        feedback: currentFeedback,
                                      },
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] font-bold text-amber-700 border border-slate-200 shadow-2xs"
                                >
                                  Half ({Math.round((q.points / 2) * 2) / 2})
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvaluations({
                                      ...evaluations,
                                      [q.id]: { marks: q.points, feedback: currentFeedback },
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs"
                                >
                                  Full ({q.points})
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={q.points}
                                  value={currentMarks}
                                  onChange={(e) =>
                                    setEvaluations({
                                      ...evaluations,
                                      [q.id]: {
                                        marks: Number(e.target.value),
                                        feedback: currentFeedback,
                                      },
                                    })
                                  }
                                  className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900 text-center font-mono focus:border-indigo-600 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-xs font-semibold text-slate-700">
                                Teacher Feedback / Remarks
                              </label>
                              <input
                                type="text"
                                value={currentFeedback}
                                onChange={(e) =>
                                  setEvaluations({
                                    ...evaluations,
                                    [q.id]: {
                                      marks: currentMarks,
                                      feedback: e.target.value,
                                    },
                                  })
                                }
                                placeholder="e.g. Good derivation of formula, minor calculation error..."
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                              />
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {[
                                  "Excellent answer with clear working.",
                                  "Conceptually correct, minor computation error.",
                                  "Partially complete, missed key derivation step.",
                                  "Needs more explanatory detail.",
                                ].map((chip) => (
                                  <button
                                    key={chip}
                                    type="button"
                                    onClick={() =>
                                      setEvaluations({
                                        ...evaluations,
                                        [q.id]: {
                                          marks: currentMarks,
                                          feedback: currentFeedback ? `${currentFeedback} ${chip}` : chip,
                                        },
                                      })
                                    }
                                    className="rounded-md bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 transition-colors"
                                  >
                                    + {chip}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveGrades}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving Grades..." : "Save Evaluation & Recalculate Score"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs shadow-sm">
              Select a candidate from the left panel to review responses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExamGradingPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <ExamGradingContent />
    </Suspense>
  );
}
