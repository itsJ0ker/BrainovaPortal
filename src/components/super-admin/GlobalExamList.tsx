"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatInIST } from "@/lib/timezone";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  Clock,
  Shield,
  Eye,
  FileCheck2,
  GraduationCap,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Globe,
  Award,
  Users,
} from "lucide-react";

interface GlobalExamListProps {
  exams: any[];
  schools: any[];
  metrics?: any;
  isLoading: boolean;
  onRefresh: () => void;
  onCreateExam: () => void;
}

export function GlobalExamList({
  exams,
  schools,
  metrics,
  isLoading,
  onRefresh,
  onCreateExam,
}: GlobalExamListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [updatingExamId, setUpdatingExamId] = useState<string | null>(null);

  const handleCopyLink = (accessCode: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/exam/${accessCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(accessCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (examId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    setUpdatingExamId(examId);
    try {
      const res = await fetch(`/api/super-admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingExamId(null);
    }
  };

  const handleToggleResults = async (examId: string, currentPublished: boolean) => {
    setUpdatingExamId(examId);
    try {
      const res = await fetch(`/api/super-admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResultsPublished: !currentPublished }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingExamId(null);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete or archive '${title}'?`)) {
      return;
    }
    setUpdatingExamId(examId);
    try {
      const res = await fetch(`/api/super-admin/exams/${examId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingExamId(null);
    }
  };

  // Client-side filtering
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // School filter
      if (selectedSchoolId !== "all") {
        const matchesSchool =
          exam.schoolId?._id?.toString() === selectedSchoolId ||
          exam.participatingSchoolIds?.some((s: any) => s._id?.toString() === selectedSchoolId);
        if (!matchesSchool) return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "ongoing") {
          if (!exam.stats?.isCurrentlyOngoing) return false;
        } else if (exam.status !== selectedStatus) {
          return false;
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = exam.title?.toLowerCase().includes(query);
        const matchesCode = exam.accessCode?.toLowerCase().includes(query);
        const matchesSubject = exam.subject?.toLowerCase().includes(query);
        const matchesGrade = exam.classGrade?.toLowerCase().includes(query);
        const matchesSchoolName =
          exam.schoolId?.name?.toLowerCase().includes(query) ||
          exam.participatingSchoolIds?.some((s: any) => s.name?.toLowerCase().includes(query));

        if (!matchesTitle && !matchesCode && !matchesSubject && !matchesGrade && !matchesSchoolName) {
          return false;
        }
      }

      return true;
    });
  }, [exams, selectedSchoolId, selectedStatus, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Platform Exams</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics?.totalExams ?? exams.length}</p>
          <span className="text-[10px] text-slate-400 font-medium">Across all participating schools</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Live / Ongoing</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {metrics?.ongoingCount ?? exams.filter((e) => e.stats?.isCurrentlyOngoing).length}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">Testing windows open right now</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Total Candidates</span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {metrics?.totalPlatformAttempts ??
              exams.reduce((sum, e) => sum + (e.stats?.totalAttempts || 0), 0)}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Lifetime test sessions attempted</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Published Exams</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {metrics?.publishedCount ?? exams.filter((e) => e.status === "published").length}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Ready for candidate participation</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by exam title, access code (e.g. OLYMP-2026), subject, or school name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* School Filter */}
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Institutions ({schools.length})</option>
            {schools.map((school) => (
              <option key={school._id} value={school._id}>
                {school.name} ({school.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="ongoing">Live / Ongoing</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={onCreateExam}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create National Exam</span>
          </button>
        </div>
      </div>

      {/* Exams Roster */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold rounded-2xl bg-white border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading examination records across platform...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Examinations Match Your Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or create a new National Olympiad contest for partner institutions.
          </p>
          <button
            onClick={onCreateExam}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First National Exam</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExams.map((exam) => {
            const isPlatformExam =
              exam.isPlatformExam || (exam.participatingSchoolIds && exam.participatingSchoolIds.length > 1);
            const primarySchool = exam.schoolId || exam.participatingSchoolIds?.[0];
            const schoolSlug = primarySchool?.slug || "portal";

            return (
              <div
                key={exam._id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 tracking-tight">{exam.title}</h4>

                      {/* Status Badges */}
                      {exam.stats?.isCurrentlyOngoing ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Now
                        </span>
                      ) : (
                        <Badge
                          variant={
                            exam.status === "published"
                              ? "success"
                              : exam.status === "draft"
                              ? "warning"
                              : "default"
                          }
                        >
                          {exam.status.toUpperCase()}
                        </Badge>
                      )}

                      {/* Results status badge */}
                      {exam.isResultsPublished ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Results Released
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Results Shielded
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="font-bold text-slate-800">{exam.subject}</span>
                      <span>•</span>
                      <span>{exam.classGrade || "All Grades"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {exam.config?.durationMinutes || 60} mins
                      </span>
                      <span>•</span>
                      <span>{exam.questions?.length || 0} Questions</span>
                    </div>
                  </div>

                  {/* Access Code & Link Copy */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopyLink(exam.accessCode)}
                      title="Copy Student Exam Direct Link"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-bold transition-colors cursor-pointer"
                    >
                      {copiedCode === exam.accessCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Code: {exam.accessCode}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Institutions & Schedule Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
                  {/* Participating Schools */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                      Assigned Institutions
                    </span>
                    {isPlatformExam ? (
                      <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span>National / Multi-School</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full">
                          {exam.participatingSchoolIds?.length || schools.length} Schools
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{primarySchool?.name || "Single Institution"}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({primarySchool?.code})</span>
                      </div>
                    )}
                  </div>

                  {/* Testing Window */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                      Contest Window (IST)
                    </span>
                    <span className="text-slate-700 font-mono text-[11px] block truncate">
                      {formatInIST(exam.config?.startTime)} — {formatInIST(exam.config?.endTime)}
                    </span>
                  </div>

                  {/* Candidate Metrics */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">
                      Candidate Activity
                    </span>
                    <div className="flex items-center gap-3 font-semibold text-slate-800">
                      <span>👥 {exam.stats?.totalAttempts || 0} Started</span>
                      <span>✅ {exam.stats?.submittedAttempts || 0} Submitted</span>
                      {exam.stats?.flaggedAttempts > 0 && (
                        <span className="text-rose-600 font-bold">⚠️ {exam.stats.flaggedAttempts} Flags</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {/* Gateways to School Consoles */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/school/${schoolSlug}/exams/${exam._id}/invigilation`}
                      target="_blank"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Invigilation</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>

                    <Link
                      href={`/school/${schoolSlug}/exams/${exam._id}/results`}
                      target="_blank"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      <span>Results & Scorecards</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>

                    <Link
                      href={`/school/${schoolSlug}/exams/${exam._id}/grading`}
                      target="_blank"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Written Grading</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  </div>

                  {/* Super Admin Control Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Results Release */}
                    <button
                      onClick={() => handleToggleResults(exam._id, exam.isResultsPublished)}
                      disabled={updatingExamId === exam._id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                        exam.isResultsPublished
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                      }`}
                    >
                      {exam.isResultsPublished ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Shield Results</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Release Results</span>
                        </>
                      )}
                    </button>

                    {/* Toggle Status (Draft vs Published) */}
                    <button
                      onClick={() => handleToggleStatus(exam._id, exam.status)}
                      disabled={updatingExamId === exam._id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                        exam.status === "published"
                          ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {exam.status === "published" ? "Unpublish" : "Publish"}
                    </button>

                    {/* Delete / Archive */}
                    <button
                      onClick={() => handleDeleteExam(exam._id, exam.title)}
                      disabled={updatingExamId === exam._id}
                      title="Archive or Delete Exam"
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

