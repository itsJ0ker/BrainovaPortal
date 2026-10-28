"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Settings,
  Shield,
  ExternalLink,
  Plus,
  LogOut,
  Menu,
  X,
  Building,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ISchool } from "@/types";

interface SchoolDashboardShellProps {
  school: ISchool;
  user: any;
  children: React.ReactNode;
}

export function SchoolDashboardShell({ school, user, children }: SchoolDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).format(new Date());
        setCurrentTime(timeStr);
      } catch {
        setCurrentTime("");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    router.push("/school/login");
  };

  const navGroups = [
    {
      group: "MAIN",
      items: [
        {
          label: "Dashboard",
          href: `/school/${school.slug}`,
          icon: LayoutDashboard,
          exact: true,
        },
        {
          label: "Examinations",
          href: `/school/${school.slug}/exams`,
          icon: FileSpreadsheet,
          hasAdd: true,
          addHref: `/school/${school.slug}/exams/new`,
        },
        {
          label: "Students Roster",
          href: `/school/${school.slug}/students`,
          icon: Users,
        },
        {
          label: "Academic Structure",
          href: `/school/${school.slug}/academic`,
          icon: GraduationCap,
        },
      ],
    },
    {
      group: "ADMINISTRATION",
      items: [
        {
          label: "School Settings",
          href: `/school/${school.slug}/settings`,
          icon: Settings,
        },
        {
          label: "Audit Logs",
          href: `/school/${school.slug}/audit`,
          icon: Shield,
        },
      ],
    },
    {
      group: "TEST PORTAL",
      items: [
        {
          label: "Candidate Portal",
          href: "/portal",
          icon: ExternalLink,
          external: true,
        },
      ],
    },
  ];

  // Breadcrumbs text
  const getBreadcrumb = () => {
    if (!pathname) return "Dashboard";
    if (pathname === `/school/${school.slug}`) return "Dashboard Overview";
    if (pathname.includes("/exams/new")) return "Examinations / Create Online Exam";
    if (pathname.includes("/grading")) return "Examinations / Grading Studio";
    if (pathname.includes("/results")) return "Examinations / Assessment Results";
    if (pathname.includes("/exams")) return "Examinations Management";
    if (pathname.includes("/students")) return "Student Directory & Rosters";
    if (pathname.includes("/academic")) return "Academic Structure";
    if (pathname.includes("/settings")) return "School Settings & Profile";
    if (pathname.includes("/audit")) return "Audit Logs & Security";
    return "School Workspace";
  };

  // Nav Item Renderer
  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isActive = item.exact
      ? pathname === item.href
      : item.external
      ? false
      : pathname?.startsWith(item.href);

    return (
      <div key={item.label} className="group relative flex items-center">
        <Link
          href={item.href}
          target={item.external ? "_blank" : undefined}
          className={`flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
            isActive
              ? "bg-indigo-50 text-indigo-700 font-bold shadow-sm shadow-indigo-100 border border-indigo-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
          <span className="truncate">{item.label}</span>
          {item.external && <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />}
        </Link>

        {item.hasAdd && (
          <Link
            href={item.addHref}
            title="Create New Exam"
            className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    );
  };

  // Sidebar content (shared desktop/mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Brand & School Header */}
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
              Workspace Dashboard
            </span>
          </div>
        </div>

        {/* School Identity Tile */}
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex-shrink-0">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                {school.name}
              </h4>
              <span className="inline-block text-[10px] font-mono font-medium text-slate-500">
                Code: {school.code}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
            Active
          </span>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </div>
            {group.items.map(renderNavItem)}
          </div>
        ))}
      </div>

      {/* Bottom Administrator Profile Card & Logout */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex-shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || "SA"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.name || school.adminName || "School Admin"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email || school.contactEmail}
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
              <span className="font-semibold text-slate-400 hidden sm:inline">{school.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <span className="font-bold text-slate-900 text-sm">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live IST Clock */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                <span>🇮🇳</span>
                <span className="font-semibold text-slate-800">{currentTime}</span>
                <span className="text-[10px] text-slate-400">IST</span>
              </div>
            )}

            {/* Quick Action Button */}
            <Link
              href={`/school/${school.slug}/exams/new`}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Exam</span>
            </Link>

            {/* Test Portal Shortcut */}
            <Link
              href="/portal"
              target="_blank"
              title="Open Student Test Portal in new tab"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Test Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Page Inner Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
