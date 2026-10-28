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
import { GET as examInfoRoute } from "@/app/api/portal/exam-info/route";
import { GET as resultRoute } from "@/app/api/portal/attempt/result/route";
import { POST as historyRoute } from "@/app/api/portal/history/route";
import { GET as schoolStudentsRoute } from "@/app/api/school/[schoolId]/students/route";
import { signStudentSession, signSchoolSession } from "@/lib/session";
import jwt from "jsonwebtoken";

describe("Bot Testing Team: Security & Red Team Penetration Bot", () => {
  let mongod: MongoMemoryServer;
  let schoolAlpha: any;
  let schoolBeta: any;
  let studentAlpha: any;
  let studentBeta: any;
  let studentGrade9: any;
  let studentSectionB: any;
  let studentInactive: any;
  let examAlpha: any;
  let examTargeted: any;
  let examUnpublished: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    // 1. Setup School Alpha (Target)
    schoolAlpha = await School.create({
      name: "Alpha Olympiad Academy",
      slug: "alpha-academy",
      code: "ALP-01",
      adminEmail: "admin@alpha.edu",
      contactEmail: "admin@alpha.edu",
      status: "active",
    });

    // 2. Setup School Beta (Attacker Tenant)
    schoolBeta = await School.create({
      name: "Beta Collegiate",
      slug: "beta-collegiate",
      code: "BET-02",
      adminEmail: "admin@beta.edu",
      contactEmail: "admin@beta.edu",
      status: "active",
    });

    // 3. Setup Students
    studentAlpha = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Alice Alpha",
      rollNumber: "ALP-101",
      admissionNumber: "ADM-ALP-101",
      email: "alice@alpha.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    studentBeta = await Student.create({
      schoolId: schoolBeta._id,
      name: "Bob Beta",
      rollNumber: "BET-201",
      admissionNumber: "ADM-BET-201",
      email: "bob@beta.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    studentGrade9 = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Charlie Grade 9",
      rollNumber: "ALP-102",
      admissionNumber: "ADM-ALP-102",
      email: "charlie@alpha.edu",
      classGrade: "Grade 9",
      section: "A",
      status: "active",
    });

    studentSectionB = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Diana Section B",
      rollNumber: "ALP-103",
      admissionNumber: "ADM-ALP-103",
      email: "diana@alpha.edu",
      classGrade: "Grade 10",
      section: "B",
      status: "active",
    });

    studentInactive = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Evan Suspended",
      rollNumber: "ALP-104",
      admissionNumber: "ADM-ALP-104",
      email: "evan@alpha.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "inactive",
    });

    const now = new Date();

    // 4. Create Standard Exam in Alpha
    examAlpha = await Exam.create({
      schoolId: schoolAlpha._id,
      title: "Alpha Olympiad Prelims",
      slug: "alpha-prelims-2026",
      accessCode: "ALPHA-2026",
      subject: "Science",
      classGrade: "Grade 10",
      status: "published",
      isResultsPublished: true,
      config: {
        durationMinutes: 45,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "immediate",
        attemptLimit: 1,
        antiCheating: { enabled: true, maxViolations: 3 },
      },
      questions: [
        {
          id: "q_sec_1",
          type: "single_choice",
          prompt: "What is the speed of light in vacuum?",
          options: [
            { id: "opt_c", text: "299,792,458 m/s" },
            { id: "opt_sound", text: "343 m/s" },
          ],
          correctAnswer: "opt_c",
          rubric: "Strict match on vacuum speed of light",
          explanation: "c is universally defined in SI units as 299,792,458 m/s.",
          points: 10,
        },
      ],
    });

    // 5. Create Strict Targeted Exam in Alpha (Grade 10 Section A only)
    examTargeted = await Exam.create({
      schoolId: schoolAlpha._id,
      title: "Alpha Elite Section A Invitational",
      slug: "alpha-elite-sec-a",
      accessCode: "ALPHA-SEC-A",
      subject: "Mathematics",
      classGrade: "Grade 10",
      status: "published",
      targeting: {
        type: "class_section",
        classes: ["Grade 10"],
        sections: ["A"],
      },
      config: {
        durationMinutes: 30,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "immediate",
      },
      questions: [
        {
          id: "q_m_1",
          type: "single_choice",
          prompt: "What is 2^10?",
          options: [
            { id: "opt_1024", text: "1024" },
            { id: "opt_2048", text: "2048" },
          ],
          correctAnswer: "opt_1024",
          points: 10,
        },
      ],
    });

    // 6. Create Unpublished Exam in Alpha
    examUnpublished = await Exam.create({
      schoolId: schoolAlpha._id,
      title: "Alpha Secret Finals",
      slug: "alpha-secret-finals",
      accessCode: "SECRET-2026",
      subject: "Advanced Physics",
      classGrade: "Grade 10",
      status: "published",
      isResultsPublished: false,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "manual",
      },
      questions: [
        {
          id: "q_secret_1",
          type: "single_choice",
          prompt: "Quantum entanglement question with secret answer",
          options: [
            { id: "opt_correct", text: "Spin conservation" },
            { id: "opt_wrong", text: "Classic decay" },
          ],
          correctAnswer: "opt_correct",
          rubric: "Answer must explain non-locality",
          explanation: "Bell's inequality violations prove non-locality.",
          points: 10,
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  // Vector 1: Cross-Tenant Isolation
  it("blocks School Beta candidate from verifying or taking School Alpha exam", async () => {
    const req = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.1",
      },
      body: JSON.stringify({
        accessCode: "ALPHA-2026",
        rollNumber: studentBeta.rollNumber, // Roll number from Beta Collegiate
      }),
    });

    const res = await verifyRoute(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/No matching registered student record found for this institution/);
  });

  it("blocks School Beta admin from accessing School Alpha roster", async () => {
    const { setMockCurrentUser } = await import("@/lib/auth");
    setMockCurrentUser({
      userId: `school_${schoolBeta._id}`,
      email: schoolBeta.adminEmail,
      name: "Beta Admin",
      role: "school_admin",
      schoolId: schoolBeta._id.toString(),
      schoolSlug: schoolBeta.slug,
    });

    try {
      const req = new NextRequest(`http://localhost:3000/api/school/${schoolAlpha._id}/students`, {
        method: "GET",
      });

      const res = await schoolStudentsRoute(req, {
        params: Promise.resolve({ schoolId: schoolAlpha._id.toString() }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/FORBIDDEN/);
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  // Vector 2: Question & Answer Leakage Prevention
  it("strictly prevents answer key, rubric, or explanation leakage across all portal entry points", async () => {
    // A: Check /api/portal/exam-info
    const infoReq = new NextRequest("http://localhost:3000/api/portal/exam-info?code=ALPHA-2026");
    const infoRes = await examInfoRoute(infoReq);
    const infoData = await infoRes.json();

    expect(infoRes.status).toBe(200);
    expect(infoData.success).toBe(true);
    expect(infoData.exam.questions).toBeUndefined(); // Questions must NEVER be in exam-info!

    // B: Check /api/portal/verify
    const verifyReq = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.2",
      },
      body: JSON.stringify({
        accessCode: "ALPHA-2026",
        rollNumber: studentAlpha.rollNumber,
      }),
    });

    const verifyRes = await verifyRoute(verifyReq);
    const verifyData = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verifyData.success).toBe(true);

    const questions = verifyData.exam.questions;
    expect(questions.length).toBe(1);
    for (const q of questions) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.rubric).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
  });

  // Vector 3: JWT Tampering & Session Forgery
  it("rejects forged or altered JWT session tokens", async () => {
    // Attempt to forge token with wrong secret
    const forgedToken = jwt.sign(
      {
        attemptId: new mongoose.Types.ObjectId().toString(),
        examId: examAlpha._id.toString(),
        studentId: studentAlpha._id.toString(),
        schoolId: schoolAlpha._id.toString(),
        serverDeadline: new Date(Date.now() + 9999999).toISOString(),
      },
      "malicious_attacker_private_key_xyz",
      { expiresIn: "1h" }
    );

    const saveReq = new NextRequest("http://localhost:3000/api/portal/attempt/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgedToken}`,
      },
      body: JSON.stringify({
        questionId: "q_sec_1",
        selectedOptions: ["opt_c"],
      }),
    });

    const saveRes = await saveRoute(saveReq);
    expect(saveRes.status).toBe(401);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(false);
    expect(saveData.error).toMatch(/Invalid or expired session token/);
  });

  // Vector 4: Rate Limiting Enforcement
  it("enforces sliding-window rate limit on /api/portal/verify against automated spamming", async () => {
    const spamIP = "203.0.113.88";
    const requests = [];

    // Rapidly send 30 verification requests from same IP (limit is 25 per min)
    for (let i = 0; i < 30; i++) {
      const req = new NextRequest("http://localhost:3000/api/portal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": spamIP,
        },
        body: JSON.stringify({
          accessCode: "ALPHA-2026",
          rollNumber: studentAlpha.rollNumber,
        }),
      });
      requests.push(verifyRoute(req));
    }

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    const rateLimited = statusCodes.filter((code) => code === 429);
    expect(rateLimited.length).toBeGreaterThanOrEqual(5);

    const rateLimitedRes = responses.find((r) => r.status === 429);
    expect(rateLimitedRes?.headers.get("Retry-After")).toBeTruthy();
    const data = await rateLimitedRes?.json();
    expect(data.error).toMatch(/Too many verification requests/);
  });

  // Vector 5: Student Eligibility & Targeting Enforcement
  it("prohibits ineligible students based on grade, section, status, and attempt limits", async () => {
    // Case 1: Wrong grade
    const reqGrade = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.10",
      },
      body: JSON.stringify({
        accessCode: "ALPHA-SEC-A", // Targeted at Grade 10 Section A
        rollNumber: studentGrade9.rollNumber, // Grade 9 student
      }),
    });
    const resGrade = await verifyRoute(reqGrade);
    expect(resGrade.status).toBe(403);
    const dataGrade = await resGrade.json();
    expect(dataGrade.error).toMatch(/restricted to Grade 10/);

    // Case 2: Wrong section
    const reqSec = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.11",
      },
      body: JSON.stringify({
        accessCode: "ALPHA-SEC-A",
        rollNumber: studentSectionB.rollNumber, // Section B student
      }),
    });
    const resSec = await verifyRoute(reqSec);
    expect(resSec.status).toBe(403);
    const dataSec = await resSec.json();
    expect(dataSec.error).toMatch(/designated for sections A/);

    // Case 3: Suspended / Inactive student
    const reqInactive = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.12",
      },
      body: JSON.stringify({
        accessCode: "ALPHA-2026",
        rollNumber: studentInactive.rollNumber,
      }),
    });
    const resInactive = await verifyRoute(reqInactive);
    expect(resInactive.status).toBe(403);
    const dataInactive = await resInactive.json();
    expect(dataInactive.error).toMatch(/marked inactive/);
  });

  // Vector 6: Post-Deadline Expiration Exploit
  it("rejects answer saves after serverDeadline and marks attempt as timed_out", async () => {
    const pastTime = new Date(Date.now() - 5000).toISOString();

    const expiredAttempt = await ExamAttempt.create({
      schoolId: schoolAlpha._id,
      examId: examAlpha._id,
      studentId: studentAlpha._id,
      studentSnapshot: {
        name: studentAlpha.name,
        rollNumber: studentAlpha.rollNumber,
        admissionNumber: studentAlpha.admissionNumber,
        email: studentAlpha.email,
        classGrade: studentAlpha.classGrade,
        section: studentAlpha.section,
      },
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      serverDeadline: pastTime, // Already expired in the past
      status: "in_progress",
      responses: [],
      scores: {
        totalMarks: 0,
        maxMarks: 10,
        percentage: 0,
        mcqMarks: 0,
        writtenMarks: 0,
        isGradingComplete: false,
      },
    });

    const validToken = signStudentSession({
      attemptId: expiredAttempt._id.toString(),
      examId: examAlpha._id.toString(),
      studentId: studentAlpha._id.toString(),
      schoolId: schoolAlpha._id.toString(),
      serverDeadline: pastTime,
    });

    const lateSaveReq = new NextRequest("http://localhost:3000/api/portal/attempt/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        questionId: "q_sec_1",
        selectedOptions: ["opt_c"],
      }),
    });

    const lateSaveRes = await saveRoute(lateSaveReq);
    const lateSaveData = await lateSaveRes.json();

    expect(lateSaveData.success).toBe(false);
    expect(lateSaveData.timedOut).toBe(true);

    // Verify DB record transitioned to timed_out
    const updatedAttempt = await ExamAttempt.findById(expiredAttempt._id).lean();
    expect(updatedAttempt?.status).toBe("timed_out");
  });

  // Vector 7: Unpublished Results Secrecy
  it("prevents answer retrieval for unpublished exams via /api/portal/attempt/result", async () => {
    const unpubAttempt = await ExamAttempt.create({
      schoolId: schoolAlpha._id,
      examId: examUnpublished._id,
      studentId: studentAlpha._id,
      studentSnapshot: {
        name: studentAlpha.name,
        rollNumber: studentAlpha.rollNumber,
        admissionNumber: studentAlpha.admissionNumber,
        email: studentAlpha.email,
        classGrade: studentAlpha.classGrade,
        section: studentAlpha.section,
      },
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      serverDeadline: new Date(Date.now() + 3600000).toISOString(),
      status: "submitted",
      responses: [{ questionId: "q_secret_1", selectedOptions: ["opt_correct"] }],
    });

    const resReq = new NextRequest(
      `http://localhost:3000/api/portal/attempt/result?attemptId=${unpubAttempt._id}`
    );
    const resRes = await resultRoute(resReq);
    const resData = await resRes.json();

    expect(resRes.status).toBe(200);
    expect(resData.success).toBe(true);
    expect(resData.isPublished).toBe(false);
    expect(resData.questions).toBeUndefined(); // Question evaluations and answers withheld
    expect(resData.scores).toBeUndefined(); // Total scores withheld until official publication
    expect(resData.studentSnapshot.email).toBeUndefined(); // Sensitive email masked
    expect(resData.studentSnapshot.admissionNumber).toBeUndefined(); // Admission identifier masked
  });

  // Vector 8: School Admin Login Brute-Force Rate Limiting
  it("enforces brute-force rate limit on /api/school/auth/login after 10 attempts", async () => {
    const { POST: loginRoute } = await import("@/app/api/school/auth/login/route");
    const loginIP = "198.51.100.42";
    const requests = [];

    for (let i = 0; i < 15; i++) {
      const req = new NextRequest("http://localhost:3000/api/school/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": loginIP,
        },
        body: JSON.stringify({
          identifier: schoolAlpha.adminEmail,
          password: "wrong_password_attempt",
        }),
      });
      requests.push(loginRoute(req));
    }

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    const rateLimited = statusCodes.filter((code) => code === 429);
    expect(rateLimited.length).toBeGreaterThanOrEqual(4);

    const rlRes = responses.find((r) => r.status === 429);
    expect(rlRes?.headers.get("Retry-After")).toBeTruthy();
    const data = await rlRes?.json();
    expect(data.error).toMatch(/Too many login attempts/);
  });
});
