import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { NextRequest } from "next/server";
import { POST as eventRoute } from "@/app/api/portal/attempt/event/route";
import { POST as saveRoute } from "@/app/api/portal/attempt/save/route";
import { signStudentSession } from "@/lib/session";

describe("Bot Testing Team: Anti-Cheating & Integrity Stress Bot", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let student: any;
  let exam: any;
  let attempt: any;
  let sessionToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    school = await School.create({
      name: "Integrity Verification Institute",
      slug: "integrity-inst",
      code: "IVI-01",
      adminEmail: "proctor@integrity.edu",
      contactEmail: "proctor@integrity.edu",
      status: "active",
    });

    student = await Student.create({
      schoolId: school._id,
      name: "Marcus Hackson",
      rollNumber: "IVI-999",
      admissionNumber: "ADM-IVI-999",
      email: "marcus@integrity.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    const now = new Date();
    exam = await Exam.create({
      schoolId: school._id,
      title: "Strict High-Stakes Olympiad",
      slug: "strict-olympiad-2026",
      accessCode: "STRICT-2026",
      subject: "Computer Science",
      classGrade: "Grade 10",
      status: "published",
      isResultsPublished: true,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "immediate",
        antiCheating: {
          enabled: true,
          maxViolations: 3,
          actionOnThreshold: "auto_submit",
        },
      },
      questions: [
        {
          id: "q_cs_1",
          type: "single_choice",
          prompt: "What is time complexity of binary search?",
          options: [
            { id: "opt_logn", text: "O(log n)" },
            { id: "opt_n", text: "O(n)" },
          ],
          correctAnswer: "opt_logn",
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
      startedAt: now.toISOString(),
      serverDeadline: new Date(now.getTime() + 60 * 60000).toISOString(),
      status: "in_progress",
      responses: [{ questionId: "q_cs_1", selectedOptions: ["opt_logn"] }],
      scores: {
        totalMarks: 0,
        maxMarks: 10,
        percentage: 0,
        mcqMarks: 0,
        writtenMarks: 0,
        isGradingComplete: false,
      },
      integrityLog: [],
      violationCount: 0,
    });

    sessionToken = signStudentSession({
      attemptId: attempt._id.toString(),
      examId: exam._id.toString(),
      studentId: student._id.toString(),
      schoolId: school._id.toString(),
      serverDeadline: attempt.serverDeadline,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("deduplicates companion focus_loss events occurring within 2000ms of a tab_switch", async () => {
    // 1. Send tab_switch
    const req1 = new NextRequest("http://localhost:3000/api/portal/attempt/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        type: "tab_switch",
        details: "Candidate switched to Chrome DevTools window",
      }),
    });

    const res1 = await eventRoute(req1);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.violationCount).toBe(1);
    expect(data1.remainingWarnings).toBe(2);
    expect(data1.deduplicated).toBeFalsy();

    // 2. Immediately send focus_loss (companion browser event fired in tandem)
    const req2 = new NextRequest("http://localhost:3000/api/portal/attempt/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        type: "focus_loss",
        details: "Candidate window lost focus",
      }),
    });

    const res2 = await eventRoute(req2);
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.deduplicated).toBe(true);
    expect(data2.violationCount).toBe(1); // Violation count did NOT increment to 2!
  });

  it("deduplicates identical violation events arriving in rapid succession within 2000ms", async () => {
    const reqDuplicate = new NextRequest("http://localhost:3000/api/portal/attempt/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        type: "tab_switch",
        details: "Duplicate rapid tab switch burst",
      }),
    });

    const resDuplicate = await eventRoute(reqDuplicate);
    const dataDuplicate = await resDuplicate.json();
    expect(dataDuplicate.success).toBe(true);
    expect(dataDuplicate.deduplicated).toBe(true);
    expect(dataDuplicate.violationCount).toBe(1); // Still 1
  });

  it("automatically submits and evaluates the exam when violation threshold is reached", async () => {
    // Simulate time passing beyond 2000ms window by backdating the last event in DB
    await ExamAttempt.updateOne(
      { _id: attempt._id },
      { $set: { "integrityLog.0.timestamp": new Date(Date.now() - 5000).toISOString() } }
    );

    // Violation 2: devtools_attempt
    const reqV2 = new NextRequest("http://localhost:3000/api/portal/attempt/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        type: "devtools_attempt",
        details: "Candidate opened F12 developer console",
      }),
    });
    const resV2 = await eventRoute(reqV2);
    const dataV2 = await resV2.json();
    expect(dataV2.violationCount).toBe(2);
    expect(dataV2.remainingWarnings).toBe(1);
    expect(dataV2.autoSubmitted).toBe(false);

    // Backdate again
    await ExamAttempt.updateOne(
      { _id: attempt._id },
      { $set: { "integrityLog.1.timestamp": new Date(Date.now() - 5000).toISOString() } }
    );

    // Violation 3: copy_paste_attempt (THREHOLD REACHED!)
    const reqV3 = new NextRequest("http://localhost:3000/api/portal/attempt/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        type: "copy_paste_attempt",
        details: "Candidate attempted to copy question prompt",
      }),
    });
    const resV3 = await eventRoute(reqV3);
    const dataV3 = await resV3.json();

    expect(dataV3.success).toBe(true);
    expect(dataV3.violationCount).toBe(3);
    expect(dataV3.autoSubmitted).toBe(true);
    expect(dataV3.remainingWarnings).toBe(0);
    expect(dataV3.status).toBe("auto_submitted");

    // Verify DB attempt record
    const updatedAttempt = await ExamAttempt.findById(attempt._id).lean();
    expect(updatedAttempt?.status).toBe("auto_submitted");
    expect(updatedAttempt?.scores?.totalMarks).toBe(10); // Auto-evaluated response (opt_logn was correct!)
    expect(updatedAttempt?.scores?.percentage).toBe(100);
    expect(updatedAttempt?.submittedAt).toBeTruthy();
  });

  it("strictly prevents answer modifications after an attempt has been auto-submitted for cheating", async () => {
    const saveReq = new NextRequest("http://localhost:3000/api/portal/attempt/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        questionId: "q_cs_1",
        selectedOptions: ["opt_n"], // Attempting to change answer
      }),
    });

    const saveRes = await saveRoute(saveReq);
    expect(saveRes.status).toBe(400);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(false);
    expect(saveData.isFinalized).toBe(true);
    expect(saveData.error).toMatch(/already been submitted/);

    // Verify answer was NOT altered
    const dbAttempt = await ExamAttempt.findById(attempt._id).lean();
    expect(dbAttempt?.responses[0].selectedOptions[0]).toBe("opt_logn");
  });
});

