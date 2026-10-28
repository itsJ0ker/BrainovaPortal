"use client";

import React, { useState, useEffect } from "react";
import { IQuestion, IStudentResponse } from "@/types";
import { Bookmark, BookmarkCheck, Check, RotateCcw, CloudCheck, Loader2 } from "lucide-react";

interface QuestionCardProps {
  question: IQuestion;
  index: number;
  totalQuestions: number;
  response?: IStudentResponse;
  isMarked: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  onAnswerChange: (questionId: string, selectedOptions?: string[], writtenAnswer?: string) => void;
  onToggleMarkReview: (questionId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  response,
  isMarked,
  isSaving,
  lastSavedAt,
  onAnswerChange,
  onToggleMarkReview,
  onNext,
  onPrev,
  isFirst,
  isLast,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string[]>(response?.selectedOptions || []);
  const [written, setWritten] = useState<string>(response?.writtenAnswer || "");

  useEffect(() => {
    setSelected(response?.selectedOptions || []);
    setWritten(response?.writtenAnswer || "");
  }, [question.id, response]);

  const handleSelectOption = (optId: string) => {
    if (question.type === "multiple_choice") {
      const next = selected.includes(optId)
        ? selected.filter((id) => id !== optId)
        : [...selected, optId];
      setSelected(next);
      onAnswerChange(question.id, next, written);
    } else {
      const next = [optId];
      setSelected(next);
      onAnswerChange(question.id, next, written);
    }
  };

  const handleWrittenChange = (text: string) => {
    setWritten(text);
    onAnswerChange(question.id, selected, text);
  };

  const handleClearAnswer = () => {
    setSelected([]);
    setWritten("");
    onAnswerChange(question.id, [], "");
  };

  const wordCount = written.trim() ? written.trim().split(/\s+/).length : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-5 sm:p-7 space-y-5 shadow-sm flex flex-col justify-between min-h-[500px]">
      <div className="space-y-4">
        {/* Header: Question Meta & Autosave status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs">
              Q{index + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {question.type.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs font-medium text-emerald-400">
              +{question.points} {question.points === 1 ? "Mark" : "Marks"}
            </span>
            {question.negativePoints ? (
              <span className="text-xs font-medium text-rose-400">
                (-{question.negativePoints})
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave status indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Autosaving...</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Saved</span>
                </>
              ) : null}
            </div>

            {/* Mark for Review Button */}
            <button
              onClick={() => onToggleMarkReview(question.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                isMarked
                  ? "border-amber-600/80 bg-amber-950/40 text-amber-300"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {isMarked ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>{isMarked ? "Marked" : "Review Later"}</span>
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
          {question.prompt}
        </div>

        {/* Options for MCQ / True False */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {question.options.map((opt, optIdx) => {
              const isSelected = selected.includes(opt.id);
              const optLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all active:scale-[0.99] ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/30 text-white shadow-sm shadow-indigo-900/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg font-mono font-semibold text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {optLabel}
                  </div>
                  <span className="flex-1">{opt.text}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Written Subjective Editor */}
        {question.type === "written" && (
          <div className="space-y-2 pt-2">
            <textarea
              rows={8}
              value={written}
              onChange={(e) => handleWrittenChange(e.target.value)}
              placeholder="Type your complete written answer here. Work is saved automatically..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Word Count: {wordCount} words</span>
              <span>Autosaves on pause</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-6">
        <div>
          {(selected.length > 0 || written.trim().length > 0) && (
            <button
              onClick={handleClearAnswer}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Answer</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>

          <button
            onClick={onNext}
            className="rounded-xl bg-indigo-600 px-4.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            {isLast ? "Review & Submit" : "Next Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
