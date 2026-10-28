"use client";

import React from "react";
import {
  Award,
  Printer,
  CheckCircle2,
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
  QrCode,
  ShieldCheck,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { formatInIST } from "@/lib/timezone";

export interface CertificateData {
  certificateId: string;
  verificationHash?: string;
  attemptId: string;
  issuedAt: string;
  student: {
    name: string;
    rollNumber: string;
    admissionNumber: string;
    classGrade: string;
    section: string;
  };
  school: {
    name: string;
    code: string;
    logo?: string;
  };
  exam: {
    title: string;
    subject: string;
    accessCode: string;
    totalQuestions: number;
  };
  scores: {
    totalMarks: number;
    maxMarks: number;
    percentage: number;
  };
  distinction: string;
  badgeTier: "gold" | "silver" | "bronze" | "standard";
}

export function CertificateView({
  certificate,
  onClose,
  showBackButton = false,
}: {
  certificate: CertificateData;
  onClose?: () => void;
  showBackButton?: boolean;
}) {
  const handlePrint = () => {
    window.print();
  };

  const getTierColor = (tier: string) => {
    if (tier === "gold") return "from-amber-400 via-yellow-200 to-amber-500 text-amber-950 border-amber-300";
    if (tier === "silver") return "from-slate-200 via-slate-100 to-slate-300 text-slate-800 border-slate-300";
    return "from-amber-600 via-amber-100 to-amber-700 text-amber-950 border-amber-400";
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 print:m-0 print:p-0 print:max-w-none">
      {/* Top action toolbar (hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 print:hidden">
        <div className="flex items-center gap-2">
          {showBackButton && onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Brainova Olympiad Official Credential
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Sheet (Landscape Aspect Ratio) */}
      <div className="certificate-sheet relative bg-white border-8 border-amber-600/80 p-3 sm:p-5 rounded-3xl shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:p-8">
        {/* Inner Gold Foil Frame */}
        <div className="relative border-4 border-slate-900 p-6 sm:p-10 rounded-2xl bg-gradient-to-b from-amber-50/20 via-white to-amber-50/30 text-center space-y-6">
          {/* Subtle Watermark Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <img src="/logobrainova.png" alt="" className="w-96 h-96 object-contain" />
          </div>

          {/* Top Header & Emblem */}
          <div className="space-y-2 relative z-10">
            <div className="flex items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-white border-2 border-amber-500 p-1.5 shadow-sm overflow-hidden flex items-center justify-center">
                <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xs sm:text-sm font-black tracking-[0.3em] uppercase text-amber-700 font-mono">
                Brainova Olympiad Foundation
              </h2>
              <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-slate-900 uppercase">
                Certificate of Merit
              </h1>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Official Credential & Academic Distinction
              </p>
            </div>
          </div>

          {/* Certificate Body Text */}
          <div className="space-y-4 max-w-2xl mx-auto relative z-10">
            <p className="text-xs italic text-slate-500">This is proudly presented to</p>

            <div className="border-b-2 border-slate-900 pb-2 max-w-lg mx-auto">
              <span className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-wide">
                {certificate.student.name}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
              of <strong className="text-slate-900">{certificate.school.name}</strong> (Roll:{" "}
              <span className="font-mono font-semibold">{certificate.student.rollNumber}</span>) for exemplary
              academic performance in the{" "}
              <strong className="text-slate-900">{certificate.exam.title}</strong> examination in{" "}
              <strong className="text-indigo-900">{certificate.exam.subject}</strong> conducted under certified
              secure examination protocols.
            </p>
          </div>

          {/* Honor Badge & Score Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-2 relative z-10">
            <div
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl border bg-gradient-to-r shadow-xs text-xs font-bold uppercase tracking-wider ${getTierColor(
                certificate.badgeTier
              )}`}
            >
              <Award className="w-4 h-4" />
              <span>{certificate.distinction}</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs font-mono">
              <span>Score:</span>
              <span className="text-indigo-600 font-black">
                {certificate.scores.totalMarks} / {certificate.scores.maxMarks}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-emerald-700">{certificate.scores.percentage}%</span>
            </div>
          </div>

          {/* Signatures & Security Seal Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-6 pt-6 border-t border-slate-200/80 text-center relative z-10">
            {/* Signature 1 */}
            <div className="space-y-1">
              <div className="h-9 flex items-center justify-center font-serif italic text-lg text-slate-800">
                Dr. Eleanor Vance
              </div>
              <div className="border-t border-slate-400 pt-1 text-[10px] uppercase font-bold text-slate-500">
                Academic Board Chairman
              </div>
            </div>

            {/* Official Center Verification Seal */}
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-600 bg-amber-50 flex items-center justify-center text-amber-700">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Verified Credential
              </div>
              <span className="text-[9px] font-mono font-semibold text-slate-400">
                ID: {certificate.certificateId}
              </span>
              {certificate.verificationHash && (
                <span className="text-[8px] font-mono text-slate-400">
                  Hash: {certificate.verificationHash}
                </span>
              )}
            </div>

            {/* Signature 2 */}
            <div className="space-y-1">
              <div className="h-9 flex items-center justify-center font-serif italic text-lg text-slate-800">
                Arthur Pendelton
              </div>
              <div className="border-t border-slate-400 pt-1 text-[10px] uppercase font-bold text-slate-500">
                Controller of Examinations
              </div>
            </div>
          </div>

          {/* Certificate Timestamp */}
          <div className="text-[10px] text-slate-400 font-mono pt-1 relative z-10 flex items-center justify-between">
            <span>Brainova Olympiad Examination Platform</span>
            <span>Issued on {formatInIST(certificate.issuedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

