import jwt from "jsonwebtoken";

const DEFAULT_DEV_KEY = "brainova_olympiad_jwt_dev_key_2026";

function getJwtSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET || process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.trim().length === 0 || secret === DEFAULT_DEV_KEY || secret.includes("schexamport_student_jwt")) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: 'STUDENT_SESSION_SECRET' or 'JWT_SECRET' environment variable must be set in production to a cryptographically secure key."
      );
    }
    return secret;
  }

  return secret || DEFAULT_DEV_KEY;
}

export interface StudentSessionPayload {
  attemptId: string;
  examId: string;
  studentId: string;
  schoolId: string;
  serverDeadline: string;
}

export function signStudentSession(payload: StudentSessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "12h",
  });
}

export function verifyStudentSession(token: string): StudentSessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as StudentSessionPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export interface SchoolAdminSessionPayload {
  schoolId: string;
  schoolSlug: string;
  email: string;
  name: string;
  role: "school_admin";
}

export function signSchoolSession(payload: SchoolAdminSessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifySchoolSession(token: string): SchoolAdminSessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SchoolAdminSessionPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}
