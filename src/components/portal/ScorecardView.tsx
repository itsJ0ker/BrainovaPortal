"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Calendar,
  Building,
  User,
  ShieldCheck,
  ShieldAlert,
  FileText,
  HelpCircle,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";

export interface ScorecardProps {
  data: {
    attemptId?: string;
    studentSnapshot: {
      name: string;
      rollNumber: string;
      admissionNumber: string;
      email?: string;
      classGrade: string;
      section: string;
    };
    school?: {
      name: string;
      code: string;
      logo?: string;
    };
    exam: {
      id?: string;
      title: string;
      subject: string;
      accessCode: string;
      classGrade?: string;
      durationMinutes?: number;
      totalQuestions?: number;
      totalMarks?: number;
    };
    startedAt?: string;
    submittedAt?: string;
    status: string;
    scores?: {
      totalMarks: number;
      maxMarks: number;
      percentage: number;
      mcqMarks: number;
      writtenMarks: number;
      isGradingComplete: boolean;
    };
    violationCount?: number;
    integrityLog?: any[];
    questions?: Array<{
      id: string;
      type: string;
      prompt: string;
      options?: Array<{ id: string; text: string }>;
      points: number;
      negativePoints?: number;
      explanation?: string;
      rubric?: string;
      correctAnswer?: any;
      studentResponse: {
        selectedOptions?: string[];
        writtenAnswer?: string;
        answeredAt?: string;
      };
      evaluation: {
        marksAwarded: number;
        maxMarks: number;
        isAutoGraded: boolean;
        feedback?: string;
        gradedBy?: string;
      };
    }>;
  };
  onClose?: () => void;
  showBackButton?: boolean;
}

