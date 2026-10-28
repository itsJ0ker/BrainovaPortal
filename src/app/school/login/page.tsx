import React from "react";
import { SchoolLoginClient } from "./SchoolLoginClient";
import { School as SchoolIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SchoolPortalGatewayPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 font-sans relative">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200/80 p-2 overflow-hidden">
            <img src="/logobrainova.png" alt="Brainova Olympiad" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Brainova Olympiad
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            School Workspace Portal • Dedicated administrative access for faculty & examination coordinators
          </p>
        </div>

        {/* Client Interactive Login */}
        <SchoolLoginClient />
      </div>
    </div>
  );
}
