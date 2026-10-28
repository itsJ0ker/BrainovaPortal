import React from "react";
import { Building2, Users, FileSpreadsheet, CheckCircle2, TrendingUp } from "lucide-react";

interface MetricsProps {
  metrics: {
    totalSchools: number;
    activeSchools: number;
    suspendedSchools: number;
    totalStudents: number;
    totalExams: number;
    publishedExams: number;
    totalAttempts: number;
    submittedAttempts: number;
    averageScore: number;
    activeSessionsNow: number;
  };
}

export function PlatformMetrics({ metrics }: MetricsProps) {
  const cards = [
    {
      label: "Partner Institutions",
      value: metrics.totalSchools,
      subtext: `${metrics.activeSchools} active · ${metrics.suspendedSchools} suspended`,
      icon: Building2,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-100",
    },
    {
      label: "Students Enrolled",
      value: metrics.totalStudents,
      subtext: "Across isolated tenant workspaces",
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-100",
    },
    {
      label: "Platform Examinations",
      value: metrics.totalExams,
      subtext: `${metrics.publishedExams} active or scheduled tests`,
      icon: FileSpreadsheet,
      color: "text-cyan-600",
      bg: "bg-cyan-50 border-cyan-100",
    },
    {
      label: "Candidate Submissions",
      value: metrics.submittedAttempts,
      subtext: `${metrics.activeSessionsNow} live in-progress attempts`,
      icon: CheckCircle2,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-100",
    },
    {
      label: "Platform Average Score",
      value: `${metrics.averageScore}%`,
      subtext: "Evaluated across completed exams",
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50 border-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center border ${card.bg} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-slate-900">{card.value}</span>
              <p className="mt-1 text-[11px] text-slate-500 truncate font-medium">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
