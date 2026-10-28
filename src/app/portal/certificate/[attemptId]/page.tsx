"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CertificateView } from "@/components/portal/CertificateView";
import { Award, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

function CertificatePageContent() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateData, setCertificateData] = useState<any | null>(null);

  useEffect(() => {
    if (!attemptId) return;

    const fetchCertificate = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/portal/certificate/${encodeURIComponent(attemptId)}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Certificate record not available.");
        } else {
          setCertificateData(data.certificate);
        }
      } catch (err: any) {
        setError(err.message || "Network error loading certificate.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificate();
  }, [attemptId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
        <span className="font-semibold">Retrieving verified academic certificate...</span>
      </div>
    );
  }

  if (error || !certificateData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-7 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Certificate Unavailable</h2>
          <p className="text-xs text-slate-500">
            {error || "The requested certificate is either not published yet or could not be found."}
          </p>
          <div className="pt-2">
            <Link
              href="/portal?tab=history"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 flex flex-col items-center justify-center">
      <CertificateView
        certificate={certificateData}
        showBackButton={true}
        onClose={() => router.push(`/portal/results?attemptId=${attemptId}`)}
      />
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs text-slate-400">Loading certificate...</div>}>
      <CertificatePageContent />
    </Suspense>
  );
}

