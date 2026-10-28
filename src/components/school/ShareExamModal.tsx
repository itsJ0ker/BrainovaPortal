"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Copy, Check, ExternalLink, QrCode, Shield, Clock, Users, Calendar } from "lucide-react";
import { formatInIST } from "@/lib/timezone";
import { IExam } from "@/types";

interface ShareExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: IExam | null;
}

export function ShareExamModal({ isOpen, onClose, exam }: ShareExamModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!exam) return null;

  const examLink = typeof window !== "undefined"
    ? `${window.location.origin}/exam/${exam.accessCode}`
    : `/exam/${exam.accessCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(examLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(exam.accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Examination Link"
      description="Share this test link or access code with eligible candidates. No student login is required—students verify their Roll Number upon opening."
      maxWidth="lg"
    >
      <div className="space-y-4 py-1">
        {/* Exam Summary Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-sm font-bold text-slate-900">{exam.title}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              {exam.config.durationMinutes} Minutes
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              {exam.classGrade || "All Eligible Classes"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              Anti-Cheating {exam.config.antiCheating?.enabled ? "Active" : "Off"}
            </span>
            {exam.config?.startTime && exam.config?.endTime && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Window (IST): {formatInIST(exam.config.startTime)} – {formatInIST(exam.config.endTime)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Access Code Highlight */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Examination Access Code
          </label>
          <div className="mt-1 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
            <span className="font-mono text-xl font-black tracking-widest text-indigo-700">
              {exam.accessCode}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? "Copied" : "Copy Code"}
            </button>
          </div>
        </div>

        {/* Direct Link */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Direct Shareable URL
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={examLink}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none font-mono"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors flex-shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Test Entrance preview */}
        <div className="pt-3 flex justify-between items-center border-t border-slate-100">
          <a
            href={`/exam/${exam.accessCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Open Candidate Test Entrance</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
