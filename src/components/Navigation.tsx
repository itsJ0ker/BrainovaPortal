"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  Shield,
  School,
  FileCheck2,
  ChevronDown,
  LogOut,
  User,
  ExternalLink,
  Award,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      // Clear school session
      await fetch("/api/school/auth/logout", { method: "POST" });

      // Clear DevAuth cookies
      document.cookie = "dev_auth_role=; path=/; max-age=0";
      document.cookie = "dev_auth_school_id=; path=/; max-age=0";
      document.cookie = "dev_auth_school_slug=; path=/; max-age=0";

      // If Clerk is present, call Clerk signOut
      if (typeof window !== "undefined" && (window as any).Clerk) {
        await (window as any).Clerk.signOut();
      }
    } catch (e) {
      // ignore
    }

    if (currentUser?.role === "school_admin") {
      router.push("/school/login");
    } else {
      router.push("/sign-in");
    }
  };

  const isPortal = pathname?.startsWith("/portal") || pathname?.startsWith("/exam");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href={
              currentUser?.role === "school_admin" && currentUser?.schoolSlug
                ? `/school/${currentUser.schoolSlug}`
                : "/super-admin"
            }
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-xs group-hover:scale-105 transition-transform overflow-hidden p-1">
              <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                Brainova Olympiad
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                    currentUser?.role === "school_admin"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-indigo-700 bg-indigo-50 border-indigo-200"
                  }`}
                >
                  {currentUser?.role === "school_admin" ? "School" : "Admin"}
                </span>
              </span>
            </div>
          </Link>

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            {currentUser?.role === "super_admin" && (
              <Link
                href="/super-admin"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${
                  pathname?.startsWith("/super-admin")
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Super Admin</span>
              </Link>
            )}

            {currentUser?.schoolSlug && (
              <Link
                href={`/school/${currentUser.schoolSlug}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${
                  pathname?.startsWith("/school")
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <School className="w-3.5 h-3.5 text-emerald-600" />
                <span>School Workspace</span>
              </Link>
            )}

            <Link
              href="/portal"
              target="_blank"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors ${
                isPortal
                  ? "bg-cyan-50 text-cyan-700 border border-cyan-200/70"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-600" />
              <span>Exam Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <Link
              href="/portal?tab=history"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>Check Results</span>
            </Link>
          </nav>
        </div>

        {/* Right Actions: Authenticated User Info & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                <User className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                  {currentUser?.name || "Administrator"}
                </p>
                <p className="text-[10px] text-slate-500 capitalize font-medium">
                  {currentUser?.role === "super_admin"
                    ? "Super Admin"
                    : currentUser?.role === "school_admin"
                    ? "School Admin"
                    : currentUser?.role || "Staff"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl text-xs z-50 divide-y divide-slate-100">
                <div className="px-2.5 py-2">
                  <p className="font-bold text-slate-900 truncate">
                    {currentUser?.name || "Administrator"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser?.email || "admin@schexamport.internal"}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                      currentUser?.role === "school_admin"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-indigo-700 bg-indigo-50 border-indigo-200"
                    }`}
                  >
                    {currentUser?.role === "school_admin"
                      ? `School Admin (${currentUser.schoolSlug})`
                      : "Brainova Super Admin"}
                  </span>
                </div>

                <div className="py-1">
                  {currentUser?.role === "super_admin" && (
                    <Link
                      href="/super-admin"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Super Admin Console</span>
                    </Link>
                  )}

                  {currentUser?.schoolSlug && (
                    <Link
                      href={`/school/${currentUser.schoolSlug}`}
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <School className="w-3.5 h-3.5 text-emerald-600" />
                      <span>School Workspace</span>
                    </Link>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
