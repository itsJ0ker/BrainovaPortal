"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileSpreadsheet,
  Settings,
  Building,
} from "lucide-react";
import { ISchool } from "@/types";

interface SchoolNavProps {
  school: ISchool;
}

export function SchoolNav({ school }: SchoolNavProps) {
  const pathname = usePathname();

  const links = [
    {
      label: "Overview",
      href: `/school/${school.slug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Students",
      href: `/school/${school.slug}/students`,
      icon: Users,
    },
    {
      label: "Academic Structure",
      href: `/school/${school.slug}/academic`,
      icon: GraduationCap,
    },
    {
      label: "Examinations",
      href: `/school/${school.slug}/exams`,
      icon: FileSpreadsheet,
    },
    {
      label: "Settings & Profile",
      href: `/school/${school.slug}/settings`,
      icon: Settings,
    },
  ];

  return (
    <div className="border-b border-slate-800 bg-[#090f1d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* School Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-900/40 border border-indigo-700/50 text-indigo-400 font-bold text-base shadow-sm">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{school.name}</h2>
                <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-mono text-cyan-400">
                  {school.code}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tenant Workspace · Contact: <span className="text-slate-300">{school.contactEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Isolated Tenant Node
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
