"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { ISchool } from "@/types";
import { Building, Mail, Phone, MapPin, Clock, Shield, CheckCircle2, Save, Lock, AlertCircle, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

function SchoolSettingsContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [school, setSchool] = useState<ISchool | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [defaultDuration, setDefaultDuration] = useState("60");
  const [antiCheatingDefault, setAntiCheatingDefault] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    async function loadSchool() {
      try {
        const res = await fetch(`/api/school/${schoolSlug}/profile`);
        const data = await res.json();
        if (data.success) {
          const s = data.school;
          setSchool(s);
          setName(s.name);
          setContactEmail(s.contactEmail);
          setContactPhone(s.contactPhone || "");
          setAddress(s.address || "");
          setDefaultDuration(String(s.settings?.defaultExamDuration || 60));
          setAntiCheatingDefault(s.settings?.enableAntiCheatingByDefault ?? true);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSchool();
  }, [schoolSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage("Password must be at least 6 characters.");
        setIsSaving(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        setIsSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/school/${schoolSlug}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactEmail,
          contactPhone,
          address,
          newPassword: newPassword ? newPassword : undefined,
          settings: {
            defaultExamDuration: Number(defaultDuration),
            enableAntiCheatingByDefault: antiCheatingDefault,
          },
          onboardingStatus: "completed",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage("Settings and credentials saved successfully.");
        setSchool(data.school);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!school) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Settings className="w-3.5 h-3.5" />
              Workspace Preferences
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">
              {school.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            School Profile & Preferences
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Configure institutional details, default exam parameters, and anti-cheating preferences for this tenant workspace.
          </p>
        </div>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Institutional Information
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-700">School Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Contact Email</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Campus Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Default Exam Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Default Exam Duration</label>
                <span className="text-xs font-bold text-indigo-600">{defaultDuration} Mins</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[15, 30, 45, 60, 90, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDefaultDuration(String(mins))}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      Number(defaultDuration) === mins
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Custom:</span>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
                <span className="text-xs text-slate-500">minutes</span>
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={antiCheatingDefault}
                  onChange={(e) => setAntiCheatingDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium">Enable Anti-Cheating by default for new exams</span>
              </label>
            </div>
          </div>
        </div>

        {/* Security & Direct Password Section */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Security & Administrator Password Credentials</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update the administrator password used to log directly into this school workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">New Administrator Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SchoolSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <SchoolSettingsContent />
    </Suspense>
  );
}