export function ScorecardView({ data, onClose, showBackButton = false }: ScorecardProps) {
  const [filterType, setFilterType] = useState<"all" | "correct" | "incorrect" | "written">("all");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set((data.questions || []).map((q) => q.id))
  );

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const scores = data.scores || {
    totalMarks: 0,
    maxMarks: data.exam?.totalMarks || 0,
    percentage: 0,
    mcqMarks: 0,
    writtenMarks: 0,
    isGradingComplete: false,
  };

  const percentage = Math.round((scores.percentage || 0) * 10) / 10;
  const isPassed = percentage >= 40;

  const getGradeBadge = (pct: number) => {
    if (pct >= 90) return { label: "Grade A+ (Distinction)", color: "text-emerald-700 bg-emerald-50 border-emerald-300" };
    if (pct >= 80) return { label: "Grade A (Excellent)", color: "text-emerald-700 bg-emerald-50 border-emerald-300" };
    if (pct >= 70) return { label: "Grade B+ (Very Good)", color: "text-blue-700 bg-blue-50 border-blue-300" };
    if (pct >= 60) return { label: "Grade B (Good)", color: "text-blue-700 bg-blue-50 border-blue-300" };
    if (pct >= 50) return { label: "Grade C (Average)", color: "text-amber-700 bg-amber-50 border-amber-300" };
    if (pct >= 40) return { label: "Grade D (Passing)", color: "text-amber-700 bg-amber-50 border-amber-300" };
    return { label: "Grade F (Needs Improvement)", color: "text-rose-700 bg-rose-50 border-rose-300" };
  };

  const grade = getGradeBadge(percentage);

  const filteredQuestions = (data.questions || []).filter((q) => {
    if (filterType === "all") return true;
    if (filterType === "written") return q.type === "written";
    const isCorrect = q.evaluation.marksAwarded >= q.points;
    if (filterType === "correct") return isCorrect;
    if (filterType === "incorrect") return !isCorrect;
    return true;
  });

  return (
    <div className="scorecard-container w-full max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none print:shadow-none">
      {/* Top action toolbar (hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 print:hidden">
        <div className="flex items-center gap-2">
          {showBackButton && onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            >
              ← Back to List
            </button>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Official Examination Scorecard
          </span>
        </div>

        <div className="flex items-center gap-2">
          {data.attemptId && isPassed && (
            <Link
              href={`/portal/certificate/${data.attemptId}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Official Certificate</span>
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Scorecard / PDF</span>
          </button>
          {onClose && !showBackButton && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Certificate / Institute Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase text-emerald-300 border border-white/15">
                  <Building className="w-3 h-3 text-emerald-400" />
                  {data.school?.name || "Institution Examination Board"}
                </span>
                {data.school?.code && (
                  <span className="text-[10px] font-mono font-semibold bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    {data.school.code}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {data.exam.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-0.5 font-medium">
                <span className="flex items-center gap-1 text-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  {data.exam.subject}
                </span>
                <span>•</span>
                <span>Access Code: <strong className="font-mono text-white">{data.exam.accessCode}</strong></span>
                {data.submittedAt && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Submitted: {formatInIST(data.submittedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Score Pill */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto bg-white/10 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-white/15 sm:border-none">
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Final Percentage
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                  {percentage}%
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border mt-1 ${grade.color}`}
              >
                {grade.label}
              </span>
            </div>
          </div>
        </div>

        {/* Candidate Profile Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Candidate Name
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              {data.studentSnapshot.name}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Roll / Admission No
            </span>
            <p className="font-mono font-bold text-slate-900 mt-0.5">
              {data.studentSnapshot.rollNumber}
              {data.studentSnapshot.admissionNumber && (
                <span className="text-slate-500 font-normal text-[11px] block sm:inline sm:ml-1">
                  ({data.studentSnapshot.admissionNumber})
                </span>
              )}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Class & Section
            </span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {data.studentSnapshot.classGrade} – Section {data.studentSnapshot.section}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Evaluation Status
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  scores.isGradingComplete
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-amber-700 bg-amber-50 border-amber-200"
                }`}
              >
                {scores.isGradingComplete ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Grading Complete
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending Teacher Review
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Performance Metrics Cards */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Marks */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Score
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
                {scores.totalMarks}{" "}
                <span className="text-sm font-normal text-slate-400 font-sans">
                  / {scores.maxMarks}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                Total Exam Marks
              </span>
            </div>

            {/* MCQ Score */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Objective (MCQ)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono mt-1">
                {scores.mcqMarks}
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                Auto-Graded Marks
              </span>
            </div>

            {/* Written Score */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Written / Theory
              </span>
              <div className="text-2xl sm:text-3xl font-black text-cyan-700 font-mono mt-1">
                {scores.writtenMarks}
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                Instructor Evaluation
              </span>
            </div>

            {/* Proctoring & Integrity */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Proctoring Record
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {data.violationCount && data.violationCount > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <span className="text-xl sm:text-2xl font-black font-mono">
                      {data.violationCount}
                    </span>
                    <span className="text-xs font-semibold text-amber-600">alerts</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-base sm:text-lg font-bold">Clean</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                Anti-cheating audit
              </span>
            </div>
          </div>

          {/* Question Review Section */}
          {data.questions && data.questions.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Question-by-Question Evaluation Breakdown
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {data.questions.length} questions
                  </span>
                </div>

                {/* Question Filter Tabs (hidden in print) */}
                <div className="flex items-center gap-1 text-xs font-semibold print:hidden">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({data.questions.length})
                  </button>
                  <button
                    onClick={() => setFilterType("correct")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === "correct"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    Correct
                  </button>
                  <button
                    onClick={() => setFilterType("incorrect")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === "incorrect"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Incorrect
                  </button>
                  <button
                    onClick={() => setFilterType("written")}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filterType === "written"
                        ? "bg-cyan-600 text-white"
                        : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                    }`}
                  >
                    Written
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => {
                  const isExpanded = expandedQuestions.has(q.id);
                  const marksAwarded = q.evaluation.marksAwarded;
                  const maxMarks = q.evaluation.maxMarks;
                  const isFullMarks = marksAwarded >= maxMarks && maxMarks > 0;
                  const isZeroOrNegative = marksAwarded <= 0;

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200 bg-white transition-all shadow-2xs overflow-hidden"
                    >
                      {/* Question Header Bar */}
                      <div
                        onClick={() => toggleExpand(q.id)}
                        className="p-4 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer flex items-start sm:items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-900 text-white text-xs font-bold font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-2">
                              {q.type.replace("_", " ")}
                            </span>
                            <span className="text-xs font-medium text-slate-800 line-clamp-1 sm:line-clamp-none">
                              {q.prompt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Marks Pill */}
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                              isFullMarks
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : isZeroOrNegative
                                ? "text-rose-700 bg-rose-50 border-rose-200"
                                : "text-amber-700 bg-amber-50 border-amber-200"
                            }`}
                          >
                            {marksAwarded > 0 ? `+${marksAwarded}` : marksAwarded} / {maxMarks} pts
                          </span>

                          <button className="text-slate-400 hover:text-slate-600 print:hidden">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Question Body */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4 text-xs border-t border-slate-100">
                          {/* Full Question Prompt */}
                          <div className="text-sm font-semibold text-slate-900 leading-relaxed bg-slate-50/40 p-3 rounded-xl border border-slate-150">
                            {q.prompt}
                          </div>

                          {/* Options if choice/true_false */}
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Options & Responses
                              </span>
                              <div className="grid grid-cols-1 gap-2">
                                {q.options.map((opt) => {
                                  const isSelected = q.studentResponse.selectedOptions?.includes(opt.id);
                                  const isCorrect = Array.isArray(q.correctAnswer)
                                    ? q.correctAnswer.includes(opt.id)
                                    : String(q.correctAnswer).toLowerCase() === String(opt.id).toLowerCase();

                                  let borderStyle = "border-slate-200 bg-white";
                                  let badgeLabel = null;

                                  if (isSelected && isCorrect) {
                                    borderStyle = "border-emerald-300 bg-emerald-50/70 text-emerald-900";
                                    badgeLabel = (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Your Answer (Correct)
                                      </span>
                                    );
                                  } else if (isSelected && !isCorrect) {
                                    borderStyle = "border-rose-300 bg-rose-50/70 text-rose-900";
                                    badgeLabel = (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                        Your Answer (Incorrect)
                                      </span>
                                    );
                                  } else if (isCorrect) {
                                    borderStyle = "border-emerald-300 bg-emerald-50/30 text-emerald-900 border-dashed";
                                    badgeLabel = (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        Correct Answer
                                      </span>
                                    );
                                  }

                                  return (
                                    <div
                                      key={opt.id}
                                      className={`flex items-center justify-between p-3 rounded-xl border ${borderStyle} text-xs font-medium`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-mono text-slate-400 font-bold">
                                          {opt.id.toUpperCase()}
                                        </span>
                                        <span>{opt.text}</span>
                                      </div>
                                      {badgeLabel}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Written Question Response & Feedback */}
                          {q.type === "written" && (
                            <div className="space-y-3">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                  Candidate's Written Response
                                </span>
                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                                  {q.studentResponse.writtenAnswer || (
                                    <span className="text-slate-400 italic">No answer provided.</span>
                                  )}
                                </div>
                              </div>

                              {q.evaluation.feedback && (
                                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                                      Instructor Evaluation & Feedback
                                    </span>
                                    {q.evaluation.gradedBy && (
                                      <span className="text-[10px] text-indigo-600 font-medium">
                                        Evaluated by {q.evaluation.gradedBy}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-indigo-950 font-medium">
                                    {q.evaluation.feedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Explanation / Solution Guide */}
                          {q.explanation && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1 text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-emerald-600" />
                                Solution Explanation & Concept
                              </span>
                              <p className="text-xs text-emerald-950 font-medium">
                                {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Certificate Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-4 w-4 object-contain inline" />
            <span className="font-bold text-slate-800">Brainova Olympiad Secure Examination Engine</span>
          </div>
          <span>Official Evaluation Copy • Digitally Authenticated Record</span>
        </div>
      </div>
    </div>
  );
}

