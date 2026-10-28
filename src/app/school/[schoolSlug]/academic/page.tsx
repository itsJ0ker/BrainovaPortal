"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ISchool, IClassGrade, ISubject, IAcademicYear } from "@/types";
import {
  STANDARD_SUBJECTS,
  STANDARD_CLASSES,
  STANDARD_STREAMS,
  STANDARD_SECTIONS,
} from "@/lib/constants";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Layers,
  Check,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

function SchoolAcademicContent() {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  const [school, setSchool] = useState<ISchool | null>(null);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [classes, setClasses] = useState<IClassGrade[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  // Form states - Class Grade
  const [className, setClassName] = useState(STANDARD_CLASSES[0]);
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClassName, setCustomClassName] = useState("");
  const [selectedStreams, setSelectedStreams] = useState<string[]>(["General", "Science"]);
  const [selectedSections, setSelectedSections] = useState<string[]>(["A", "B"]);

  // Form states - Subject
  const [selectedCatalogSubject, setSelectedCatalogSubject] = useState(STANDARD_SUBJECTS[0].name);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [subjectName, setSubjectName] = useState(STANDARD_SUBJECTS[0].name);
  const [subjectCode, setSubjectCode] = useState(STANDARD_SUBJECTS[0].code);
  const [department, setDepartment] = useState(STANDARD_SUBJECTS[0].department);

  const fetchData = async () => {
    setIsLoading(true);
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
        setAcademicYears(academicData.academicYears);
        setClasses(academicData.classes);
        setSubjects(academicData.subjects);
      }
    } catch (err) {
      console.error("Academic page fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (schoolSlug) fetchData();
  }, [schoolSlug]);

  // Handle Catalog Subject selection & autofill
  const handleCatalogSubjectChange = (name: string) => {
    if (name === "__custom__") {
      setIsCustomSubject(true);
      setSubjectName("");
      setSubjectCode("");
      setDepartment("");
    } else {
      setIsCustomSubject(false);
      setSelectedCatalogSubject(name);
      const matched = STANDARD_SUBJECTS.find((s) => s.name === name);
      if (matched) {
        setSubjectName(matched.name);
        setSubjectCode(matched.code);
        setDepartment(matched.department);
      }
    }
  };

  const toggleStream = (st: string) => {
    if (selectedStreams.includes(st)) {
      if (selectedStreams.length > 1) {
        setSelectedStreams(selectedStreams.filter((s) => s !== st));
      }
    } else {
      setSelectedStreams([...selectedStreams, st]);
    }
  };

  const toggleSection = (sec: string) => {
    if (selectedSections.includes(sec)) {
      if (selectedSections.length > 1) {
        setSelectedSections(selectedSections.filter((s) => s !== sec));
      }
    } else {
      setSelectedSections([...selectedSections, sec].sort());
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = isCustomClass ? customClassName.trim() : className;
    if (!finalName) return;

    try {
      const res = await fetch(`/api/school/${schoolSlug}/academic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "class",
          data: {
            name: finalName,
            streams: selectedStreams,
            sections: selectedSections,
          },
        }),
      });
      if (res.ok) {
        setIsClassModalOpen(false);
        setCustomClassName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) return;

    try {
      const res = await fetch(`/api/school/${schoolSlug}/academic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subject",
          data: {
            name: subjectName.trim(),
            code: subjectCode.trim(),
            department: department.trim(),
          },
        }),
      });
      if (res.ok) {
        setIsSubjectModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !school) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-500 font-medium text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading academic structure...
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
              <GraduationCap className="w-3.5 h-3.5" />
              Curriculum Setup
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">
              {classes.length} Classes · {subjects.length} Subjects
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Structure
          </h1>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Define institutional class grades, stream tracks, standard sections, and subject curriculum codes.
          </p>
        </div>
      </div>

      {/* Classes & Grades */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Classes, Streams & Sections</h3>
          </div>
          <button
            onClick={() => setIsClassModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((c) => (
            <div
              key={c._id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">Order {c.order}</span>
              </div>
              <div className="text-xs text-slate-600">
                <span className="text-slate-400 font-medium">Streams:</span> {c.streams?.join(", ") || "General"}
              </div>
              <div className="text-xs text-slate-600">
                <span className="text-slate-400 font-medium">Sections:</span>{" "}
                <span className="text-indigo-600 font-bold font-mono">{c.sections?.join(", ") || "A"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects & Curriculum */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Subjects & Course Codes</h3>
          </div>
          <button
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subjects.map((sub) => (
            <div
              key={sub._id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                {sub.code}
              </span>
              <div className="font-bold text-slate-900 text-sm pt-1">{sub.name}</div>
              <p className="text-[11px] text-slate-500">{sub.department || "General Department"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Class Modal with Selectors & Pills */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Class Grade"
        description="Select standard grade level and toggle active streams and sections."
        maxWidth="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Class Grade Level</label>
            <select
              value={isCustomClass ? "__custom__" : className}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setIsCustomClass(true);
                } else {
                  setIsCustomClass(false);
                  setClassName(e.target.value);
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            >
              <optgroup label="Standard Grades">
                {STANDARD_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </optgroup>
              <option value="__custom__">+ Custom Grade Name...</option>
            </select>

            {isCustomClass && (
              <input
                type="text"
                required
                value={customClassName}
                onChange={(e) => setCustomClassName(e.target.value)}
                placeholder="e.g. Year 13 or Foundation Group"
                className="mt-2 w-full rounded-xl border border-indigo-500 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none"
                autoFocus
              />
            )}
          </div>

          {/* Stream Selector Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Academic Streams ({selectedStreams.length} Active)
              </label>
              <span className="text-[10px] text-slate-400">Tap to toggle</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STANDARD_STREAMS.map((st) => {
                const isSelected = selectedStreams.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleStream(st)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500/30 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Selector Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Class Sections ({selectedSections.join(", ")})
              </label>
              <span className="text-[10px] text-slate-400">Tap to toggle</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STANDARD_SECTIONS.map((sec) => {
                const isSelected = selectedSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSection(sec)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Create Class
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal with Catalog Presets & Auto-fill */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add Academic Subject"
        description="Select from standard curriculum catalog or define a custom course code."
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Curriculum Catalog</label>
              <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" /> Auto-fills code & dept
              </span>
            </div>
            <select
              value={isCustomSubject ? "__custom__" : selectedCatalogSubject}
              onChange={(e) => handleCatalogSubjectChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            >
              <optgroup label="Standard Subjects">
                {STANDARD_SUBJECTS.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </optgroup>
              <option value="__custom__">+ Custom Subject...</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Subject Name</label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Chemistry"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Course Code</label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="e.g. CHEM-101"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Chemical Sciences"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              Create Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SchoolAcademicPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
      <SchoolAcademicContent />
    </Suspense>
  );
}
