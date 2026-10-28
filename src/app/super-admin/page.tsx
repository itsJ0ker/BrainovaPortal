"use client";

import React, { useState, useEffect } from "react";
import { PlatformMetrics } from "@/components/super-admin/PlatformMetrics";
import { SchoolList } from "@/components/super-admin/SchoolList";
import { CreateSchoolModal } from "@/components/super-admin/CreateSchoolModal";
import { Badge } from "@/components/ui/Badge";
import { SchoolStatus } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Plus,
  Activity,
  RefreshCw,
  Building2,
  Clock,
  LogOut,
  LayoutDashboard,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  Users,
  FileSpreadsheet,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function SuperAdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"schools" | "logs">("schools");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Check auth status
      const authRes = await fetch("/api/auth/me");
      const authData = await authRes.json();

      if (authData.authenticated) {
        setCurrentUser(authData.user);
        if (authData.user?.role === "school_admin" && authData.user?.schoolSlug) {
          router.push(`/school/${authData.user.schoolSlug}`);
          return;
        }
      }

      const [metricsRes, schoolsRes, logsRes] = await Promise.all([
        fetch("/api/super-admin/analytics"),
        fetch("/api/super-admin/schools"),
        fetch("/api/super-admin/audit-logs"),
      ]);

      const [metricsData, schoolsData, logsData] = await Promise.all([
        metricsRes.json(),
        schoolsRes.json(),
        logsRes.json(),
      ]);

      if (metricsData.success) setMetrics(metricsData.metrics);
      if (schoolsData.success) setSchools(schoolsData.schools);
      if (logsData.success) setAuditLogs(logsData.logs);
    } catch (err) {
      console.error("Super Admin fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (schoolId: string, newStatus: SchoolStatus) => {
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/school/auth/logout", { method: "POST" });
      document.cookie = "dev_auth_role=; path=/; max-age=0";
      document.cookie = "dev_auth_school_id=; path=/; max-age=0";
      document.cookie = "dev_auth_school_slug=; path=/; max-age=0";
      if (typeof window !== "undefined" && (window as any).Clerk) {
        await (window as any).Clerk.signOut();
      }
    } catch {
      // ignore
    }
    router.push("/sign-in");
  };

  // Sidebar navigation content
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-md flex-shrink-0 overflow-hidden p-1">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
              Brainova Olympiad
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 font-mono">
              Super Admin Console
            </span>
          </div>
        </div>

        {/* Global Control Status */}
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Platform Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-medium">Multi-Tenant</span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
            Platform Management
          </span>
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("schools");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "schools"
                  ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <Building2 className={`w-4 h-4 flex-shrink-0 ${activeTab === "schools" ? "text-indigo-600" : "text-slate-400"}`} />
              <span>Institutions Directory</span>
              <span className="ml-auto text-[10px] font-mono bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded-md">
                {schools.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("logs");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "logs"
                  ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm border border-indigo-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <Activity className={`w-4 h-4 flex-shrink-0 ${activeTab === "logs" ? "text-indigo-600" : "text-slate-400"}`} />
              <span>Audit & Activity Logs</span>
            </button>
          </div>
        </div>

        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 font-mono">
            Portals & Shortcuts
          </span>
          <div className="space-y-1">
            <Link
              href="/school/login"
              target="_blank"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>School Login Gateway</span>
              <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
            </Link>

            <Link
              href="/portal"
              target="_blank"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-cyan-600" />
              <span>Student Exam Portal</span>
              <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Admin User Footer & Sign Out */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs flex-shrink-0">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name || "Super Administrator"}
              </p>
              <p className="text-[10px] text-slate-500 truncate font-medium">
                {currentUser?.email || "Platform Admin"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-800 font-sans">
      {/* Desktop Leftside Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl lg:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-400 hidden sm:inline">Super Admin Console</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="font-bold text-slate-900 text-sm">
                {activeTab === "schools" ? "Institutions Directory" : "Platform Activity & Audit"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live IST Clock */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                <span>🇮🇳</span>
                <span className="font-semibold text-slate-800">{currentTime}</span>
                <span className="text-[10px] text-slate-400 font-bold">IST</span>
              </div>
            )}

            <button
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Register School</span>
              <span className="sm:hidden">Register</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Platform Administration
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Super Admin
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Monitor multi-tenant institutions, orchestrate isolated school workspaces, issue administrator invitations, and audit platform activity.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Register Partner School</span>
              </button>
            </div>
          </div>

          {/* Platform Metrics */}
          {metrics && <PlatformMetrics metrics={metrics} />}

          {/* Tab Selector & Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                onClick={() => setActiveTab("schools")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wide transition-colors border-b-2 -mb-[2px] ${
                  activeTab === "schools"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Partner Institutions ({schools.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("logs")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wide transition-colors border-b-2 -mb-[2px] ${
                  activeTab === "logs"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Activity & Audit Trail</span>
              </button>
            </div>

            {activeTab === "schools" ? (
              <SchoolList schools={schools} onStatusChange={handleStatusChange} />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Recent Platform Events</span>
                </h3>

                <div className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-medium">No audit logs recorded yet.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log._id} className="py-3.5 flex items-start justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <Badge variant="purple">{log.actorRole}</Badge>
                          </div>
                          <p className="text-slate-600">
                            By <span className="text-slate-900 font-semibold">{log.actorName}</span> on{" "}
                            <span className="font-medium text-slate-700">{log.resourceType}</span> ({log.resourceId || "system"})
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create School Modal */}
      <CreateSchoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSchoolCreated={fetchData}
      />
    </div>
  );
}
