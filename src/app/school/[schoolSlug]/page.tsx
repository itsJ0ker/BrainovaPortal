import React from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  Users,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  GraduationCap,
  Sparkles,
  Settings,
  Building,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchoolDashboardPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await connectDB();

  const schoolRaw = await School.findOne({ slug: schoolSlug }).lean();
  if (!schoolRaw) {
    notFound();
  }
  const school = JSON.parse(JSON.stringify(schoolRaw));

  const [
    totalStudents,
    totalExams,
    publishedExams,
    totalAttempts,
    pendingGradingCount,
    recentExamsRaw,
  ] = await Promise.all([
    Student.countDocuments({ schoolId: school._id }),
    Exam.countDocuments({ schoolId: school._id }),
    Exam.countDocuments({ schoolId: school._id, status: "published" }),
    ExamAttempt.countDocuments({ schoolId: school._id }),
    ExamAttempt.countDocuments({
      schoolId: school._id,
      status: { $in: ["submitted", "auto_submitted"] },
      "scores.isGradingComplete": false,
    }),
    Exam.find({ schoolId: school._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const recentExams = JSON.parse(JSON.stringify(recentExamsRaw));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-sm p-1.5 flex-shrink-0 overflow-hidden">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {school.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                {school.code}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Brainova Olympiad Institutional Dashboard • Author and schedule examinations, manage student rosters, grade written answers, and track candidate evaluations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Link
            href={`/school/${school.slug}/exams/new`}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{totalStudents}</span>
            <p className="mt-1 text-xs text-slate-500">Active enrolled candidates</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Exams</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{publishedExams}</span>
            <p className="mt-1 text-xs text-slate-500">{totalExams} total exams created</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900">{totalAttempts}</span>
            <p className="mt-1 text-xs text-slate-500">Candidate completed attempts</p>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Manual Grading</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-900">{pendingGradingCount}</span>
            <p className="mt-1 text-xs text-amber-700">Pending written answers</p>
          </div>
        </div>
      </div>

      {/* Main Content: Recent Exams & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Examinations Table Card (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Examinations</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recently scheduled and published tests</p>
            </div>
            <Link
              href={`/school/${school.slug}/exams`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentExams.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">No exams authored yet.</p>
                <Link
                  href={`/school/${school.slug}/exams/new`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Launch your first examination</span>
                </Link>
              </div>
            ) : (
              recentExams.map((exam: any) => (
                <div key={exam._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/school/${school.slug}/exams`}
                        className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {exam.title}
                      </Link>
                      <Badge variant={exam.status === "published" ? "success" : "default"}>
                        {exam.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                        {exam.accessCode}
                      </span>
                      <span>•</span>
                      <span>{exam.subject}</span>
                      <span>•</span>
                      <span>{exam.classGrade || "All Classes"}</span>
                      <span>•</span>
                      <span>{exam.config.durationMinutes} mins</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Link
                      href={`/school/${school.slug}/exams/${exam._id}/results`}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                    >
                      Results & Stats
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Management Shortcuts (1 Col) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Quick Shortcuts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Frequently used workspace modules</p>
          </div>

          <div className="space-y-2.5">
            <Link
              href={`/school/${school.slug}/exams/new`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Create Online Exam</span>
                  <span className="text-[11px] text-slate-500">Configure questions, timer & security</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={`/school/${school.slug}/students`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Student Directory</span>
                  <span className="text-[11px] text-slate-500">Import Excel, register, or filter</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={`/school/${school.slug}/academic`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Academic Curriculum</span>
                  <span className="text-[11px] text-slate-500">Grades, subjects & section cohorts</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={`/school/${school.slug}/settings`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">School Settings</span>
                  <span className="text-[11px] text-slate-500">Credentials, profile & defaults</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
