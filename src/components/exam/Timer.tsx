"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerProps {
  serverDeadline: string; // ISO string
  onTimeExpired: () => void;
}

export function Timer({ serverDeadline, onTimeExpired }: TimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const deadline = new Date(serverDeadline).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      return diff;
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const rem = calculateRemaining();
      setSecondsRemaining(rem);

      if (rem <= 0) {
        clearInterval(interval);
        onTimeExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [serverDeadline, onTimeExpired]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const isLowTime = secondsRemaining <= 300; // <= 5 minutes
  const isCritical = secondsRemaining <= 60;  // <= 1 minute

  const formattedTime = `${hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold border transition-colors shadow-sm ${
        isCritical
          ? "border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse"
          : isLowTime
          ? "border-amber-500/80 bg-amber-950/50 text-amber-300"
          : "border-slate-800 bg-slate-900/90 text-cyan-300"
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
      )}
      <span>{formattedTime}</span>
    </div>
  );
}
