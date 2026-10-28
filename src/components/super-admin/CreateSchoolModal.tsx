"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Building2, Mail, Hash, Phone, MapPin, Copy, Check } from "lucide-react";

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolCreated: () => void;
}

export function CreateSchoolModal({ isOpen, onClose, onSchoolCreated }: CreateSchoolModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [duration, setDuration] = useState("60");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          adminEmail,
          contactPhone,
          address,
          defaultExamDuration: Number(duration),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create school.");
        return;
      }

      setInviteLink(window.location.origin + data.inviteLink);
      onSchoolCreated();
    } catch (err: any) {
      setError(err.message || "Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setName("");
    setCode("");
    setAdminEmail("");
    setContactPhone("");
    setAddress("");
    setInviteLink("");
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={inviteLink ? "School Onboarding Link Ready" : "Register Partner School"}
      description={
        inviteLink
          ? "Share this secure invitation link with the school administrator to complete profile onboarding."
          : "Create an isolated multi-tenant workspace and invite the institution administrator."
      }
      maxWidth="lg"
    >
      {inviteLink ? (
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-xs font-medium">
            School created successfully! An isolated database partition and invitation token have been generated.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Admin Invitation URL</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleReset}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700">Institution Name</label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    const generated = e.target.value
                      .replace(/[^a-zA-Z]/g, "")
                      .slice(0, 3)
                      .toUpperCase();
                    if (generated) setCode(`${generated}-01`);
                  }
                }}
                placeholder="e.g. Cambridge Science College"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">School Code (Unique)</label>
                <button
                  type="button"
                  onClick={() => {
                    const prefix = name
                      ? name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase()
                      : "SCH";
                    setCode(`${prefix || "SCH"}-${Math.floor(100 + Math.random() * 900)}`);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold"
                >
                  ⚡ Auto-Gen
                </button>
              </div>
              <div className="relative mt-1">
                <Hash className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CSC-01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 uppercase font-mono focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Default Exam Duration</label>
                <span className="text-[10px] text-indigo-600 font-bold">{duration}m</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {[30, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(String(mins))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      Number(duration) === mins
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Admin Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@school.edu"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Contact Phone (Optional)</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Campus Address</label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, State, Country"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? "Creating School..." : "Create & Generate Invite"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
