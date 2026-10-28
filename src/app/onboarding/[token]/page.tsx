"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

function OnboardingContent() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [inviteData, setInviteData] = useState<any>(null);
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [duration, setDuration] = useState("60");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`/api/onboarding/${token}`);
        const data = await res.json();
        if (data.success) {
          setInviteData(data.invite);
          setPhone(data.invite.school?.contactPhone || "");
          setAddress(data.invite.school?.address || "");
        } else {
          setError(data.error || "Invalid invitation link.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invitation.");
      } finally {
        setIsLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminName: adminName.trim(),
          password,
          contactPhone: phone.trim(),
          address: address.trim(),
          defaultExamDuration: Number(duration),
        }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = `/school/${data.schoolSlug}`;
      } else {
        setError(data.error || "Onboarding failed.");
      }
    } catch (err: any) {
      setError(err.message || "Error submitting form.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400 font-mono text-xs">
        Validating institutional invitation...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Institutional Administrator Onboarding
          </h1>
          <p className="text-xs text-slate-400">
            Activate your school workspace and set your direct administrator password.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#0c1322] p-7 shadow-2xl space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {inviteData && (
            <>
              {/* School Badge Card */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                    Invited Institution
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                    {inviteData?.school?.code}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{inviteData?.school?.name}</h3>
                <p className="text-xs text-slate-400">
                  Registered Admin Login: <span className="text-slate-200 font-medium">{inviteData?.email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Admin Name */}
                <div>
                  <label className="text-xs font-medium text-slate-300">Administrator Full Name</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Dr. Eleanor Vance"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Create Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-10 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Confirm Password</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="text-xs font-medium text-slate-300">Campus Contact Phone</label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Campus Address */}
                <div>
                  <label className="text-xs font-medium text-slate-300">Campus Address</label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 100 University Ave, Cambridge, MA"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Duration Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Default Exam Duration: <span className="text-indigo-400 font-bold">{duration}m</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Preset:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(String(mins))}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          Number(duration) === mins
                            ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                            : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? "Activating..."
                      : "Activate Password & Open School Workspace"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
