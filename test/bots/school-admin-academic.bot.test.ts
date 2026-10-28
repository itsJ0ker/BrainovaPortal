import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { NextRequest } from "next/server";
import { POST as importRoute } from "@/app/api/school/[schoolId]/students/import/route";
import { GET as exportRoute } from "@/app/api/school/[schoolId]/students/export/route";
import { POST as publishRoute } from "@/app/api/school/[schoolId]/exams/[examId]/publish/route";
import { GET as resultRoute } from "@/app/api/portal/attempt/result/route";
import { setMockCurrentUser } from "@/lib/auth";

describe("Bot Testing Team: School Admin & Academic Roster Management Bot", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let exam: any;
  let testAttempt: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    school = await School.create({
      name: "Brainova Cambridge International",
      slug: "brainova-cambridge",
      code: "BCI-2026",
      adminEmail: "principal@brainovacambridge.edu",
      contactEmail: "info@brainovacambridge.edu",
      status: "active",
    });

    const now = new Date();
    exam = await Exam.create({
      schoolId: school._id,
      title: "Brainova Cambridge Math Challenge",
      slug: "cambridge-math-challenge",
      accessCode: "CAM-MATH-26",
      subject: "Mathematics",
      classGrade: "Grade 10",
      status: "draft",
      isResultsPublished: false,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 50 * 60000).toISOString(),
        resultReleaseMode: "manual",
      },
      questions: [
        {
          id: "qm_1",
          type: "single_choice",
          prompt: "Solve: 3x + 15 = 45. What is x?",
          options: [
            { id: "opt_10", text: "10" },
            { id: "opt_5", text: "5" },
          ],
          correctAnswer: "opt_10",
          points: 10,
        },
      ],
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("handles batch student roster import and enforces uniqueness of roll and admission numbers", async () => {
    setMockCurrentUser({
      userId: `school_${school._id}`,
      email: school.adminEmail,
      name: "Principal Cambridge",
      role: "school_admin",
      schoolId: school._id.toString(),
      schoolSlug: school.slug,
    });

    try {
      const candidateList = [
        {
          name: "Daniel Craig",
          rollNumber: "BCI-001",
          admissionNumber: "ADM-BCI-001",
          email: "daniel@bci.edu",
          classGrade: "Grade 10",
          section: "A",
        },
        {
          name: "Emma Watson",
          rollNumber: "BCI-002",
          admissionNumber: "ADM-BCI-002",
          email: "emma@bci.edu",
          classGrade: "Grade 10",
          section: "A",
        },
        {
          name: "Felicity Jones",
          rollNumber: "BCI-003",
          admissionNumber: "ADM-BCI-003",
          email: "felicity@bci.edu",
          classGrade: "Grade 10",
          section: "B",
        },
      ];

      const req = new NextRequest(`http://localhost:3000/api/school/${school._id}/students/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: candidateList }),
      });

      const res = await importRoute(req, {
        params: Promise.resolve({ schoolId: school._id.toString() }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.insertedCount).toBe(3);
      expect(data.skippedCount).toBe(0);

      // Verify records in DB
      const count = await Student.countDocuments({ schoolId: school._id });
      expect(count).toBe(3);

      // Attempt second import containing duplicate roll number BCI-001
      const duplicateList = [
        {
          name: "Daniel Clone",
          rollNumber: "BCI-001", // DUPLICATE!
          admissionNumber: "ADM-BCI-NEW",
          email: "clone@bci.edu",
          classGrade: "Grade 10",
          section: "A",
        },
        {
          name: "George MacKay",
          rollNumber: "BCI-004", // NEW!
          admissionNumber: "ADM-BCI-004",
          email: "george@bci.edu",
          classGrade: "Grade 10",
          section: "A",
        },
      ];

      const dupReq = new NextRequest(`http://localhost:3000/api/school/${school._id}/students/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: duplicateList }),
      });

      const dupRes = await importRoute(dupReq, {
        params: Promise.resolve({ schoolId: school._id.toString() }),
      });

      const dupData = await dupRes.json();
      expect(dupData.success).toBe(true);
      expect(dupData.insertedCount).toBe(1); // Only George inserted
      expect(dupData.skippedCount).toBe(1); // Daniel Clone skipped
      expect(dupData.skipped[0].reason).toMatch(/Duplicate Roll Number/);
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  it("exports school student roster to standard Excel spreadsheet buffer", async () => {
    setMockCurrentUser({
      userId: `school_${school._id}`,
      email: school.adminEmail,
      name: "Principal Cambridge",
      role: "school_admin",
      schoolId: school._id.toString(),
      schoolSlug: school.slug,
    });

    try {
      const req = new NextRequest(`http://localhost:3000/api/school/${school._id}/students/export`, {
        method: "GET",
      });

      const res = await exportRoute(req, {
        params: Promise.resolve({ schoolId: school._id.toString() }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(res.headers.get("Content-Disposition")).toMatch(/brainova-cambridge-students/);

      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(100); // Valid spreadsheet binary
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  it("manages exam publishing lifecycle, generates audit log, and releases scorecards to students", async () => {
    setMockCurrentUser({
      userId: `school_${school._id}`,
      email: school.adminEmail,
      name: "Principal Cambridge",
      role: "school_admin",
      schoolId: school._id.toString(),
      schoolSlug: school.slug,
    });

    try {
      // 1. Create student attempt for Daniel Craig
      const daniel = await Student.findOne({ rollNumber: "BCI-001" });
      testAttempt = await ExamAttempt.create({
        schoolId: school._id,
        examId: exam._id,
        studentId: daniel._id,
        studentSnapshot: {
          name: daniel.name,
          rollNumber: daniel.rollNumber,
          admissionNumber: daniel.admissionNumber,
          email: daniel.email,
          classGrade: daniel.classGrade,
          section: daniel.section,
        },
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        serverDeadline: new Date(Date.now() + 3600000).toISOString(),
        status: "submitted",
        responses: [{ questionId: "qm_1", selectedOptions: ["opt_10"] }],
        scores: {
          totalMarks: 10,
          maxMarks: 10,
          percentage: 100,
          mcqMarks: 10,
          writtenMarks: 0,
          isGradingComplete: true,
        },
      });

      // 2. Daniel checks results while unpublished -> answers withheld
      const unpubCheckReq = new NextRequest(
        `http://localhost:3000/api/portal/attempt/result?attemptId=${testAttempt._id}`
      );
      const unpubCheckRes = await resultRoute(unpubCheckReq);
      const unpubCheckData = await unpubCheckRes.json();
      expect(unpubCheckData.isPublished).toBe(false);
      expect(unpubCheckData.questions).toBeUndefined();

      // 3. Admin publishes examination & results
      const pubReq = new NextRequest(
        `http://localhost:3000/api/school/${school._id}/exams/${exam._id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "publish",
            isResultsPublished: true,
          }),
        }
      );

      const pubRes = await publishRoute(pubReq, {
        params: Promise.resolve({ schoolId: school._id.toString(), examId: exam._id.toString() }),
      });

      expect(pubRes.status).toBe(200);
      const pubData = await pubRes.json();
      expect(pubData.success).toBe(true);

      // Verify Exam in DB
      const updatedExam = await Exam.findById(exam._id).lean();
      expect(updatedExam?.status).toBe("published");
      expect(updatedExam?.isResultsPublished).toBe(true);

      // Verify AuditLog entry was created
      const auditEntry = await AuditLog.findOne({
        resourceId: exam._id.toString(),
        schoolId: school._id,
      }).lean();
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.actorName).toBe("Principal Cambridge");

      // 4. Daniel checks results again -> now officially released!
      const pubCheckReq = new NextRequest(
        `http://localhost:3000/api/portal/attempt/result?attemptId=${testAttempt._id}`
      );
      const pubCheckRes = await resultRoute(pubCheckReq);
      const pubCheckData = await pubCheckRes.json();
      expect(pubCheckData.isPublished).toBe(true);
      expect(pubCheckData.questions.length).toBe(1);
      expect(pubCheckData.questions[0].correctAnswer).toBe("opt_10");
      expect(pubCheckData.scores.percentage).toBe(100);
    } finally {
      setMockCurrentUser(undefined);
    }
  });
});

