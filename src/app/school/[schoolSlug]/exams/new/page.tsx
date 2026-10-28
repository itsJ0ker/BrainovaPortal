"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { ExamForm } from "@/components/school/ExamForm";
import { ISchool } from "@/types";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function NewExamContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [school, setSchool] = useState<ISchool | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [schoolRes, academicRes] = await Promise.all([
          fetch(`/api/school/${schoolSlug}/profile`),
          fetch(`/api/school/${schoolSlug}/academic`),
        ]);

        const [schoolData, academicData] = await Promise.all([
          schoolRes.json(),
          academicRes.json(),
        ]);

        if (schoolData.success) setSchool(schoolData.school);
        if (academicData.success) {
          setClasses(academicData.classes.map((c: any) => c.name));
          setSubjects(academicData.subjects.map((s: any) => s.name));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [schoolSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading exam authoring suite...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header breadcrumb & intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/school/${schoolSlug}/exams`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Examinations
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-indigo-600">New Authoring</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Online Examination
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Configure examination schedule in Indian Standard Time (Delhi), select target candidate grades, author questions with instant rubrics, and toggle proctoring safeguards.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-medium text-indigo-700">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Auto-saves in draft mode
        </div>
      </div>

      <ExamForm
        schoolSlug={schoolSlug}
        classes={classes.length > 0 ? classes : ["Grade 10", "Grade 11", "Grade 12"]}
        subjects={subjects.length > 0 ? subjects : ["Physics", "Mathematics", "Computer Science"]}
      />
    </div>
  );
}

export default function NewExamPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <NewExamContent />
    </Suspense>
  );
}
