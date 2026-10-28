"use client";

import React from "react";
import { IQuestion, IStudentResponse } from "@/types";

interface QuestionPaletteProps {
  questions: IQuestion[];
  currentIndex: number;
  responses: IStudentResponse[];
  markedForReview: Set<string>;
  onSelectQuestion: (index: number) => void;
}

export function QuestionPalette({
  questions,
  currentIndex,
  responses,
  markedForReview,
  onSelectQuestion,
}: QuestionPaletteProps) {
  const answeredSet = new Set(
    responses
      .filter(
        (r) =>
          (r.selectedOptions && r.selectedOptions.length > 0) ||
          (r.writtenAnswer && r.writtenAnswer.trim().length > 0)
      )
      .map((r) => r.questionId)
  );

  const answeredCount = answeredSet.size;
  const markedCount = markedForReview.size;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-4.5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Question Navigator
        </h3>
        <span className="text-[11px] font-mono text-cyan-400">
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Grid of question buttons */}
      <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = answeredSet.has(q.id);
          const isMarked = markedForReview.has(q.id);

          let bgClass = "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700";
          if (isMarked) {
            bgClass = "bg-amber-950/60 border-amber-600/70 text-amber-300 font-semibold";
          } else if (isAnswered) {
            bgClass = "bg-emerald-950/60 border-emerald-600/70 text-emerald-300 font-semibold";
          }

          const ringClass = isCurrent ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0c1322]" : "";

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(idx)}
              className={`h-9 rounded-xl border flex items-center justify-center text-xs font-mono transition-all active:scale-95 ${bgClass} ${ringClass}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="border-t border-slate-800/80 pt-3 space-y-2 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Answered</span>
          </div>
          <span className="font-mono font-bold text-slate-200">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Marked for Review</span>
          </div>
          <span className="font-mono font-bold text-slate-200">{markedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span>Unanswered</span>
          </div>
          <span className="font-mono font-bold text-slate-200">{unansweredCount}</span>
        </div>
      </div>
    </div>
  );
}
