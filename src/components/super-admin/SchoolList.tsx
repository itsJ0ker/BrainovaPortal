"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { SchoolStatus } from "@/types";
import {
  ExternalLink,
  Search,
  CheckCircle,
  PauseCircle,
  Archive,
  Users,
  FileSpreadsheet,
  Building,
} from "lucide-react";

interface SchoolItem {
  _id: string;
  name: string;
  slug: string;
  code: string;
  status: SchoolStatus;
  adminEmail: string;
  studentCount?: number;
  examCount?: number;
  onboardingStatus?: string;
  createdAt: string;
}

interface SchoolListProps {
  schools: SchoolItem[];
  onStatusChange: (schoolId: string, newStatus: SchoolStatus) => void;
}

export function SchoolList({ schools, onStatusChange }: SchoolListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.adminEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: SchoolStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "suspended":
        return <Badge variant="warning">Suspended</Badge>;
      case "archived":
        return <Badge variant="danger">Archived</Badge>;
      case "invited":
        return <Badge variant="info">Invited</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name, code, email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["all", "active", "suspended", "archived"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
            <tr>
              <th className="px-5 py-3.5 font-bold">Institution & Code</th>
              <th className="px-5 py-3.5 font-bold">Admin Contact</th>
              <th className="px-5 py-3.5 font-bold text-center">Enrollment</th>
              <th className="px-5 py-3.5 font-bold text-center">Exams</th>
              <th className="px-5 py-3.5 font-bold">Status</th>
              <th className="px-5 py-3.5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-medium">
                  No schools found matching your search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((school) => (
                <tr key={school._id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Name and Code */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                        {school.code ? school.code.slice(0, 3) : "SCH"}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{school.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="font-mono text-indigo-600 font-semibold">{school.code}</span>
                          <span>•</span>
                          <span>slug: {school.slug}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Admin */}
                  <td className="px-5 py-3.5">
                    <span className="text-slate-700 font-medium">{school.adminEmail}</span>
                  </td>

                  {/* Enrollment */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-xs">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{school.studentCount ?? 0}</span>
                    </div>
                  </td>

                  {/* Exams */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-xs">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{school.examCount ?? 0}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">{getStatusBadge(school.status)}</td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`/school/${school.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                      >
                        <span>Workspace</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>

                      {school.status === "active" ? (
                        <button
                          onClick={() => onStatusChange(school._id, "suspended")}
                          title="Suspend School Workspace"
                          className="rounded-xl p-1.5 text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onStatusChange(school._id, "active")}
                          title="Activate School Workspace"
                          className="rounded-xl p-1.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {school.status !== "archived" && (
                        <button
                          onClick={() => onStatusChange(school._id, "archived")}
                          title="Archive School Workspace"
                          className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
