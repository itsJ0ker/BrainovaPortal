"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { StudentTable } from "@/components/school/StudentTable";
import { StudentImportModal } from "@/components/school/StudentImportModal";
import { IStudent, ISchool } from "@/types";
import { Users, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

function SchoolStudentsContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [school, setSchool] = useState<ISchool | null>(null);
  const [students, setStudents] = useState<IStudent[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolRes, studentsRes, academicRes] = await Promise.all([
        fetch(`/api/school/${schoolSlug}/profile`),
        fetch(`/api/school/${schoolSlug}/students?limit=100`),
        fetch(`/api/school/${schoolSlug}/academic`),
      ]);

      const [schoolData, studentsData, academicData] = await Promise.all([
        schoolRes.json(),
        studentsRes.json(),
        academicRes.json(),
      ]);

      if (schoolData.success) setSchool(schoolData.school);
      if (studentsData.success) setStudents(studentsData.students);
      if (academicData.success) {
        setClasses(academicData.classes.map((c: any) => c.name));
      }
    } catch (err) {
      console.error("Student page fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolSlug) fetchData();
  }, [schoolSlug]);

  if (isLoading && !school) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading student records...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Users className="w-3.5 h-3.5" />
              Enrollment Roster
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">
              {students.length} Registered Candidates
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Directory
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Maintain institutional candidate records. Registered students verify their identity via Roll Number to access tests and receive personalized scorecards.
          </p>
        </div>
      </div>

      <StudentTable
        students={students}
        schoolSlug={schoolSlug}
        classes={classes.length > 0 ? classes : ["Grade 10", "Grade 11", "Grade 12"]}
        onRefresh={fetchData}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        schoolId={schoolSlug}
        onImportSuccess={fetchData}
      />
    </div>
  );
}

export default function SchoolStudentsPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <SchoolStudentsContent />
    </Suspense>
  );
}
