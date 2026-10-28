"use client";

import React, { useState } from "react";
import { IStudent } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  STANDARD_CLASSES,
  STANDARD_STREAMS,
  STANDARD_SECTIONS,
} from "@/lib/constants";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Users,
  Check,
  Award,
} from "lucide-react";
import { StudentHistoryModal } from "./StudentHistoryModal";

interface StudentTableProps {
  students: IStudent[];
  schoolSlug: string;
  classes: string[];
  onRefresh: () => void;
  onOpenImportModal: () => void;
}

export function StudentTable({
  students,
  schoolSlug,
  classes,
  onRefresh,
  onOpenImportModal,
}: StudentTableProps) {
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<IStudent | null>(null);
  const [historyStudent, setHistoryStudent] = useState<IStudent | null>(null);

  // Form states for Add / Edit
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [email, setEmail] = useState("");
  const [classGrade, setClassGrade] = useState("Grade 10");
  const [stream, setStream] = useState("General");
  const [section, setSection] = useState("A");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesClass = selectedClass === "all" || s.classGrade === selectedClass;
    return matchesSearch && matchesClass;
  });

  const openAddModal = () => {
    setName("");
    setRollNumber("");
    setAdmissionNumber("");
    setEmail("");
    setClassGrade(classes[0] || "Grade 10");
    setStream("General");
    setSection("A");
    setError("");
    setEditingStudent(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (student: IStudent) => {
    setEditingStudent(student);
    setName(student.name);
    setRollNumber(student.rollNumber);
    setAdmissionNumber(student.admissionNumber);
    setEmail(student.email);
    setClassGrade(student.classGrade);
    setStream(student.stream || "General");
    setSection(student.section);
    setError("");
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = editingStudent
        ? `/api/school/${schoolSlug}/students/${editingStudent._id}`
        : `/api/school/${schoolSlug}/students`;

      const method = editingStudent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rollNumber,
          admissionNumber,
          email,
          classGrade,
          stream,
          section,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to save student record.");
        return;
      }

      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove student "${studentName}"?`)) return;

    try {
      const res = await fetch(`/api/school/${schoolSlug}/students/${studentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleExportExcel = () => {
    const url = `/api/school/${schoolSlug}/students/export${
      selectedClass !== "all" ? `?classGrade=${encodeURIComponent(selectedClass)}` : ""
    }`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, admission no..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none shadow-2xs font-medium"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export (.xlsx)</span>
          </button>

          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>Import CSV/Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Student Name</th>
                <th className="px-5 py-3 font-semibold">Roll Number</th>
                <th className="px-5 py-3 font-semibold">Admission No</th>
                <th className="px-5 py-3 font-semibold">Class & Sec</th>
                <th className="px-5 py-3 font-semibold">Registered Email</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No students found. Use "Add Student" or "Import CSV/Excel" to populate your roster.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      {s.stream && s.stream !== "General" && (
                        <span className="text-[10px] text-slate-400 font-medium">{s.stream} Stream</span>
                      )}
                    </td>

                    {/* Roll No */}
                    <td className="px-5 py-3.5 font-mono text-indigo-600 font-semibold">
                      {s.rollNumber}
                    </td>

                    {/* Admission No */}
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {s.admissionNumber}
                    </td>

                    {/* Class & Section */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-800 text-[11px]">
                        {s.classGrade} - {s.section}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {s.email}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryStudent(s)}
                          className="rounded-lg p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                          title="View Test History & Scorecards"
                        >
                          <Award className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s._id, s.name)}
                          className="rounded-lg p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingStudent ? "Edit Student Details" : "Register Student"}
        description={
          editingStudent
            ? "Update academic and contact information for this student."
            : "Add an individual student to this school workspace. Used for identity verification during exams."
        }
        maxWidth="md"
      >
        <form onSubmit={handleSaveStudent} className="space-y-3.5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Lin"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Roll Number</label>
                <button
                  type="button"
                  onClick={() => setRollNumber(`ROL-${Math.floor(100 + Math.random() * 900)}`)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  ⚡ Auto-Gen
                </button>
              </div>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ROL-105"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:border-indigo-600 focus:outline-none font-mono shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Admission Number</label>
                <button
                  type="button"
                  onClick={() =>
                    setAdmissionNumber(`ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
                  }
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  ⚡ Auto-Gen
                </button>
              </div>
              <input
                type="text"
                required
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ADM-2026-005"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase focus:border-indigo-600 focus:outline-none font-mono shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Student Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="student@school.edu"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Class Grade</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              >
                {Array.from(new Set([...classes, ...STANDARD_CLASSES])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Academic Stream</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
              >
                {STANDARD_STREAMS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Section: <span className="font-bold text-indigo-600">{section}</span>
              </label>
              <span className="text-[10px] text-slate-400">Select section:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STANDARD_SECTIONS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSection(sec)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${
                    section === sec
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Saving..." : editingStudent ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </form>
      </Modal>

      <StudentHistoryModal
        isOpen={!!historyStudent}
        onClose={() => setHistoryStudent(null)}
        student={historyStudent}
        schoolSlug={schoolSlug}
      />
    </div>
  );
}
