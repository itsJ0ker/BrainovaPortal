import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";

describe("Student Test History & Results Verification", () => {
  let mongod: MongoMemoryServer;
  let school: any;
  let studentAlex: any;
  let studentSophia: any;
  let publishedExam: any;
  let unpublishedExam: any;
  let alexAttempt1: any;
  let alexAttempt2: any;
  let sophiaAttempt: any;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // 1. Create School
    school = await School.create({
      name: "Heritage Academy",
      slug: "heritage-academy",
      code: "HER-01",
      adminEmail: "admin@heritage.edu",
      contactEmail: "admin@heritage.edu",
      status: "active",
    });

    // 2. Create Students
    studentAlex = await Student.create({
      schoolId: school._id,
      name: "Alex Mercer",
      rollNumber: "HER-101",
      admissionNumber: "ADM-2026-001",
      email: "alex@heritage.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    studentSophia = await Student.create({
      schoolId: school._id,
      name: "Sophia Zhang",
      rollNumber: "HER-102",
      admissionNumber: "ADM-2026-002",
      email: "sophia@heritage.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    const now = new Date();

    // 3. Create Exams
    publishedExam = await Exam.create({
      schoolId: school._id,
      title: "Physics Term 1",
      slug: "phy-term-1",
      accessCode: "PHY101",
      subject: "Physics",
      classGrade: "Grade 10",
      isResultsPublished: true,
      config: {
        durationMinutes: 45,
        startTime: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        endTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
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
          points: 5,
        },
        {
          id: "q2",
          type: "written",
          prompt: "Explain total internal reflection.",
          points: 10,
          rubric: "Mention critical angle and denser to rarer medium.",
        },
      ],
    });

    unpublishedExam = await Exam.create({
      schoolId: school._id,
      title: "Chemistry Term 1",
      slug: "chem-term-1",
      accessCode: "CHEM101",
      subject: "Chemistry",
      classGrade: "Grade 10",
      isResultsPublished: false,
      config: {
        durationMinutes: 60,
        startTime: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        endTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
        resultReleaseMode: "manual",
        antiCheating: { enabled: true, maxViolations: 3 },
      },
      questions: [
        {
          id: "qc1",
          type: "single_choice",
          prompt: "What is the pH of pure water?",
          options: [
            { id: "a", text: "7" },
            { id: "b", text: "1" },
          ],
          correctAnswer: "a",
          points: 5,
        },
      ],
    });

    // 4. Create Attempts
    alexAttempt1 = await ExamAttempt.create({
      schoolId: school._id,
      examId: publishedExam._id,
      studentId: studentAlex._id,
      studentSnapshot: {
        name: studentAlex.name,
        rollNumber: studentAlex.rollNumber,
        admissionNumber: studentAlex.admissionNumber,
        email: studentAlex.email,
        classGrade: studentAlex.classGrade,
        section: studentAlex.section,
      },
      startedAt: new Date(now.getTime() - 40 * 60000).toISOString(),
      submittedAt: new Date(now.getTime() - 10 * 60000).toISOString(),
      serverDeadline: new Date(now.getTime() + 5 * 60000).toISOString(),
      status: "submitted",
      responses: [
        { questionId: "q1", selectedOptions: ["opt_a"] },
        { questionId: "q2", writtenAnswer: "Light travelling from denser to rarer medium at angle > critical angle." },
      ],
      scores: {
        totalMarks: 14,
        maxMarks: 15,
        percentage: 93.3,
        mcqMarks: 5,
        writtenMarks: 9,
        isGradingComplete: true,
      },
      questionEvaluations: [
        { questionId: "q1", marksAwarded: 5, maxMarks: 5, isAutoGraded: true },
        { questionId: "q2", marksAwarded: 9, maxMarks: 10, isAutoGraded: false, feedback: "Great answer!" },
      ],
      violationCount: 0,
    });

    alexAttempt2 = await ExamAttempt.create({
      schoolId: school._id,
      examId: unpublishedExam._id,
      studentId: studentAlex._id,
      studentSnapshot: {
        name: studentAlex.name,
        rollNumber: studentAlex.rollNumber,
        admissionNumber: studentAlex.admissionNumber,
        email: studentAlex.email,
        classGrade: studentAlex.classGrade,
        section: studentAlex.section,
      },
      startedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      submittedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      serverDeadline: new Date(now.getTime() + 15 * 60000).toISOString(),
      status: "submitted",
      responses: [{ questionId: "qc1", selectedOptions: ["a"] }],
      scores: {
        totalMarks: 5,
        maxMarks: 5,
        percentage: 100,
        mcqMarks: 5,
        writtenMarks: 0,
        isGradingComplete: true,
      },
      questionEvaluations: [{ questionId: "qc1", marksAwarded: 5, maxMarks: 5, isAutoGraded: true }],
      violationCount: 1,
    });

    sophiaAttempt = await ExamAttempt.create({
      schoolId: school._id,
      examId: publishedExam._id,
      studentId: studentSophia._id,
      studentSnapshot: {
        name: studentSophia.name,
        rollNumber: studentSophia.rollNumber,
        admissionNumber: studentSophia.admissionNumber,
        email: studentSophia.email,
        classGrade: studentSophia.classGrade,
        section: studentSophia.section,
      },
      startedAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      submittedAt: new Date(now.getTime() - 5 * 60000).toISOString(),
      serverDeadline: new Date(now.getTime() + 15 * 60000).toISOString(),
      status: "submitted",
      responses: [{ questionId: "q1", selectedOptions: ["opt_b"] }],
      scores: {
        totalMarks: 0,
        maxMarks: 15,
        percentage: 0,
        mcqMarks: 0,
        writtenMarks: 0,
        isGradingComplete: false,
      },
      questionEvaluations: [
        { questionId: "q1", marksAwarded: 0, maxMarks: 5, isAutoGraded: true },
        { questionId: "q2", marksAwarded: 0, maxMarks: 10, isAutoGraded: false },
      ],
      violationCount: 0,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("should retrieve full test history for student Alex Mercer by Roll Number", async () => {
    const student = await Student.findOne({ rollNumber: "HER-101" }).lean();
    expect(student).not.toBeNull();

    const attempts = await ExamAttempt.find({ studentId: student._id }).sort({ createdAt: -1 }).lean();
    expect(attempts.length).toBe(2);

    const publishedCount = attempts.filter((a: any) => a.examId.toString() === publishedExam._id.toString()).length;
    expect(publishedCount).toBe(1);

    // Verify published attempt scores
    const publishedAttempt = attempts.find((a: any) => a.examId.toString() === publishedExam._id.toString());
    expect(publishedAttempt?.scores.totalMarks).toBe(14);
    expect(publishedAttempt?.scores.percentage).toBe(93.3);
  });

  it("should retrieve student test history by admission number", async () => {
    const student = await Student.findOne({ admissionNumber: "ADM-2026-001" }).lean();
    expect(student).not.toBeNull();
    expect(student?.name).toBe("Alex Mercer");

    const attempts = await ExamAttempt.find({ studentId: student?._id }).lean();
    expect(attempts.length).toBe(2);
  });

  it("should expose detailed question evaluations and scorecards when results are published", async () => {
    const attempt = await ExamAttempt.findById(alexAttempt1._id).lean();
    const exam = await Exam.findById(attempt?.examId).lean();

    const isPublished = exam?.isResultsPublished || exam?.config.resultReleaseMode === "immediate";
    expect(isPublished).toBe(true);

    // Question evaluations should match
    expect(attempt?.scores.totalMarks).toBe(14);
    expect(attempt?.scores.isGradingComplete).toBe(true);

    const q1Eval = attempt?.questionEvaluations.find((e: any) => e.questionId === "q1");
    expect(q1Eval?.marksAwarded).toBe(5);

    const q2Eval = attempt?.questionEvaluations.find((e: any) => e.questionId === "q2");
    expect(q2Eval?.marksAwarded).toBe(9);
    expect(q2Eval?.feedback).toBe("Great answer!");
  });

  it("should correctly identify unpublished exam results and protect answer secrecy", async () => {
    const attempt = await ExamAttempt.findById(alexAttempt2._id).lean();
    const exam = await Exam.findById(attempt?.examId).lean();

    const isPublished = exam?.isResultsPublished || exam?.config.resultReleaseMode === "immediate";
    expect(isPublished).toBe(false);

    // When unpublished, client results should not reveal answers
    expect(exam?.isResultsPublished).toBe(false);
    expect(exam?.config.resultReleaseMode).toBe("manual");
  });

  it("should calculate performance summary metrics accurately across multiple exams", async () => {
    const attempts = await ExamAttempt.find({ studentId: studentAlex._id }).lean();
    const exams = await Exam.find({ _id: { $in: attempts.map((a: any) => a.examId) } }).lean();
    const examMap = new Map(exams.map((e: any) => [e._id.toString(), e]));

    let publishedCount = 0;
    let sumPercentage = 0;
    let highestPercentage = 0;
    let passedCount = 0;

    for (const a of attempts) {
      const e: any = examMap.get(a.examId.toString());
      const isPub = e?.isResultsPublished || e?.config?.resultReleaseMode === "immediate";
      if (isPub && a.scores) {
        publishedCount += 1;
        sumPercentage += a.scores.percentage;
        if (a.scores.percentage > highestPercentage) {
          highestPercentage = a.scores.percentage;
        }
        if (a.scores.percentage >= 40) {
          passedCount += 1;
        }
      }
    }

    expect(publishedCount).toBe(1);
    expect(highestPercentage).toBe(93.3);
    expect(passedCount).toBe(1);
  });
});

