export interface PresetSubject {
  name: string;
  code: string;
  department: string;
}

export const STANDARD_SUBJECTS: PresetSubject[] = [
  { name: "Physics", code: "PHYS-101", department: "Physical Sciences" },
  { name: "Chemistry", code: "CHEM-101", department: "Chemical Sciences" },
  { name: "Biology", code: "BIO-101", department: "Life Sciences" },
  { name: "Mathematics", code: "MATH-101", department: "Mathematics" },
  { name: "Computer Science", code: "CS-101", department: "Information Technology" },
  { name: "English Literature", code: "ENG-101", department: "Languages & Humanities" },
  { name: "History", code: "HIST-101", department: "Social Sciences" },
  { name: "Geography", code: "GEOG-101", department: "Social Sciences" },
  { name: "Economics", code: "ECON-101", department: "Commerce & Economics" },
  { name: "Business Studies", code: "BUS-101", department: "Commerce & Economics" },
  { name: "Accountancy", code: "ACC-101", department: "Commerce & Economics" },
  { name: "General Science", code: "SCI-101", department: "Natural Sciences" },
  { name: "Environmental Science", code: "ENV-101", department: "Life Sciences" },
  { name: "Psychology", code: "PSY-101", department: "Social Sciences" },
  { name: "Art & Design", code: "ART-101", department: "Fine Arts" },
  { name: "Physical Education", code: "PE-101", department: "Physical Education" },
  { name: "Civics & Politics", code: "CIV-101", department: "Social Sciences" },
];

export const STANDARD_CLASSES: string[] = [
  "Grade 12",
  "Grade 11",
  "Grade 10",
  "Grade 9",
  "Grade 8",
  "Grade 7",
  "Grade 6",
  "Grade 5",
  "Grade 4",
  "Grade 3",
  "Grade 2",
  "Grade 1",
  "Kindergarten",
];

export const STANDARD_STREAMS: string[] = [
  "General",
  "Science",
  "Commerce",
  "Arts / Humanities",
  "Vocational",
  "Technology",
];

export const STANDARD_SECTIONS: string[] = ["A", "B", "C", "D", "E", "F"];

export const EXAM_DURATION_PRESETS: number[] = [15, 30, 45, 60, 90, 120, 180];

export const EXAM_TITLE_TEMPLATES: string[] = [
  "Midterm Examination",
  "Final Semester Exam",
  "Unit Diagnostic Quiz",
  "Chapter Assessment",
  "Mock Practice Exam",
  "Pop Quiz",
];

export const POINT_PRESETS: number[] = [1, 2, 4, 5, 10, 20];

export const NEGATIVE_POINT_PRESETS: number[] = [0, 0.25, 0.5, 1, 2];

export const ACADEMIC_YEAR_PRESETS: string[] = [
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
  "2028-2029",
];

export const GRADING_FEEDBACK_PRESETS: string[] = [
  "Excellent derivation and complete accuracy.",
  "Conceptually solid, minor calculation error.",
  "Partially correct, key step omitted.",
  "Clear explanation with good supporting steps.",
  "Needs review of fundamental principles.",
];
