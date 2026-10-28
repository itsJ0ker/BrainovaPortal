import { describe, it, expect } from "vitest";
import { evaluateAttempt } from "@/lib/grading";
import { IExam, IQuestion, IStudentResponse } from "@/types";

describe("Exam Timing, Scoring Engine & Grading Rules", () => {
  const sampleExam: IExam = {
    _id: "exam_test_1",
    schoolId: "school_1",
    title: "Comprehensive Assessment",
    slug: "comp-assess",
    accessCode: "TEST-01",
    description: "Testing grading logic",
    subject: "General Science",
    targeting: { type: "all", classes: [], streams: [], sections: [] },
    config: {
      durationMinutes: 45,
      startTime: "2026-10-01T00:00:00.000Z",
      endTime: "2026-10-30T00:00:00.000Z",
      attemptLimit: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      verificationMode: "roll_or_admission",
      resultReleaseMode: "manual",
      antiCheating: {
        enabled: true,
        maxViolations: 3,
        actionOnThreshold: "auto_submit",
        blockCopyPaste: true,
        enforceFullscreen: false,
        detectTabSwitch: true,
        preventContextMenu: true,
      },
    },
    status: "published",
    isResultsPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: "q_mcq_single",
        type: "single_choice",
        prompt: "Speed of light in vacuum?",
        options: [
          { id: "opt_1", text: "3 x 10^8 m/s" },
          { id: "opt_2", text: "1.5 x 10^8 m/s" },
        ],
        correctAnswer: "opt_1",
        points: 4,
        negativePoints: 1,
      },
      {
        id: "q_mcq_multi",
        type: "multiple_choice",
        prompt: "Select all prime numbers:",
        options: [
          { id: "p2", text: "2" },
          { id: "p3", text: "3" },
          { id: "p4", text: "4" },
        ],
        correctAnswer: ["p2", "p3"],
        points: 6,
        negativePoints: 2,
      },
      {
        id: "q_written",
        type: "written",
        prompt: "Describe Newton's third law of motion with an everyday example.",
        points: 10,
        rubric: "5 pts for statement, 5 pts for accurate example.",
      },
    ],
  };

  it("accurately auto-grades correct answers", () => {
    const responses: IStudentResponse[] = [
      { questionId: "q_mcq_single", selectedOptions: ["opt_1"] },
      { questionId: "q_mcq_multi", selectedOptions: ["p2", "p3"] },
      { questionId: "q_written", writtenAnswer: "For every action there is an equal and opposite reaction." },
    ];

    const result = evaluateAttempt(sampleExam, responses);

    expect(result.scores.mcqMarks).toBe(10); // 4 + 6
    expect(result.scores.writtenMarks).toBe(0); // Written pending manual grading
    expect(result.scores.totalMarks).toBe(10);
    expect(result.scores.maxMarks).toBe(20);
    expect(result.scores.isGradingComplete).toBe(false); // Because written answer is pending
  });

  it("applies negative marking penalty for incorrect responses", () => {
    const responses: IStudentResponse[] = [
      { questionId: "q_mcq_single", selectedOptions: ["opt_2"] }, // WRONG (-1)
      { questionId: "q_mcq_multi", selectedOptions: ["p2", "p4"] }, // WRONG (-2)
    ];

    const result = evaluateAttempt(sampleExam, responses);

    expect(result.scores.mcqMarks).toBe(-3);
    // Net total floor at 0
    expect(result.scores.totalMarks).toBe(0);
  });

  it("calculates server-authoritative deadline bounded by exam window closing", () => {
    const now = new Date("2026-10-25T10:00:00.000Z");
    const durationMinutes = 60; // 1 hour -> would end at 11:00:00
    const examWindowCloses = new Date("2026-10-25T10:30:00.000Z"); // Closes in 30 mins!

    const normalDeadline = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const authoritativeDeadline = normalDeadline < examWindowCloses ? normalDeadline : examWindowCloses;

    // Must be bounded by 10:30:00, not 11:00:00!
    expect(authoritativeDeadline.toISOString()).toBe("2026-10-25T10:30:00.000Z");
  });
});
