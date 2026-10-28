"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "@/components/exam/Timer";
import { QuestionPalette } from "@/components/exam/QuestionPalette";
import { AntiCheatingMonitor } from "@/components/exam/AntiCheatingMonitor";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { Modal } from "@/components/ui/Modal";
import { IQuestion, IStudentResponse } from "@/types";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Award,
  ArrowRight,
  Bookmark,
  Shield,
  HelpCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function ExamRunnerContent() {
  const router = useRouter();

  const [sessionToken, setSessionToken] = useState<string>("");
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [responses, setResponses] = useState<IStudentResponse[]>([]);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session from sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem("exam_session_token");
    const examDataStr = sessionStorage.getItem("exam_data");
    const studentDataStr = sessionStorage.getItem("student_data");
    const attemptDataStr = sessionStorage.getItem("attempt_data");

    if (!token || !examDataStr) {
      router.push("/portal");
      return;
    }

    setSessionToken(token);
    const parsedExam = JSON.parse(examDataStr);
    const parsedStudent = studentDataStr ? JSON.parse(studentDataStr) : null;
    const parsedAttempt = attemptDataStr ? JSON.parse(attemptDataStr) : null;

    setExam(parsedExam);
    setStudent(parsedStudent);
    setAttempt(parsedAttempt);

    if (parsedAttempt?.responses) {
      setResponses(parsedAttempt.responses);
    }
  }, [router]);

  // Handle Answer Changes with Debounced Autosave
  const handleAnswerChange = useCallback(
    (questionId: string, selectedOptions?: string[], writtenAnswer?: string) => {
      setResponses((prev) => {
        const existingIdx = prev.findIndex((r) => r.questionId === questionId);
        const updated: IStudentResponse = {
          questionId,
          selectedOptions: selectedOptions || [],
          writtenAnswer: writtenAnswer !== undefined ? writtenAnswer : "",
          answeredAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = updated;
          return next;
        } else {
          return [...prev, updated];
        }
      });

      // Clear any pending autosave debounce
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      setIsSaving(true);
      autosaveTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              questionId,
              selectedOptions,
              writtenAnswer,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setLastSavedAt(data.savedAt || new Date().toISOString());
          }
        } catch (err) {
          console.error("Autosave error:", err);
        } finally {
          setIsSaving(false);
        }
      }, 600);
    },
    [sessionToken]
  );

  const toggleMarkReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/portal/attempt/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedData(data);
        sessionStorage.removeItem("exam_session_token");
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
    }
  };

  const handleTimeExpired = () => {
    handleFinalSubmit();
  };

  const handleAutoSubmitted = () => {
    handleFinalSubmit();
  };

  if (!exam || !attempt) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 font-mono text-xs">
        Loading secure exam session...
      </div>
    );
  }

  // Submission Completed View
  if (submittedData) {
    const scores = submittedData.scores;

    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0c1322] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Exam Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-400">
              Candidate: <span className="text-white font-medium">{student?.name}</span> ({student?.rollNumber})
            </p>
          </div>

          {scores ? (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Instant Auto-Graded Score
              </span>
              <div className="text-4xl font-extrabold text-white font-mono">
                {scores.totalMarks} <span className="text-lg text-slate-400 font-sans font-normal">/ {scores.maxMarks}</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400">
                {scores.percentage}% Overall Score
              </div>
              {!scores.isGradingComplete && (
                <p className="text-[11px] text-amber-300/80">
                  Written questions are pending review by your course instructor.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 leading-relaxed">
              Your responses have been transmitted and safely locked on the server. Your institution will release final scorecards once evaluation concludes.
            </div>
          )}

          <div className="pt-2 space-y-2">
            {submittedData.attemptId && (
              <button
                onClick={() => router.push(`/portal/results?attemptId=${submittedData.attemptId}`)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Award className="w-4 h-4" />
                <span>View Official Scorecard & Solution Key</span>
              </button>
            )}

            <button
              onClick={() =>
                router.push(
                  `/portal?tab=history&roll=${encodeURIComponent(student?.rollNumber || "")}`
                )
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <span>View My Complete Test History</span>
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
            >
              Return to Platform Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion: IQuestion = exam.questions[currentIndex];
  const currentResponse = responses.find((r) => r.questionId === currentQuestion.id);
  const isCurrentMarked = markedForReview.has(currentQuestion.id);

  const answeredCount = responses.filter(
    (r) =>
      (r.selectedOptions && r.selectedOptions.length > 0) ||
      (r.writtenAnswer && r.writtenAnswer.trim().length > 0)
  ).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans select-none">
      {/* Test Runner Top Bar */}
      <header className="border-b border-slate-800 bg-[#090f1d] px-4 py-3 sm:px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          {/* Left: Exam Info & Candidate */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
              <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">{exam.title}</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-mono text-cyan-400">{exam.subject}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Candidate: <span className="text-slate-200 font-medium">{student?.name}</span> (Roll: {student?.rollNumber})
              </div>
            </div>
          </div>

          {/* Right: Anti-Cheating + Live Timer + Submit */}
          <div className="flex items-center gap-3">
            <AntiCheatingMonitor
              config={exam.antiCheating}
              sessionToken={sessionToken}
              onAutoSubmitted={handleAutoSubmitted}
            />

            <Timer
              serverDeadline={attempt.serverDeadline}
              onTimeExpired={handleTimeExpired}
            />

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Examination View */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Question Area (3 Cols) */}
        <div className="lg:col-span-3">
          <QuestionCard
            question={currentQuestion}
            index={currentIndex}
            totalQuestions={exam.questions.length}
            response={currentResponse}
            isMarked={isCurrentMarked}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            onAnswerChange={handleAnswerChange}
            onToggleMarkReview={toggleMarkReview}
            onNext={() => {
              if (currentIndex < exam.questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
              } else {
                setIsSubmitModalOpen(true);
              }
            }}
            onPrev={() => {
              if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
            }}
            isFirst={currentIndex === 0}
            isLast={currentIndex === exam.questions.length - 1}
          />
        </div>

        {/* Sidebar Palette (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <QuestionPalette
            questions={exam.questions}
            currentIndex={currentIndex}
            responses={responses}
            markedForReview={markedForReview}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
          />

          <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-4 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Anti-Cheating Safeguards</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Do not switch tabs, minimize your browser, or exit fullscreen mode. Real-time integrity events are logged.
            </p>
          </div>
        </div>
      </main>

      {/* Review & Submit Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Confirm Examination Submission"
        description="Please review your attempt summary before final submission. Once confirmed, answers cannot be edited."
        maxWidth="md"
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl border border-emerald-800/60 bg-emerald-950/30">
              <span className="block text-xl font-bold font-mono text-emerald-400">
                {answeredCount}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                Answered
              </span>
            </div>

            <div className="p-3 rounded-xl border border-amber-800/60 bg-amber-950/30">
              <span className="block text-xl font-bold font-mono text-amber-400">
                {markedForReview.size}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                Marked
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
              <span className="block text-xl font-bold font-mono text-slate-400">
                {Math.max(0, exam.questions.length - answeredCount)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Unanswered
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 text-center">
            Are you sure you want to finish and submit your exam now?
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Resume Answering
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ExamRunnerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14]" />}>
      <ExamRunnerContent />
    </Suspense>
  );
}
