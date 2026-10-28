"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, School, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

export function SchoolLoginBox({
  schoolSlug,
  schoolName,
  hasPasswordSet = true,
}: {
  schoolSlug: string;
  schoolName: string;
  hasPasswordSet?: boolean;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(schoolSlug);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    !hasPasswordSet
      ? "Password not activated yet. Please complete setup via your onboarding invitation link."
      : ""
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter your administrator password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/school/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Authentication failed. Incorrect password.");
        return;
      }

      window.location.href = `/school/${data.schoolSlug}`;
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm space-y-5">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Institutional Access</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sign in with the administrator password configured for <span className="text-slate-900 font-semibold">{schoolName}</span>.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700">
            School ID / Admin Email
          </label>
          <div className="relative mt-1">
            <School className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Administrator Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <span>{isLoading ? "Verifying..." : `Sign In to ${schoolName}`}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
