"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { parseStudentsFromSpreadsheet, ParsedStudentRow } from "@/lib/excel";

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onImportSuccess: () => void;
}

export function StudentImportModal({
  isOpen,
  onClose,
  schoolId,
  onImportSuccess,
}: StudentImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; error: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [serverResult, setServerResult] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setServerResult(null);

    const buffer = await selected.arrayBuffer();
    const result = parseStudentsFromSpreadsheet(buffer);
    setParsedRows(result.valid);
    setParseErrors(result.errors);
  };

  const handleConfirmImport = async () => {
    if (!file && parsedRows.length === 0) return;
    setIsUploading(true);
    setServerResult(null);

    try {
      const res = await fetch(`/api/school/${schoolId}/students/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: parsedRows }),
      });

      const data = await res.json();
      setServerResult(data);
      if (data.success) {
        onImportSuccess();
      }
    } catch (err: any) {
      setServerResult({ success: false, error: err.message || "Failed to upload." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    setServerResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Batch Import Students (CSV / Excel)"
      description="Upload student rosters in .xlsx or .csv format. Columns: Name, Roll Number, Admission Number, Email, Class, Stream, Section."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Dropzone */}
        {!file ? (
          <label className="border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition-all group">
            <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2" />
            <p className="text-sm font-bold text-slate-900">Click or drag & drop CSV or Excel spreadsheet</p>
            <p className="text-xs text-slate-500 mt-1">Supports .xlsx, .xls, and .csv files</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {parsedRows.length} valid students detected · {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setParsedRows([]);
                setParseErrors([]);
                setServerResult(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Server Result Banner */}
        {serverResult && (
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              serverResult.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {serverResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{serverResult.message || serverResult.error}</span>
            </div>

            {serverResult.skipped?.length > 0 && (
              <div className="mt-2 text-[11px] text-amber-800 space-y-0.5">
                <p className="font-bold">Skipped entries:</p>
                {serverResult.skipped.slice(0, 5).map((sk: any, i: number) => (
                  <p key={i}>Row {sk.row}: {sk.reason}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Parse Errors Warning */}
        {parseErrors.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 max-h-24 overflow-y-auto">
            <p className="font-bold mb-1">Warnings in file:</p>
            {parseErrors.map((err, i) => (
              <p key={i}>Row {err.row}: {err.error}</p>
            ))}
          </div>
        )}

        {/* Table Preview */}
        {parsedRows.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 font-semibold">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Roll No</th>
                  <th className="px-3 py-2">Admission No</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parsedRows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-bold text-slate-900">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-indigo-600 font-semibold">{r.rollNumber}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.admissionNumber}</td>
                    <td className="px-3 py-2">{r.classGrade}</td>
                    <td className="px-3 py-2">{r.section}</td>
                    <td className="px-3 py-2 text-slate-500">{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 8 && (
              <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 text-center font-medium">
                + {parsedRows.length - 8} more students ready to import
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            onClick={handleClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isUploading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isUploading ? "Importing..." : `Import ${parsedRows.length} Students`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
