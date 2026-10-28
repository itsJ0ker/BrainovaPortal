import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { NextRequest } from "next/server";
import { GET as invigilationGetRoute, POST as invigilationPostRoute } from "@/app/api/school/[schoolId]/exams/[examId]/invigilation/route";
import { GET as certificateRoute } from "@/app/api/portal/certificate/[attemptId]/route";
import { setMockCurrentUser } from "@/lib/auth";

describe("Bot Testing Team: Invigilation & Certificate Auditor Bot", () => {
  let mongod: MongoMemoryServer;
  let schoolAlpha: any;
  let schoolBeta: any;
  let student1: any;
  let student2: any;
  let student3: any;
  let examPublished: any;
  let examUnpublished: any;
  let attempt1: any;
  let attempt2: any;
  let attempt3: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    schoolAlpha = await School.create({
      name: "St. Jude Olympiad Academy",
      slug: "st-jude",
      code: "STJ-01",
      adminEmail: "proctor@stjude.edu",
      contactEmail: "info@stjude.edu",
      status: "active",
    });

    schoolBeta = await School.create({
      name: "Rival Academy",
      slug: "rival-academy",
      code: "RIV-02",
      adminEmail: "admin@rival.edu",
      contactEmail: "admin@rival.edu",
      status: "active",
    });

    student1 = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Arthur Pendelton",
      rollNumber: "STJ-101",
      admissionNumber: "ADM-101",
      email: "arthur@stjude.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    student2 = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Beatrice Webb",
      rollNumber: "STJ-102",
      admissionNumber: "ADM-102",
      email: "beatrice@stjude.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    student3 = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Cedric Diggory",
      rollNumber: "STJ-103",
      admissionNumber: "ADM-103",
      email: "cedric@stjude.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    const now = new Date();

    examPublished = await Exam.create({
      schoolId: schoolAlpha._id,
      title: "All-India Science Olympiad Final",
      slug: "all-india-science-2026",
      accessCode: "SCIENCE-2026",
      subject: "Science",
      classGrade: "Grade 10",
      status: "published",
      isResultsPublished: true,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 30 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 30 * 60000).toISOString(),
        resultReleaseMode: "immediate",
        antiCheating: { enabled: true, maxViolations: 3 },
      },
      questions: [
        {
          id: "q1",
          type: "single_choice",
          prompt: "What is the speed of light in vacuum?",
          options: [
            { id: "opt_a", text: "3 x 10^8 m/s" },
            { id: "opt_b", text: "3 x 10^6 m/s" },
          ],
          correctAnswer: "opt_a",
          points: 10,
        },
        {
          id: "q2",
          type: "single_choice",
          prompt: "What is absolute zero in Celsius?",
          options: [
            { id: "opt_1", text: "-273.15°C" },
            { id: "opt_2", text: "0°C" },
          ],
          correctAnswer: "opt_1",
          points: 10,
        },
      ],
    });

    examUnpublished = await Exam.create({
      schoolId: schoolAlpha._id,
      title: "Classified Math Prelims",
      slug: "classified-math-2026",
      accessCode: "MATH-SEC-2026",
      subject: "Math",
      classGrade: "Grade 10",
      status: "published",
      isResultsPublished: false,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "manual",
      },
      questions: [{ id: "qm1", type: "single_choice", prompt: "1+1=?", options: [], correctAnswer: "2", points: 10 }],
    });

    // Attempt 1: Arthur (In Progress, flagged with 2 violations)
    attempt1 = await ExamAttempt.create({
      schoolId: schoolAlpha._id,
      examId: examPublished._id,
      studentId: student1._id,
      studentSnapshot: {
        name: student1.name,
        rollNumber: student1.rollNumber,
        admissionNumber: student1.admissionNumber,
        email: student1.email,
        classGrade: student1.classGrade,
        section: student1.section,
      },
      startedAt: now.toISOString(),
      serverDeadline: new Date(now.getTime() + 20 * 60000).toISOString(),
      status: "flagged",
      responses: [{ questionId: "q1", selectedOptions: ["opt_a"], answeredAt: now.toISOString() }],
      violationCount: 2,
      integrityLog: [
        { timestamp: now.toISOString(), type: "tab_switch", details: "Tab switch detected" },
        { timestamp: now.toISOString(), type: "focus_loss", details: "Lost window focus" },
      ],
    });

    // Attempt 2: Beatrice (Submitted with 100% score)
    attempt2 = await ExamAttempt.create({
      schoolId: schoolAlpha._id,
      examId: examPublished._id,
      studentId: student2._id,
      studentSnapshot: {
        name: student2.name,
        rollNumber: student2.rollNumber,
        admissionNumber: student2.admissionNumber,
        email: student2.email,
        classGrade: student2.classGrade,
        section: student2.section,
      },
      startedAt: new Date(now.getTime() - 25 * 60000).toISOString(),
      submittedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      serverDeadline: new Date(now.getTime() + 35 * 60000).toISOString(),
      status: "submitted",
      responses: [
        { questionId: "q1", selectedOptions: ["opt_a"] },
        { questionId: "q2", selectedOptions: ["opt_1"] },
      ],
      scores: {
        totalMarks: 20,
        maxMarks: 20,
        percentage: 100,
        mcqMarks: 20,
        writtenMarks: 0,
        isGradingComplete: true,
      },
      violationCount: 0,
    });

    // Attempt 3: Cedric (Submitted to Unpublished Exam)
    attempt3 = await ExamAttempt.create({
      schoolId: schoolAlpha._id,
      examId: examUnpublished._id,
      studentId: student3._id,
      studentSnapshot: {
        name: student3.name,
        rollNumber: student3.rollNumber,
        admissionNumber: student3.admissionNumber,
        email: student3.email,
        classGrade: student3.classGrade,
        section: student3.section,
      },
      startedAt: now.toISOString(),
      submittedAt: now.toISOString(),
      serverDeadline: new Date(now.getTime() + 50 * 60000).toISOString(),
      status: "submitted",
      responses: [{ questionId: "qm1", selectedOptions: ["2"] }],
      scores: { totalMarks: 10, maxMarks: 10, percentage: 100, mcqMarks: 10, writtenMarks: 0, isGradingComplete: true },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  // Section 1: Live Invigilation Stream & Metrics
  it("streams live candidate invigilation roster with accurate counts and status distribution", async () => {
    setMockCurrentUser({
      userId: `school_${schoolAlpha._id}`,
      email: schoolAlpha.adminEmail,
      name: "St. Jude Proctor",
      role: "school_admin",
      schoolId: schoolAlpha._id.toString(),
      schoolSlug: schoolAlpha.slug,
    });

    try {
      const req = new NextRequest(
        `http://localhost:3000/api/school/${schoolAlpha._id}/exams/${examPublished._id}/invigilation`
      );
      const res = await invigilationGetRoute(req, {
        params: Promise.resolve({
          schoolId: schoolAlpha._id.toString(),
          examId: examPublished._id.toString(),
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify metrics summary
      expect(data.summary.totalEnrolled).toBe(3);
      expect(data.summary.submitted).toBe(1); // Beatrice
      expect(data.summary.flagged).toBe(1); // Arthur
      expect(data.summary.totalViolations).toBe(2);

      // Verify candidate details in roster
      const arthur = data.candidates.find((c: any) => c.rollNumber === "STJ-101");
      expect(arthur).toBeDefined();
      expect(arthur.status).toBe("flagged");
      expect(arthur.violationCount).toBe(2);
      expect(arthur.answeredQuestions).toBe(1);

      const beatrice = data.candidates.find((c: any) => c.rollNumber === "STJ-102");
      expect(beatrice).toBeDefined();
      expect(beatrice.status).toBe("submitted");
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  // Section 2: Invigilator Actions
  it("allows invigilator to extend time, reset violations, and force-submit attempts", async () => {
    setMockCurrentUser({
      userId: `school_${schoolAlpha._id}`,
      email: schoolAlpha.adminEmail,
      name: "St. Jude Proctor",
      role: "school_admin",
      schoolId: schoolAlpha._id.toString(),
      schoolSlug: schoolAlpha.slug,
    });

    try {
      // 1. Extend Arthur's time by +10 minutes
      const currentDeadlineMs = new Date(attempt1.serverDeadline).getTime();
      const extendReq = new NextRequest(
        `http://localhost:3000/api/school/${schoolAlpha._id}/exams/${examPublished._id}/invigilation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "extend_time",
            attemptId: attempt1._id.toString(),
            extraMinutes: 10,
          }),
        }
      );

      const extendRes = await invigilationPostRoute(extendReq, {
        params: Promise.resolve({ schoolId: schoolAlpha._id.toString(), examId: examPublished._id.toString() }),
      });
      const extendData = await extendRes.json();
      expect(extendData.success).toBe(true);

      const updated1 = await ExamAttempt.findById(attempt1._id).lean();
      const newDeadlineMs = new Date(updated1?.serverDeadline).getTime();
      expect(newDeadlineMs).toBe(currentDeadlineMs + 10 * 60 * 1000);

      // 2. Reset Arthur's violation warnings to 0
      const resetReq = new NextRequest(
        `http://localhost:3000/api/school/${schoolAlpha._id}/exams/${examPublished._id}/invigilation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset_violations",
            attemptId: attempt1._id.toString(),
          }),
        }
      );

      const resetRes = await invigilationPostRoute(resetReq, {
        params: Promise.resolve({ schoolId: schoolAlpha._id.toString(), examId: examPublished._id.toString() }),
      });
      const resetData = await resetRes.json();
      expect(resetData.success).toBe(true);

      const updated2 = await ExamAttempt.findById(attempt1._id).lean();
      expect(updated2?.violationCount).toBe(0);
      expect(updated2?.status).toBe("in_progress");

      // 3. Force-submit Arthur's attempt
      const forceReq = new NextRequest(
        `http://localhost:3000/api/school/${schoolAlpha._id}/exams/${examPublished._id}/invigilation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "force_submit",
            attemptId: attempt1._id.toString(),
          }),
        }
      );

      const forceRes = await invigilationPostRoute(forceReq, {
        params: Promise.resolve({ schoolId: schoolAlpha._id.toString(), examId: examPublished._id.toString() }),
      });
      const forceData = await forceRes.json();
      expect(forceData.success).toBe(true);

      const updated3 = await ExamAttempt.findById(attempt1._id).lean();
      expect(updated3?.status).toBe("auto_submitted");
      expect(updated3?.scores.totalMarks).toBe(10); // Answered q1 correctly
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  // Section 3: Invigilation Multi-Tenant Barrier
  it("blocks School Beta invigilator from executing actions on School Alpha attempts", async () => {
    setMockCurrentUser({
      userId: `school_${schoolBeta._id}`,
      email: schoolBeta.adminEmail,
      name: "Rival Proctor",
      role: "school_admin",
      schoolId: schoolBeta._id.toString(),
      schoolSlug: schoolBeta.slug,
    });

    try {
      const rogueReq = new NextRequest(
        `http://localhost:3000/api/school/${schoolAlpha._id}/exams/${examPublished._id}/invigilation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "force_submit",
            attemptId: attempt2._id.toString(),
          }),
        }
      );

      const rogueRes = await invigilationPostRoute(rogueReq, {
        params: Promise.resolve({ schoolId: schoolAlpha._id.toString(), examId: examPublished._id.toString() }),
      });

      expect(rogueRes.status).toBe(403);
      const data = await rogueRes.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/FORBIDDEN/);
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  // Section 4: Automated Certificate Generation
  it("generates Gold Honor Roll certificate for published exam attempt with 100% score", async () => {
    const certReq = new NextRequest(
      `http://localhost:3000/api/portal/certificate/${attempt2._id}`
    );
    const certRes = await certificateRoute(certReq, {
      params: Promise.resolve({ attemptId: attempt2._id.toString() }),
    });

    expect(certRes.status).toBe(200);
    const data = await certRes.json();
    expect(data.success).toBe(true);

    const cert = data.certificate;
    expect(cert.student.name).toBe("Beatrice Webb");
    expect(cert.student.rollNumber).toBe("STJ-102");
    expect(cert.school.name).toBe("St. Jude Olympiad Academy");
    expect(cert.exam.title).toBe("All-India Science Olympiad Final");
    expect(cert.scores.percentage).toBe(100);
    expect(cert.distinction).toBe("Certificate of Distinction (Gold Honor Roll)");
    expect(cert.badgeTier).toBe("gold");

    // Check certificate ID format and cryptographic verification hash
    expect(cert.certificateId).toMatch(/^BO-2026-SCIENCE-2026-[A-F0-9]{8}$/);
    expect(cert.verificationHash).toMatch(/^[A-F0-9]{16}$/);
  });

  it("prohibits certificate generation when examination results have not been officially published", async () => {
    const certReq = new NextRequest(
      `http://localhost:3000/api/portal/certificate/${attempt3._id}`
    );
    const certRes = await certificateRoute(certReq, {
      params: Promise.resolve({ attemptId: attempt3._id.toString() }),
    });

    expect(certRes.status).toBe(403);
    const data = await certRes.json();
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/Certificates are only issued after official examination results have been published/);
  });
});
