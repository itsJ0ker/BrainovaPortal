import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { sanitizeQuestionsForStudent } from "@/lib/sanitizer";
import { signStudentSession, verifyStudentSession } from "@/lib/session";
import { isClassEligible } from "@/lib/class-matching";

describe("Student Verification & Exam Session Security", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let exam: any;
  let eligibleStudent: any;
  let nonEligibleStudent: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    school = await School.create({
      name: "Summit High",
      slug: "summit-high",
      code: "SUM-01",
      adminEmail: "admin@summit.edu",
      contactEmail: "admin@summit.edu",
      status: "active",
    });

    eligibleStudent = await Student.create({
      schoolId: school._id,
      name: "Lucas Grey",
      rollNumber: "SUM-101",
      admissionNumber: "ADM-101",
      email: "lucas@summit.edu",
      classGrade: "Grade 10",
      section: "A",
    });

    nonEligibleStudent = await Student.create({
      schoolId: school._id,
      name: "Hannah Wells",
      rollNumber: "SUM-201",
      admissionNumber: "ADM-201",
      email: "hannah@summit.edu",
      classGrade: "Grade 11",
      section: "B",
    });

    const now = new Date();
    exam = await Exam.create({
      schoolId: school._id,
      title: "Biology Fundamentals",
      slug: "bio-101",
      accessCode: "BIO-101",
      subject: "Biology",
      classGrade: "Grade 10",
      targeting: {
        type: "class_section",
        classes: ["Grade 10"],
        streams: [],
        sections: ["A"],
      },
      questions: [
        {
          id: "q1",
          type: "single_choice",
          prompt: "What is the powerhouse of the cell?",
          options: [
            { id: "a", text: "Nucleus" },
            { id: "b", text: "Mitochondria" },
          ],
          correctAnswer: "b",
          points: 2,
          explanation: "Mitochondria generate ATP.",
        },
      ],
      config: {
        durationMinutes: 30,
        startTime: new Date(now.getTime() - 3600000).toISOString(),
        endTime: new Date(now.getTime() + 3600000).toISOString(),
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
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("prohibits answer key and explanation leakage in student sanitized view", () => {
    const sanitized = sanitizeQuestionsForStudent(exam.questions, {
      shuffleQuestions: false,
      shuffleOptions: false,
    });

    expect(sanitized.length).toBe(1);
    expect(sanitized[0].id).toBe("q1");
    expect(sanitized[0].prompt).toBe("What is the powerhouse of the cell?");
    expect(sanitized[0].options?.length).toBe(2);

    // CRITICAL: Ensure correctAnswer and explanation are completely stripped!
    expect((sanitized[0] as any).correctAnswer).toBeUndefined();
    expect((sanitized[0] as any).explanation).toBeUndefined();
    expect((sanitized[0] as any).rubric).toBeUndefined();
  });

  it("generates and verifies cryptographic session tokens for student attempts", () => {
    const payload = {
      attemptId: "att_12345",
      examId: exam._id.toString(),
      studentId: eligibleStudent._id.toString(),
      schoolId: school._id.toString(),
      serverDeadline: new Date(Date.now() + 1800000).toISOString(),
    };

    const token = signStudentSession(payload);
    expect(token).toBeTruthy();

    const decoded = verifyStudentSession(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.attemptId).toBe("att_12345");
    expect(decoded?.studentId).toBe(eligibleStudent._id.toString());
  });

  it("verifies targeting eligibility: Grade 10 Section A is accepted, Grade 11 Section B is rejected", () => {
    const targeting = exam.targeting;

    const isLucasEligible =
      targeting.classes.includes(eligibleStudent.classGrade) &&
      targeting.sections.includes(eligibleStudent.section);
    expect(isLucasEligible).toBe(true);

    const isHannahEligible =
      targeting.classes.includes(nonEligibleStudent.classGrade) &&
      (targeting.sections.length === 0 || targeting.sections.includes(nonEligibleStudent.section));
    expect(isHannahEligible).toBe(false);
  });

  it("strictly enforces assigned class eligibility: Grade 8 and Grade 11 students cannot access Grade 10 exams", () => {
    // Assigned class is Grade 10
    const allowedClasses = ["Grade 10"];

    // Eligible Grade 10 student
    expect(isClassEligible("Grade 10", allowedClasses)).toBe(true);
    expect(isClassEligible("10", allowedClasses)).toBe(true);
    expect(isClassEligible("Class 10", allowedClasses)).toBe(true);
    expect(isClassEligible("grade 10", allowedClasses)).toBe(true);

    // Grade 8 student MUST BE REJECTED
    expect(isClassEligible("Grade 8", allowedClasses)).toBe(false);
    expect(isClassEligible("8", allowedClasses)).toBe(false);
    expect(isClassEligible("Class 8", allowedClasses)).toBe(false);

    // Grade 11 student MUST BE REJECTED
    expect(isClassEligible("Grade 11", allowedClasses)).toBe(false);
    expect(isClassEligible("11", allowedClasses)).toBe(false);
  });

  it("permits multiple classes when explicit multi-class targeting is set", () => {
    const multiClasses = ["Grade 8", "Grade 9", "Grade 10"];
    expect(isClassEligible("Grade 8", multiClasses)).toBe(true);
    expect(isClassEligible("Grade 10", multiClasses)).toBe(true);
    expect(isClassEligible("Grade 11", multiClasses)).toBe(false);
  });
});
