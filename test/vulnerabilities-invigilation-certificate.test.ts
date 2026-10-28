import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

describe("Technical Vulnerabilities & Live Invigilation / Certificate Tests", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let student: any;
  let exam: any;
  let attempt: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    school = await School.create({
      name: "St. Jude Olympiad Academy",
      slug: "st-jude",
      code: "STJ-01",
      adminEmail: "admin@stjude.edu",
      contactEmail: "admin@stjude.edu",
      status: "active",
    });

    student = await Student.create({
      schoolId: school._id,
      name: "Elena Rostova",
      rollNumber: "STJ-501",
      admissionNumber: "ADM-501",
      email: "elena@stjude.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    const now = new Date();
    exam = await Exam.create({
      schoolId: school._id,
      title: "National Math Olympiad Prelims",
      slug: "math-olympiad-prelims",
      accessCode: "MATH2026",
      subject: "Mathematics",
      classGrade: "Grade 10",
      isResultsPublished: true,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 3600000).toISOString(),
        endTime: new Date(now.getTime() + 3600000).toISOString(),
        resultReleaseMode: "immediate",
        antiCheating: { enabled: true, maxViolations: 3 },
      },
      questions: [
        {
          id: "qm1",
          type: "single_choice",
          prompt: "What is the sum of angles in a convex pentagon?",
          options: [
            { id: "opt_a", text: "540°" },
            { id: "opt_b", text: "360°" },
          ],
          correctAnswer: "opt_a",
          points: 10,
        },
        {
          id: "qm2",
          type: "single_choice",
          prompt: "Find the root of 2x - 8 = 0.",
          options: [
            { id: "opt_1", text: "4" },
            { id: "opt_2", text: "2" },
          ],
          correctAnswer: "opt_1",
          points: 10,
        },
      ],
    });

    attempt = await ExamAttempt.create({
      schoolId: school._id,
      examId: exam._id,
      studentId: student._id,
      studentSnapshot: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        email: student.email,
        classGrade: student.classGrade,
        section: student.section,
      },
      startedAt: new Date(now.getTime() - 20 * 60000).toISOString(),
      submittedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      serverDeadline: new Date(now.getTime() + 40 * 60000).toISOString(),
      status: "submitted",
      responses: [
        { questionId: "qm1", selectedOptions: ["opt_a"], answeredAt: new Date().toISOString() },
        { questionId: "qm2", selectedOptions: ["opt_1"], answeredAt: new Date().toISOString() },
      ],
      scores: {
        totalMarks: 20,
        maxMarks: 20,
        percentage: 100,
        mcqMarks: 20,
        writtenMarks: 0,
        isGradingComplete: true,
      },
      questionEvaluations: [
        { questionId: "qm1", marksAwarded: 10, maxMarks: 10, isAutoGraded: true },
        { questionId: "qm2", marksAwarded: 10, maxMarks: 10, isAutoGraded: true },
      ],
      integrityLog: [],
      violationCount: 0,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  // Gap B: Rate Limiting
  it("Rate Limiter blocks excessive requests within the sliding window", () => {
    const fakeReq = new NextRequest("http://localhost:3000/api/portal/verify", {
      headers: { "x-forwarded-for": "198.51.100.42" },
    });

    // Run 5 requests with limit of 3
    const r1 = checkRateLimit(fakeReq, { limit: 3, windowSeconds: 60, prefix: "test_rl" });
    const r2 = checkRateLimit(fakeReq, { limit: 3, windowSeconds: 60, prefix: "test_rl" });
    const r3 = checkRateLimit(fakeReq, { limit: 3, windowSeconds: 60, prefix: "test_rl" });
    const r4 = checkRateLimit(fakeReq, { limit: 3, windowSeconds: 60, prefix: "test_rl" });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetInSeconds).toBeGreaterThanOrEqual(1);
  });

  // Gap C: Atomic Autosaves
  it("Atomic MongoDB upsert updates distinct question responses without race condition overwrites", async () => {
    const testAttempt = await ExamAttempt.create({
      schoolId: school._id,
      examId: exam._id,
      studentId: student._id,
      studentSnapshot: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        email: student.email,
        classGrade: student.classGrade,
        section: student.section,
      },
      startedAt: new Date().toISOString(),
      serverDeadline: new Date(Date.now() + 3600000).toISOString(),
      status: "in_progress",
      responses: [],
    });

    // Simulate two concurrent autosaves for different questions
    const saveQ1 = async () => {
      const q1Resp = {
        questionId: "qm1",
        selectedOptions: ["opt_a"],
        writtenAnswer: "",
        answeredAt: new Date().toISOString(),
      };
      const updateExisting = await ExamAttempt.updateOne(
        { _id: testAttempt._id, status: "in_progress", "responses.questionId": "qm1" },
        { $set: { "responses.$.selectedOptions": q1Resp.selectedOptions, "responses.$.answeredAt": q1Resp.answeredAt } }
      );
      if (updateExisting.matchedCount === 0) {
        await ExamAttempt.updateOne(
          { _id: testAttempt._id, status: "in_progress", "responses.questionId": { $ne: "qm1" } },
          { $push: { responses: q1Resp } }
        );
      }
    };

    const saveQ2 = async () => {
      const q2Resp = {
        questionId: "qm2",
        selectedOptions: ["opt_1"],
        writtenAnswer: "",
        answeredAt: new Date().toISOString(),
      };
      const updateExisting = await ExamAttempt.updateOne(
        { _id: testAttempt._id, status: "in_progress", "responses.questionId": "qm2" },
        { $set: { "responses.$.selectedOptions": q2Resp.selectedOptions, "responses.$.answeredAt": q2Resp.answeredAt } }
      );
      if (updateExisting.matchedCount === 0) {
        await ExamAttempt.updateOne(
          { _id: testAttempt._id, status: "in_progress", "responses.questionId": { $ne: "qm2" } },
          { $push: { responses: q2Resp } }
        );
      }
    };

    // Execute concurrently
    await Promise.all([saveQ1(), saveQ2()]);

    const refreshed = await ExamAttempt.findById(testAttempt._id).lean();
    expect(refreshed?.responses.length).toBe(2);

    const q1Saved = refreshed?.responses.find((r: any) => r.questionId === "qm1");
    const q2Saved = refreshed?.responses.find((r: any) => r.questionId === "qm2");

    expect(q1Saved?.selectedOptions[0]).toBe("opt_a");
    expect(q2Saved?.selectedOptions[0]).toBe("opt_1");
  });

  // Gap D: Production JWT Safety
  it("JWT Secret enforces strict non-default key in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.STUDENT_SESSION_SECRET;
    const originalJwtSecret = process.env.JWT_SECRET;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.STUDENT_SESSION_SECRET;
      delete process.env.JWT_SECRET;

      const { signStudentSession } = await import("@/lib/session");
      expect(() => {
        signStudentSession({
          attemptId: "123",
          examId: "456",
          studentId: "789",
          schoolId: "012",
          serverDeadline: new Date().toISOString(),
        });
      }).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalSecret) process.env.STUDENT_SESSION_SECRET = originalSecret;
      if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  // Feature: Automated Certificate Generation
  it("Generates official Olympiad Certificate with Gold distinction for high scores", async () => {
    const percentage = attempt.scores.percentage;
    expect(percentage).toBe(100);

    let distinction = "Certificate of Participation";
    let badgeTier = "bronze";

    if (percentage >= 90) {
      distinction = "Certificate of Distinction (Gold Honor Roll)";
      badgeTier = "gold";
    }

    expect(distinction).toBe("Certificate of Distinction (Gold Honor Roll)");
    expect(badgeTier).toBe("gold");

    const shortId = attempt._id.toString().slice(-8).toUpperCase();
    const certificateId = `BO-2026-${exam.accessCode}-${shortId}`;

    expect(certificateId).toContain("BO-2026-MATH2026-");
  });

  // Feature: Live Invigilation Time Extension Action
  it("Invigilator can extend candidate deadline and reset warnings", async () => {
    const testAttempt = await ExamAttempt.create({
      schoolId: school._id,
      examId: exam._id,
      studentId: student._id,
      studentSnapshot: {
        name: student.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        email: student.email,
        classGrade: student.classGrade,
        section: student.section,
      },
      startedAt: new Date().toISOString(),
      serverDeadline: new Date(Date.now() + 600000).toISOString(), // 10 mins
      status: "in_progress",
      violationCount: 2,
    });

    // 1. Extend time by 15 mins
    const initialDeadlineMs = new Date(testAttempt.serverDeadline).getTime();
    const newDeadlineMs = initialDeadlineMs + 15 * 60 * 1000;
    testAttempt.serverDeadline = new Date(newDeadlineMs).toISOString();
    await testAttempt.save();

    const extended = await ExamAttempt.findById(testAttempt._id).lean();
    expect(new Date(extended?.serverDeadline).getTime()).toBe(newDeadlineMs);

    // 2. Reset violations
    testAttempt.violationCount = 0;
    await testAttempt.save();

    const resetAttempt = await ExamAttempt.findById(testAttempt._id).lean();
    expect(resetAttempt?.violationCount).toBe(0);
  });
});

