import { IExam, IQuestion, IQuestionOption } from "@/types";

/**
 * Pure pseudo-random generator seeded with a string (e.g. attemptId or studentId)
 * Ensures reproducible shuffling across refreshes.
 */
function seededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sanitizes questions for student view:
 * 1. REMOVES correctAnswer, rubric, and explanation
 * 2. Optionally shuffles questions & options deterministically based on seed
 */
export function sanitizeQuestionsForStudent(
  questions: IQuestion[],
  options: {
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    seed?: string;
    orderedQuestionIds?: string[];
  }
): IQuestion[] {
  const rng = seededRandom(options.seed || "default-seed-exam");

  let sanitized = questions.map((q) => {
    let opts = q.options ? [...q.options] : [];
    if (options.shuffleOptions && opts.length > 1) {
      opts = shuffleArray(opts, rng);
    }

    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: opts,
      points: q.points,
      negativePoints: q.negativePoints,
      // Omit correctAnswer, rubric, explanation
    } as IQuestion;
  });

  // Preserve stored order if already established for this attempt
  if (options.orderedQuestionIds && options.orderedQuestionIds.length > 0) {
    const qMap = new Map(sanitized.map((q) => [q.id, q]));
    const reordered: IQuestion[] = [];
    for (const qId of options.orderedQuestionIds) {
      const found = qMap.get(qId);
      if (found) reordered.push(found);
    }
    // Append any questions not in stored order
    for (const q of sanitized) {
      if (!options.orderedQuestionIds.includes(q.id)) {
        reordered.push(q);
      }
    }
    return reordered;
  }

  if (options.shuffleQuestions && sanitized.length > 1) {
    sanitized = shuffleArray(sanitized, rng);
  }

  return sanitized;
}
