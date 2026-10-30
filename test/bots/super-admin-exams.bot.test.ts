import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { NextRequest } from "next/server";
import { GET as getExamsRoute, POST as createExamRoute } from "@/app/api/super-admin/exams/route";
import { PATCH as updateExamRoute, DELETE as deleteExamRoute } from "@/app/api/super-admin/exams/[id]/route";
import { GET as getSchoolExamsRoute } from "@/app/api/school/[schoolId]/exams/route";
import { POST as verifyStudentRoute } from "@/app/api/portal/verify/route";
import { setMockCurrentUser } from "@/lib/auth";

describe("Bot Testing Team: Super Admin Examinations Hub & National Multi-School Orchestration", () => {
  let mongod: MongoMemoryServer;
  let schoolAlpha: any;
  let schoolBeta: any;
  let schoolGamma: any;
  let studentAlpha: any;
  let studentBeta: any;
  let studentGamma: any;
  let createdNationalExam: any;
  let createdSelectedExam: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(mongod.getUri());

    // 1. Create 3 Partner Schools
    schoolAlpha = await School.create({
      name: "St. Jude Olympiad Academy",
      slug: "st-jude",
      code: "STJ-01",
      adminEmail: "director@stjude.edu",
      contactEmail: "director@stjude.edu",
      status: "active",
    });

    schoolBeta = await School.create({
      name: "Heritage International College",
      slug: "heritage-intl",
      code: "HER-02",
      adminEmail: "principal@heritage.edu",
      contactEmail: "principal@heritage.edu",
      status: "active",
    });

    schoolGamma = await School.create({
      name: "Oakridge STEM Academy",
      slug: "oakridge-stem",
      code: "OAK-03",
      adminEmail: "head@oakridge.edu",
      contactEmail: "head@oakridge.edu",
      status: "active",
    });

    // 2. Create Students in each school
    studentAlpha = await Student.create({
      schoolId: schoolAlpha._id,
      name: "Arthur Pendelton",
      rollNumber: "STJ-101",
      admissionNumber: "ADM-STJ-101",
      email: "arthur@stjude.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    studentBeta = await Student.create({
      schoolId: schoolBeta._id,
      name: "Beatrice Webb",
      rollNumber: "HER-201",
      admissionNumber: "ADM-HER-201",
      email: "beatrice@heritage.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    studentGamma = await Student.create({
      schoolId: schoolGamma._id,
      name: "Cedric Diggory",
      rollNumber: "OAK-301",
      admissionNumber: "ADM-OAK-301",
      email: "cedric@oakridge.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("prohibits unauthorized non-super-admin users from accessing or creating exams in Super Admin Hub", async () => {
    // Attempt with School Admin credentials
    setMockCurrentUser({
      userId: `school_${schoolAlpha._id}`,
      email: schoolAlpha.adminEmail,
      name: "School Admin",
      role: "school_admin",
      schoolId: schoolAlpha._id.toString(),
      schoolSlug: schoolAlpha.slug,
    });

    try {
      const req = new NextRequest("http://localhost:3000/api/super-admin/exams", {
        method: "GET",
      });
      const res = await getExamsRoute(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/Super Admin access required/);
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  it("allows Super Admin to create a National Olympiad exam for ALL registered partner schools", async () => {
    setMockCurrentUser({
      userId: "dev_super_admin_1",
      email: "superadmin@schexamport.internal",
      name: "Platform Super Admin",
      role: "super_admin",
    });

    try {
      const now = new Date();
      const payload = {
        title: "Brainova All-India Mathematics Olympiad 2026",
        subject: "Mathematics",
        classGrade: "Grade 10",
        description: "Official nationwide mathematics Olympiad across all participating schools.",
        customAccessCode: "AIMO-2026",
        isPlatformExam: true,
        participatingSchoolIds: [], // Empty indicates all schools
        durationMinutes: 90,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "published",
        resultReleaseMode: "immediate",
        antiCheating: {
          enabled: true,
          maxViolations: 3,
          actionOnThreshold: "auto_submit",
        },
        questions: [
          {
            id: "qm1",
            type: "single_choice",
            prompt: "What is the remainder when 2^50 is divided by 7?",
            options: [
              { id: "opt_4", text: "4" },
              { id: "opt_2", text: "2" },
              { id: "opt_1", text: "1" },
            ],
            correctAnswer: "opt_4",
            points: 10,
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/super-admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await createExamRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.exam).toBeDefined();
      expect(data.exam.accessCode).toBe("AIMO-2026");
      expect(data.exam.isPlatformExam).toBe(true);
      expect(data.exam.participatingSchoolIds.length).toBe(3); // All 3 schools enrolled

      createdNationalExam = data.exam;

      // Verify AuditLog record
      const audit = await AuditLog.findOne({ action: "SUPER_ADMIN_CREATE_EXAM", resourceId: data.exam._id });
      expect(audit).toBeDefined();
      expect(audit?.actorRole).toBe("super_admin");
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  it("enables students from ANY participating school to enter the National Olympiad exam", async () => {
    // Student Arthur from School Alpha takes exam
    const reqAlpha = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.1" },
      body: JSON.stringify({
        accessCode: "AIMO-2026",
        rollNumber: studentAlpha.rollNumber,
      }),
    });
    const resAlpha = await verifyStudentRoute(reqAlpha);
    expect(resAlpha.status).toBe(200);
    const dataAlpha = await resAlpha.json();
    expect(dataAlpha.success).toBe(true);
    expect(dataAlpha.student.name).toBe("Arthur Pendelton");

    // Student Beatrice from School Beta also takes the same exam
    const reqBeta = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.1.2" },
      body: JSON.stringify({
        accessCode: "AIMO-2026",
        rollNumber: studentBeta.rollNumber,
      }),
    });
    const resBeta = await verifyStudentRoute(reqBeta);
    expect(resBeta.status).toBe(200);
    const dataBeta = await resBeta.json();
    expect(dataBeta.success).toBe(true);
    expect(dataBeta.student.name).toBe("Beatrice Webb");
  });

  it("allows Super Admin to create a targeted exam for SPECIFIC selected schools and enforce school exclusivity", async () => {
    setMockCurrentUser({
      userId: "dev_super_admin_1",
      email: "superadmin@schexamport.internal",
      name: "Platform Super Admin",
      role: "super_admin",
    });

    try {
      const now = new Date();
      // Select School Alpha and School Beta ONLY (Exclude School Gamma)
      const payload = {
        title: "Dual-Academy STEM Challenge (St. Jude & Heritage)",
        subject: "Physics",
        classGrade: "Grade 10",
        customAccessCode: "DUAL-STEM-26",
        isPlatformExam: false,
        participatingSchoolIds: [schoolAlpha._id.toString(), schoolBeta._id.toString()],
        durationMinutes: 45,
        startTime: new Date(now.getTime() - 10 * 60000).toISOString(),
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "published",
        questions: [
          {
            id: "qp1",
            type: "single_choice",
            prompt: "What is acceleration due to gravity on Earth surface?",
            options: [
              { id: "opt_98", text: "9.8 m/s^2" },
              { id: "opt_90", text: "9.0 m/s^2" },
            ],
            correctAnswer: "opt_98",
            points: 10,
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/super-admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await createExamRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.exam.participatingSchoolIds.length).toBe(2);

      createdSelectedExam = data.exam;
    } finally {
      setMockCurrentUser(undefined);
    }

    // Arthur from School Alpha (Enrolled) -> Allowed
    const reqAlpha = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.1" },
      body: JSON.stringify({
        accessCode: "DUAL-STEM-26",
        rollNumber: studentAlpha.rollNumber,
      }),
    });
    const resAlpha = await verifyStudentRoute(reqAlpha);
    expect(resAlpha.status).toBe(200);

    // Cedric from School Gamma (Excluded) -> REJECTED (HTTP 404)
    const reqGamma = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.2.3" },
      body: JSON.stringify({
        accessCode: "DUAL-STEM-26",
        rollNumber: studentGamma.rollNumber,
      }),
    });
    const resGamma = await verifyStudentRoute(reqGamma);
    expect(resGamma.status).toBe(404);
    const dataGamma = await resGamma.json();
    expect(dataGamma.error).toMatch(/No matching registered student record found for this institution/);
  });

  it("surfaces Super-Admin-assigned exams inside the participating schools' own exam directories", async () => {
    // Check School Beta exams console
    setMockCurrentUser({
      userId: `school_${schoolBeta._id}`,
      email: schoolBeta.adminEmail,
      name: "Heritage Principal",
      role: "school_admin",
      schoolId: schoolBeta._id.toString(),
      schoolSlug: schoolBeta.slug,
    });

    try {
      const req = new NextRequest(`http://localhost:3000/api/school/${schoolBeta._id}/exams`, {
        method: "GET",
      });
      const res = await getSchoolExamsRoute(req, {
        params: Promise.resolve({ schoolId: schoolBeta._id.toString() }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const codes = data.exams.map((e: any) => e.accessCode);
      // Both the National Olympiad AND the Dual-Academy challenge appear in School Beta's console!
      expect(codes).toContain("AIMO-2026");
      expect(codes).toContain("DUAL-STEM-26");
    } finally {
      setMockCurrentUser(undefined);
    }
  });

  it("lists all exams platform-wide with candidate analytics and allows Super Admin status and result overrides", async () => {
    setMockCurrentUser({
      userId: "dev_super_admin_1",
      email: "superadmin@schexamport.internal",
      name: "Platform Super Admin",
      role: "super_admin",
    });

    try {
      // 1. Fetch Global Exam Roster
      const getReq = new NextRequest("http://localhost:3000/api/super-admin/exams?status=published");
      const getRes = await getExamsRoute(getReq);
      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.success).toBe(true);
      expect(data.exams.length).toBeGreaterThanOrEqual(2);
      expect(data.metrics.totalExams).toBeGreaterThanOrEqual(2);

      // Verify stats attached
      const aimoExam = data.exams.find((e: any) => e.accessCode === "AIMO-2026");
      expect(aimoExam).toBeDefined();
      expect(aimoExam.stats).toBeDefined();
      expect(aimoExam.stats.totalAttempts).toBeGreaterThanOrEqual(2); // Arthur & Beatrice started it

      // 2. Super Admin releases results for DUAL-STEM-26
      const patchReq = new NextRequest(
        `http://localhost:3000/api/super-admin/exams/${createdSelectedExam._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isResultsPublished: true }),
        }
      );
      const patchRes = await updateExamRoute(patchReq, {
        params: Promise.resolve({ id: createdSelectedExam._id.toString() }),
      });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.success).toBe(true);
      expect(patchData.exam.isResultsPublished).toBe(true);

      // 3. Super Admin unpublishes exam (transitions to draft)
      const draftReq = new NextRequest(
        `http://localhost:3000/api/super-admin/exams/${createdSelectedExam._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "draft" }),
        }
      );
      const draftRes = await updateExamRoute(draftReq, {
        params: Promise.resolve({ id: createdSelectedExam._id.toString() }),
      });
      expect(draftRes.status).toBe(200);
      const draftData = await draftRes.json();
      expect(draftData.exam.status).toBe("draft");
    } finally {
      setMockCurrentUser(undefined);
    }
  });
});

