import * as XLSX from "xlsx";
import { IStudent, IExamAttempt } from "@/types";

export interface ParsedStudentRow {
  name: string;
  rollNumber: string;
  admissionNumber: string;
  email: string;
  classGrade: string;
  stream: string;
  section: string;
  customFields?: Record<string, string>;
}

export interface ParseResult {
  valid: ParsedStudentRow[];
  errors: { row: number; error: string }[];
}

/**
 * Parses students from CSV or Excel (.xlsx) file buffer.
 */
export function parseStudentsFromSpreadsheet(fileBuffer: Buffer | ArrayBuffer): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const valid: ParsedStudentRow[] = [];
  const errors: { row: number; error: string }[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1

    // Normalize keys to lowercase for flexible matching
    const normalized: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase().trim().replace(/[\s_-]+/g, "")] = String(row[key]).trim();
    }

    const name = normalized["name"] || normalized["studentname"] || normalized["fullname"];
    const rollNumber = normalized["rollnumber"] || normalized["rollno"] || normalized["roll"];
    const admissionNumber =
      normalized["admissionnumber"] || normalized["admissionno"] || normalized["admno"];
    const email = normalized["email"] || normalized["studentemail"] || normalized["emailaddress"];
    const classGrade =
      normalized["classgrade"] || normalized["class"] || normalized["grade"] || "Grade 10";
    const stream = normalized["stream"] || "General";
    const section = normalized["section"] || normalized["sec"] || "A";

    if (!name) {
      errors.push({ row: rowNum, error: "Missing required student Name." });
      return;
    }
    if (!rollNumber) {
      errors.push({ row: rowNum, error: `Row for '${name}': Missing Roll Number.` });
      return;
    }
    if (!admissionNumber) {
      errors.push({ row: rowNum, error: `Row for '${name}': Missing Admission Number.` });
      return;
    }
    if (!email || !email.includes("@")) {
      errors.push({ row: rowNum, error: `Row for '${name}': Invalid or missing Email.` });
      return;
    }

    // Extract any extra custom fields
    const customFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const lower = k.toLowerCase().trim();
      if (
        ![
          "name",
          "studentname",
          "roll",
          "rollno",
          "rollnumber",
          "adm",
          "admno",
          "admissionno",
          "admissionnumber",
          "email",
          "class",
          "grade",
          "classgrade",
          "stream",
          "section",
        ].includes(lower) &&
        v
      ) {
        customFields[k] = String(v);
      }
    }

    valid.push({
      name,
      rollNumber: rollNumber.toUpperCase(),
      admissionNumber: admissionNumber.toUpperCase(),
      email: email.toLowerCase(),
      classGrade,
      stream,
      section: section.toUpperCase(),
      customFields,
    });
  });

  return { valid, errors };
}

/**
 * Generates an Excel workbook buffer for student directory export.
 */
export function exportStudentsToBuffer(students: IStudent[]): Buffer {
  const rows = students.map((s, idx) => ({
    "S.No": idx + 1,
    "Full Name": s.name,
    "Roll Number": s.rollNumber,
    "Admission Number": s.admissionNumber,
    "Email Address": s.email,
    Class: s.classGrade,
    Stream: s.stream || "General",
    Section: s.section,
    Status: s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

/**
 * Generates an Excel workbook buffer for exam scorecards and attempt results.
 */
export function exportExamResultsToBuffer(examTitle: string, attempts: IExamAttempt[]): Buffer {
  // Sort by score descending
  const sorted = [...attempts].sort((a, b) => (b.scores.totalMarks || 0) - (a.scores.totalMarks || 0));

  const rows = sorted.map((att, idx) => ({
    Rank: idx + 1,
    "Student Name": att.studentSnapshot?.name || "Unknown",
    "Roll No": att.studentSnapshot?.rollNumber || "",
    "Admission No": att.studentSnapshot?.admissionNumber || "",
    Class: att.studentSnapshot?.classGrade || "",
    Section: att.studentSnapshot?.section || "",
    "MCQ Marks": att.scores?.mcqMarks ?? 0,
    "Written Marks": att.scores?.writtenMarks ?? 0,
    "Total Score": att.scores?.totalMarks ?? 0,
    "Max Marks": att.scores?.maxMarks ?? 0,
    "Percentage (%)": att.scores?.percentage ?? 0,
    Status: att.status,
    "Violations Logged": att.violationCount || 0,
    "Submitted At": att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
