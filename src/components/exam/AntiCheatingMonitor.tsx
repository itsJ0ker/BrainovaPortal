"use client";

import React, { useEffect, useState, useRef } from "react";
import { AlertTriangle, ShieldAlert, Info, X } from "lucide-react";
import { IAntiCheatingConfig, IntegrityEventType } from "@/types";

interface AntiCheatingMonitorProps {
  config: IAntiCheatingConfig;
  sessionToken: string;
  onAutoSubmitted: () => void;
}

export function AntiCheatingMonitor({
  config,
  sessionToken,
  onAutoSubmitted,
}: AntiCheatingMonitorProps) {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [remainingWarnings, setRemainingWarnings] = useState<number>(config.maxViolations || 3);
  const [showEthicalDisclaimer, setShowEthicalDisclaimer] = useState<boolean>(false);

  // Track recent events to prevent companion event duplication (e.g. visibilitychange + blur)
  const lastEventRef = useRef<{ type: IntegrityEventType; time: number } | null>(null);

  const reportEvent = async (type: IntegrityEventType, details: string) => {
    if (!config.enabled) return;

    const now = Date.now();
    const lastEvent = lastEventRef.current;

    // Suppress companion blur if tab_switch was just reported within 1500ms
    if (lastEvent && now - lastEvent.time < 1500) {
      if (type === "focus_loss" && lastEvent.type === "tab_switch") {
        return;
      }
      if (type === lastEvent.type) {
        return;
      }
    }

    lastEventRef.current = { type, time: now };

    try {
      const res = await fetch("/api/portal/attempt/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ type, details }),
      });

      const data = await res.json();
      if (data.success) {
        setViolationCount(data.violationCount);
        setRemainingWarnings(data.remainingWarnings);

        if (data.autoSubmitted) {
          onAutoSubmitted();
        } else {
          setWarningMessage(details);
        }
      }
    } catch (err) {
      console.error("Integrity report error:", err);
    }
  };

  useEffect(() => {
    if (!config.enabled) return;

    // 1. Visibility change (tab switch, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportEvent("tab_switch", "Warning: Tab switch or window minimization detected.");
      }
    };

    // 2. Window blur (click outside browser, alt-tab)
    const handleBlur = () => {
      reportEvent("focus_loss", "Warning: Focus moved away from the examination window.");
    };

    // 3. Fullscreen changes
    const handleFullscreenChange = () => {
      if (config.enforceFullscreen && !document.fullscreenElement) {
        reportEvent("fullscreen_exit", "Warning: Exited required fullscreen mode.");
      }
    };

    // 4. Clipboard restrictions
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      if (config.blockCopyPaste) {
        e.preventDefault();
        reportEvent("copy_paste_attempt", "Clipboard copy/paste is restricted during this examination.");
      }
    };

    // 5. Right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      if (config.preventContextMenu) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [config, sessionToken]);

  return (
    <>
      {/* Integrity Badge in Exam Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEthicalDisclaimer(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            violationCount > 0
              ? "border-amber-800/80 bg-amber-950/40 text-amber-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
          title="Click to view integrity policy and limitations"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {violationCount === 0
              ? "Integrity Monitored"
              : `Warnings: ${violationCount}/${config.maxViolations}`}
          </span>
          <Info className="w-3 h-3 text-slate-500 ml-0.5" />
        </button>
      </div>

      {/* Warning Alert Modal */}
      {warningMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-amber-600/80 bg-[#140e06] p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-300">Exam Integrity Warning</h3>
                <p className="text-xs text-amber-400/80">
                  {remainingWarnings > 0
                    ? `${remainingWarnings} warning(s) remaining before automatic submission.`
                    : "Final warning reached."}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-3 rounded-xl border border-amber-800/40">
              {warningMessage}
            </p>

            <p className="text-[11px] text-slate-400">
              Please keep this examination window active in the foreground. Avoid navigating away, switching tabs, or pressing prohibited shortcuts.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setWarningMessage(null)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-black transition-colors"
              >
                I Understand & Return to Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ethical Disclaimer Modal */}
      {showEthicalDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c1322] p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Browser Integrity Monitoring Notice</h3>
              </div>
              <button
                onClick={() => setShowEthicalDisclaimer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Deterrence Policy:</strong> Automated browser monitoring deters focus switching, tab navigation, and unauthorized copy-pasting to promote fair assessments.
              </p>
              <p className="text-slate-400">
                <strong>Important Limitation Note:</strong> Client browser restrictions cannot completely prevent all forms of misconduct. Single anomalies (such as an operating system notification or incidental blur) are logged with full context and are not treated as definitive proof of cheating. School administrators review complete logs alongside student responses.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEthicalDisclaimer(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
