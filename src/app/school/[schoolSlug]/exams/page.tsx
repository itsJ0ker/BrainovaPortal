"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShareExamModal } from "@/components/school/ShareExamModal";
import { Badge } from "@/components/ui/Badge";
import { IExam, ISchool } from "@/types";
import { formatInIST } from "@/lib/timezone";
import {
  FileSpreadsheet,
  Plus,
  Share2,
  FileCheck2,
  BarChart2,
  Clock,
  Shield,
  Search,
  Users,
  Filter,
  CheckCircle2,
  Calendar,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

function SchoolExamsContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [school, setSchool] = useState<ISchool | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedShareExam, setSelectedShareExam] = useState<IExam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolRes, examsRes] = await Promise.all([
        fetch(`/api/school/${schoolSlug}/profile`),
        fetch(`/api/school/${schoolSlug}/exams`),
      ]);

      const [schoolData, examsData] = await Promise.all([
        schoolRes.json(),
        examsRes.json(),
      ]);

      if (schoolData.success) setSchool(schoolData.school);
      if (examsData.success) setExams(examsData.exams);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolSlug) fetchData();
  }, [schoolSlug]);

  const filtered = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase()) ||
      e.accessCode.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading && !school) {
    return (
      <div className="py-20 text-center text-slate-500 font-mono text-xs">
        Loading examinations center...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Examinations Center</h1>
          <p className="mt-1 text-xs text-slate-500">
            Author and schedule tests, configure anti-cheating, generate shareable links, and evaluate responses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/school/${schoolSlug}/exams/new`}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exam title, subject, access code..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["all", "published", "draft", "archived"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status === "all" ? `All (${exams.length})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">No examinations found matching your criteria.</p>
            {search && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          filtered.map((exam) => (
            <div
              key={exam._id}
              className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                    {exam.accessCode}
                  </span>
                  <Badge variant={exam.status === "published" ? "success" : "default"}>
                    {exam.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug hover:text-indigo-600 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {exam.subject} · {exam.classGrade || "All Classes"}
                  </p>
                </div>

                {/* Metrics Summary Row */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center text-xs text-slate-600">
                  <div>
                    <span className="block font-black text-slate-900">{exam.config?.durationMinutes || 0}m</span>
                    <span className="text-[10px] text-slate-500 uppercase">Duration</span>
                  </div>
                  <div>
                    <span className="block font-black text-slate-900">{exam.questions?.length || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Questions</span>
                  </div>
                  <div>
                    <span className="block font-black text-slate-900">{exam.stats?.submittedAttempts || 0}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Attempts</span>
                  </div>
                </div>

                {exam.config?.startTime && exam.config?.endTime && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">
                      Window (IST): {formatInIST(exam.config.startTime)}
                    </span>
                  </div>
                )}

                {exam.stats?.pendingGrading > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center justify-between font-medium">
                    <span>Manual grading required</span>
                    <span className="font-bold bg-amber-200/60 px-2 py-0.5 rounded text-[11px]">
                      {exam.stats.pendingGrading} answers
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center gap-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedShareExam(exam)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 py-2 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Share</span>
                </button>

                <Link
                  href={`/school/${schoolSlug}/exams/${exam._id}/invigilation`}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
                  title="Live Invigilation Monitor"
                >
                  <Eye className="w-4 h-4 text-emerald-600" />
                </Link>

                <Link
                  href={`/school/${schoolSlug}/exams/${exam._id}/grading`}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors shadow-sm"
                  title="Manual Grading Studio"
                >
                  <FileCheck2 className="w-4 h-4 text-amber-600" />
                </Link>

                <Link
                  href={`/school/${schoolSlug}/exams/${exam._id}/results`}
                  className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm"
                  title="Results & Analytics"
                >
                  <BarChart2 className="w-4 h-4 text-emerald-600" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <ShareExamModal
        isOpen={Boolean(selectedShareExam)}
        onClose={() => setSelectedShareExam(null)}
        exam={selectedShareExam}
      />
    </div>
  );
}

export default function SchoolExamsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-500 font-mono text-xs">Loading...</div>}>
      <SchoolExamsContent />
    </Suspense>
  );
}
