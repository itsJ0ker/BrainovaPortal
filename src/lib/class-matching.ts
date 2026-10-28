/**
 * Robust class/grade normalization and matching utility.
 * Handles variations such as:
 * - "Grade 10", "grade 10", "Class 10", "std 10", "10th", "10"
 * - "Grade 8", "grade 8", "8th", "8"
 * - Custom cohorts such as "Foundation Batch", "Advanced Placement"
 */

export function normalizeClassName(className: string): string {
  if (!className) return "";
  const trimmed = className.trim().toLowerCase();

  // Pattern matches "grade 10", "class 10", "std 10", "standard 10", "10th", "10", etc.
  const numericMatch = trimmed.match(/^(?:grade|class|std|standard)?\s*(\d+)(?:st|nd|rd|th)?$/i);
  if (numericMatch) {
    return numericMatch[1]; // Returns just the grade number (e.g., "10", "8")
  }

  // Also remove extra punctuation/spaces for non-numeric names
  return trimmed.replace(/\s+/g, " ");
}

export function isClassEligible(studentClass: string, allowedClasses: string[]): boolean {
  if (!studentClass || !allowedClasses || allowedClasses.length === 0) return false;

  const studentLower = studentClass.trim().toLowerCase();
  const normalizedStudent = normalizeClassName(studentClass);

  return allowedClasses.some((allowed) => {
    if (!allowed) return false;
    const allowedLower = allowed.trim().toLowerCase();

    // 1. Exact string match (case-insensitive)
    if (allowedLower === studentLower) return true;

    // 2. Normalized numeric match (e.g. "Grade 10" matches "10" or "Class 10")
    const normalizedAllowed = normalizeClassName(allowed);
    if (normalizedAllowed && normalizedStudent && normalizedAllowed === normalizedStudent) {
      return true;
    }

    return false;
  });
}
