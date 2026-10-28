import { IExam, IQuestion, IStudentResponse, IQuestionEvaluation } from "@/types";

export interface EvaluationResult {
  scores: {
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    mcqMarks: number;
    writtenMarks: number;
    isGradingComplete: boolean;
  };
  questionEvaluations: IQuestionEvaluation[];
}

/**
 * Auto-grades MCQ, true/false, and handles negative marking.
 * Flags written questions for manual teacher grading.
 */
export function evaluateAttempt(
  exam: IExam,
  responses: IStudentResponse[],
  existingEvaluations: IQuestionEvaluation[] = []
): EvaluationResult {
  const existingEvalMap = new Map(existingEvaluations.map((e) => [e.questionId, e]));
  const responseMap = new Map(responses.map((r) => [r.questionId, r]));

  let totalMaxMarks = 0;
  let mcqMarks = 0;
  let writtenMarks = 0;
  let hasPendingWritten = false;

  const newEvaluations: IQuestionEvaluation[] = [];

  for (const q of exam.questions) {
    const qPoints = q.points || 1;
    const qNeg = q.negativePoints || 0;
    totalMaxMarks += qPoints;

    const resp = responseMap.get(q.id);

    if (q.type === "written") {
      // Check if already graded manually
      const existing = existingEvalMap.get(q.id);
      if (existing && !existing.isAutoGraded) {
        writtenMarks += existing.marksAwarded;
        newEvaluations.push(existing);
      } else {
        hasPendingWritten = true;
        newEvaluations.push({
          questionId: q.id,
          marksAwarded: 0,
          maxMarks: qPoints,
          isAutoGraded: false,
          feedback: "",
        });
      }
      continue;
    }

    // Auto-grade MCQs & True/False
    let isCorrect = false;
    let isAttempted = false;

    if (q.type === "single_choice") {
      const selected = resp?.selectedOptions?.[0];
      if (selected !== undefined && selected !== "") {
        isAttempted = true;
        isCorrect = selected === q.correctAnswer;
      }
    } else if (q.type === "true_false") {
      const selected = resp?.selectedOptions?.[0];
      if (selected !== undefined && selected !== "") {
        isAttempted = true;
        isCorrect = String(selected).toLowerCase() === String(q.correctAnswer).toLowerCase();
      }
    } else if (q.type === "multiple_choice") {
      const selectedSet = new Set(resp?.selectedOptions || []);
      const correctList: string[] = Array.isArray(q.correctAnswer)
        ? (q.correctAnswer as string[])
        : [String(q.correctAnswer)];
      const correctSet = new Set(correctList);

      if (selectedSet.size > 0) {
        isAttempted = true;
        // Exact match for multiple choice
        isCorrect =
          selectedSet.size === correctSet.size &&
          [...selectedSet].every((val) => correctSet.has(val));
      }
    }

    let marks = 0;
    if (isAttempted) {
      if (isCorrect) {
        marks = qPoints;
      } else if (qNeg > 0) {
        marks = -qNeg;
      }
    }

    mcqMarks += marks;
    newEvaluations.push({
      questionId: q.id,
      marksAwarded: marks,
      maxMarks: qPoints,
      isAutoGraded: true,
      feedback: isCorrect ? "Correct" : isAttempted ? "Incorrect" : "Unattempted",
    });
  }

  const netTotal = Math.max(0, mcqMarks + writtenMarks);
  const percentage = totalMaxMarks > 0 ? Math.round((netTotal / totalMaxMarks) * 100) : 0;

  return {
    scores: {
      totalMarks: Number(netTotal.toFixed(2)),
      maxMarks: totalMaxMarks,
      percentage,
      mcqMarks: Number(mcqMarks.toFixed(2)),
      writtenMarks: Number(writtenMarks.toFixed(2)),
      isGradingComplete: !hasPendingWritten,
    },
    questionEvaluations: newEvaluations,
  };
}
