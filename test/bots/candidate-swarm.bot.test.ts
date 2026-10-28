import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { NextRequest } from "next/server";
import { POST as verifyRoute } from "@/app/api/portal/verify/route";
import { POST as saveRoute } from "@/app/api/portal/attempt/save/route";
import { POST as submitRoute } from "@/app/api/portal/attempt/submit/route";

describe("Bot Testing Team: Candidate Swarm Bot (Multi-User Concurrency & Load Simulation)", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let exam: any;
  const NUM_STUDENT_BOTS = 20;
  const studentBots: any[] = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    // 1. Establish School
    school = await School.create({
      name: "Brainova International Olympiad Center",
      slug: "brainova-olympiad",
      code: "BIO-2026",
      adminEmail: "director@brainova.edu",
      contactEmail: "info@brainova.edu",
      status: "active",
    });

    // 2. Create 20 Student Roster Bots
    for (let i = 1; i <= NUM_STUDENT_BOTS; i++) {
      const roll = `BIO-BOT-${String(i).padStart(3, "0")}`;
      const bot = await Student.create({
        schoolId: school._id,
        name: `Candidate Bot ${i}`,
        rollNumber: roll,
        admissionNumber: `ADM-BOT-${String(i).padStart(3, "0")}`,
        email: `bot${i}@brainova.edu`,
        classGrade: "Grade 10",
        section: i % 2 === 0 ? "A" : "B",
        status: "active",
      });
      studentBots.push(bot);
    }

    const now = new Date();
    // 3. Create Multi-Question Olympiad Exam
    exam = await Exam.create({
      schoolId: school._id,
      title: "Brainova National Science & Logic Olympiad",
      slug: "brainova-science-logic-2026",
      accessCode: "OLYMP-2026",
      subject: "Science & Logic",
      classGrade: "Grade 10",
      status: "published",
      targeting: {
        type: "all",
      },
      isResultsPublished: true,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "immediate",
        shuffleQuestions: true,
        shuffleOptions: true,
        antiCheating: {
          enabled: true,
          maxViolations: 3,
          actionOnThreshold: "auto_submit",
        },
      },
      questions: [
        {
          id: "q_phy_1",
          type: "single_choice",
          prompt: "What is the SI unit of electric potential difference?",
          options: [
            { id: "opt_volt", text: "Volt" },
            { id: "opt_ampere", text: "Ampere" },
            { id: "opt_ohm", text: "Ohm" },
            { id: "opt_watt", text: "Watt" },
          ],
          correctAnswer: "opt_volt",
          points: 10,
        },
        {
          id: "q_chem_1",
          type: "single_choice",
          prompt: "What is the pH of pure water at standard room temperature (25°C)?",
          options: [
            { id: "opt_7", text: "7.0" },
            { id: "opt_1", text: "1.0" },
            { id: "opt_14", text: "14.0" },
          ],
          correctAnswer: "opt_7",
          points: 10,
        },
        {
          id: "q_logic_1",
          type: "true_false",
          prompt: "All prime numbers greater than 2 are odd numbers.",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ],
          correctAnswer: "true",
          points: 10,
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("handles 20 concurrent student bots verifying and launching exams simultaneously", async () => {
    const verificationPromises = studentBots.map(async (bot, idx) => {
      const req = new NextRequest("http://localhost:3000/api/portal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `192.168.10.${idx + 1}`, // Unique client IPs to simulate real-world swarm
        },
        body: JSON.stringify({
          accessCode: "OLYMP-2026",
          rollNumber: bot.rollNumber,
          name: bot.name,
        }),
      });

      const res = await verifyRoute(req);
      const data = await res.json();
      return { bot, status: res.status, data };
    });

    const results = await Promise.all(verificationPromises);

    // Verify all 20 succeeded
    expect(results.length).toBe(20);
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.data.success).toBe(true);
      expect(r.data.sessionToken).toBeTruthy();
      expect(r.data.attempt.id).toBeTruthy();
      expect(r.data.exam.questions.length).toBe(3);

      // Verify that questions are properly sanitized (NO answers leaked)
      for (const q of r.data.exam.questions) {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.rubric).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    }

    // Verify 20 attempts created in DB
    const attemptCount = await ExamAttempt.countDocuments({ examId: exam._id });
    expect(attemptCount).toBe(20);
  });

  it("handles high-frequency concurrent autosaves across distinct questions without race condition data loss", async () => {
    // Specifically target the first 5 bots to simulate rapid concurrent saves
    for (let i = 0; i < 5; i++) {
      const bot = studentBots[i];
      const att = await ExamAttempt.findOne({ examId: exam._id, studentId: bot._id });
      expect(att).toBeDefined();

      const studentId = att.studentId.toString();

      // Sign mock student session
      const { signStudentSession } = await import("@/lib/session");
      const token = signStudentSession({
        attemptId: att._id.toString(),
        examId: exam._id.toString(),
        studentId: studentId,
        schoolId: school._id.toString(),
        serverDeadline: att.serverDeadline,
      });

      // Rapidly fire 3 concurrent saves for 3 different questions
      const savePromises = [
        saveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionId: "q_phy_1",
              selectedOptions: ["opt_volt"],
            }),
          })
        ),
        saveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionId: "q_chem_1",
              selectedOptions: ["opt_7"],
            }),
          })
        ),
        saveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionId: "q_logic_1",
              selectedOptions: ["true"],
            }),
          })
        ),
      ];

      const responses = await Promise.all(savePromises);
      for (const res of responses) {
        const body = await res.json();
        expect(body.success).toBe(true);
      }

      // Check DB attempt has all 3 questions saved
      const refreshed = await ExamAttempt.findById(att._id).lean();
      expect(refreshed?.responses.length).toBe(3);
      const qIds = refreshed?.responses.map((r: any) => r.questionId);
      expect(qIds).toContain("q_phy_1");
      expect(qIds).toContain("q_chem_1");
      expect(qIds).toContain("q_logic_1");
    }
  });

  it("supports seamless student bot session resumption upon disconnection or page refresh", async () => {
    const botToTest = studentBots[0];
    const req = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.10.1",
      },
      body: JSON.stringify({
        accessCode: "OLYMP-2026",
        rollNumber: botToTest.rollNumber,
      }),
    });

    const res = await verifyRoute(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.isResuming).toBe(true);
    expect(data.attempt.responses.length).toBe(3); // Answers previously saved are preserved
  });

  it("handles 20 concurrent student bot final submissions and auto-evaluates without interference", async () => {
    const attempts = await ExamAttempt.find({ examId: exam._id });
    const { signStudentSession } = await import("@/lib/session");

    const submissionPromises = attempts.map(async (att: any, idx: number) => {
      const token = signStudentSession({
        attemptId: att._id.toString(),
        examId: exam._id.toString(),
        studentId: att.studentId.toString(),
        schoolId: school._id.toString(),
        serverDeadline: att.serverDeadline,
      });

      const req = new NextRequest("http://localhost:3000/api/portal/attempt/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const res = await submitRoute(req);
      const data = await res.json();
      return { idx, status: res.status, data };
    });

    const results = await Promise.all(submissionPromises);

    expect(results.length).toBe(20);
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.data.success).toBe(true);
      expect(r.data.attemptId).toBeTruthy();
    }

    // Verify all 20 attempts are marked as submitted and have scores computed
    const submittedAttempts = await ExamAttempt.find({ examId: exam._id, status: "submitted" });
    expect(submittedAttempts.length).toBe(20);

    // The first 5 bots who answered all 3 questions correctly should have 30 marks (100%)
    for (let i = 0; i < 5; i++) {
      const att = submittedAttempts.find((a: any) => a.studentSnapshot.rollNumber === studentBots[i].rollNumber);
      expect(att).toBeDefined();
      expect(att.scores.totalMarks).toBe(30);
      expect(att.scores.percentage).toBe(100);
      expect(att.scores.isGradingComplete).toBe(true);
    }
  });
});
