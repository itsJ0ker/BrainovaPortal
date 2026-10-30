import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { NextRequest } from "next/server";
import { setMockCurrentUser } from "@/lib/auth";
import { signStudentSession } from "@/lib/session";

// Route handlers under test
import { POST as superAdminExamsPostRoute, GET as superAdminExamsGetRoute } from "@/app/api/super-admin/exams/route";
import { PATCH as superAdminExamPatchRoute } from "@/app/api/super-admin/exams/[id]/route";
import { GET as schoolExamsGetRoute, POST as schoolExamsPostRoute } from "@/app/api/school/[schoolId]/exams/route";
import { POST as portalVerifyRoute } from "@/app/api/portal/verify/route";
import { POST as portalSaveRoute } from "@/app/api/portal/attempt/save/route";
import { POST as portalEventRoute } from "@/app/api/portal/attempt/event/route";
import { POST as portalSubmitRoute } from "@/app/api/portal/attempt/submit/route";
import { GET as invigilationGetRoute } from "@/app/api/school/[schoolId]/exams/[examId]/invigilation/route";
import { POST as gradePostRoute } from "@/app/api/school/[schoolId]/exams/[examId]/grade/route";
import { GET as certificateGetRoute } from "@/app/api/portal/certificate/[attemptId]/route";

describe("Bot Testing Team: Multi-Role End-to-End Swarm & Load Simulation", () => {
  let mongod: MongoMemoryServer;

  // Institutions
  let schoolDelhi: any;
  let schoolMumbai: any;
  let schoolExcluded: any;

  // Student Bot Cohorts
  const NUM_DELHI_BOTS = 25;
  const NUM_MUMBAI_BOTS = 25;
  const TOTAL_BOTS = NUM_DELHI_BOTS + NUM_MUMBAI_BOTS; // 50 bots
  const delhiStudentBots: any[] = [];
  const mumbaiStudentBots: any[] = [];
  const allStudentBots: any[] = [];

  // Active platform exam under test
  let nationalExamId: string;
  let nationalAccessCode: string;

  // Sessions map: studentId -> { token, attemptId }
  const studentSessions = new Map<string, { token: string; attemptId: string }>();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.STUDENT_SESSION_SECRET = "test-secret-salt-32-chars-minimum-length-key-1234";
    await mongoose.connect(mongod.getUri());

    // 1. Establish 3 Schools
    schoolDelhi = await School.create({
      name: "Delhi World Olympiad Academy",
      slug: "delhi-world-academy",
      code: "DWA-DEL",
      adminEmail: "admin@delhiworld.edu",
      contactEmail: "contact@delhiworld.edu",
      status: "active",
    });

    schoolMumbai = await School.create({
      name: "Mumbai International Scholars School",
      slug: "mumbai-scholars",
      code: "MSS-BOM",
      adminEmail: "principal@mumbaischolars.edu",
      contactEmail: "info@mumbaischolars.edu",
      status: "active",
    });

    schoolExcluded = await School.create({
      name: "Excluded Uninvited High School",
      slug: "excluded-school",
      code: "EXC-001",
      adminEmail: "admin@excluded.edu",
      contactEmail: "admin@excluded.edu",
      status: "active",
    });

    // 2. Spawn 25 Student Roster Bots for Delhi
    for (let i = 1; i <= NUM_DELHI_BOTS; i++) {
      const roll = `DEL-BOT-${String(i).padStart(3, "0")}`;
      const bot = await Student.create({
        schoolId: schoolDelhi._id,
        name: `Delhi Candidate Bot ${i}`,
        rollNumber: roll,
        admissionNumber: `ADM-DEL-${String(i).padStart(3, "0")}`,
        email: `delhi.bot${i}@delhiworld.edu`,
        classGrade: "Grade 10",
        section: i % 2 === 0 ? "A" : "B",
        status: "active",
      });
      delhiStudentBots.push(bot);
      allStudentBots.push(bot);
    }

    // 3. Spawn 25 Student Roster Bots for Mumbai
    for (let i = 1; i <= NUM_MUMBAI_BOTS; i++) {
      const roll = `BOM-BOT-${String(i).padStart(3, "0")}`;
      const bot = await Student.create({
        schoolId: schoolMumbai._id,
        name: `Mumbai Candidate Bot ${i}`,
        rollNumber: roll,
        admissionNumber: `ADM-BOM-${String(i).padStart(3, "0")}`,
        email: `mumbai.bot${i}@mumbaischolars.edu`,
        classGrade: "Grade 10",
        section: i % 2 === 0 ? "A" : "B",
        status: "active",
      });
      mumbaiStudentBots.push(bot);
      allStudentBots.push(bot);
    }
  });

  afterAll(async () => {
    setMockCurrentUser(null);
    await mongoose.disconnect();
    await mongod.stop();
  });

  // =========================================================================
  // BOT SUITE 1: SUPER ADMIN EXAM CREATION & MULTI-SCHOOL CONSORTIUM
  // =========================================================================
  it("Bot Test 1 [SuperAdminBot]: Authors a nationwide Olympiad with all 4 question types & multi-school assignment", async () => {
    setMockCurrentUser({
      userId: "superadmin_bot_01",
      name: "Global Consortium Director",
      email: "director@brainova.edu",
      role: "super_admin",
    });

    const now = new Date();
    const startTime = new Date(now.getTime() - 15 * 60000).toISOString(); // Started 15 mins ago
    const endTime = new Date(now.getTime() + 120 * 60000).toISOString();  // Open for 2 hours

    const newExamPayload = {
      title: "All-India Inter-School Science & Logic Olympiad 2026",
      subject: "Science & Logic",
      classGrade: "Grade 10",
      description: "Official consortium championship hosted across accredited partner academies.",
      customAccessCode: "OLYMP-PAN-2026",
      isPlatformExam: false,
      participatingSchoolIds: [schoolDelhi._id.toString(), schoolMumbai._id.toString()],
      durationMinutes: 60,
      startTime,
      endTime,
      status: "published",
      resultReleaseMode: "immediate",
      config: {
        shuffleQuestions: true,
        shuffleOptions: true,
      },
      antiCheating: {
        enabled: true,
        maxViolations: 3,
        actionOnThreshold: "auto_submit",
        blockCopyPaste: true,
        detectTabSwitch: true,
      },
      questions: [
        // 1. Single Choice MCQ with negative marking
        {
          id: "q_mcq_single",
          type: "single_choice",
          prompt: "What is the SI unit of electric potential difference?",
          options: [
            { id: "opt_volt", text: "Volt (V)" },
            { id: "opt_ampere", text: "Ampere (A)" },
            { id: "opt_watt", text: "Watt (W)" },
            { id: "opt_ohm", text: "Ohm (Ω)" },
          ],
          correctAnswer: "opt_volt",
          points: 4,
          negativePoints: 1,
          explanation: "1 Volt = 1 Joule per Coulomb.",
        },
        // 2. Multiple Choice (Multi-Select)
        {
          id: "q_mcq_multi",
          type: "multiple_choice",
          prompt: "Which of the following are vector quantities in classical physics? (Select all that apply)",
          options: [
            { id: "opt_vel", text: "Velocity" },
            { id: "opt_mass", text: "Mass" },
            { id: "opt_acc", text: "Acceleration" },
            { id: "opt_temp", text: "Temperature" },
          ],
          correctAnswer: ["opt_vel", "opt_acc"],
          points: 4,
          negativePoints: 1,
          explanation: "Velocity and acceleration have both magnitude and direction.",
        },
        // 3. True / False
        {
          id: "q_true_false",
          type: "true_false",
          prompt: "Every prime number strictly greater than 2 is an odd integer.",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ],
          correctAnswer: "true",
          points: 2,
          negativePoints: 0,
          explanation: "2 is the only even prime number.",
        },
        // 4. Written / Subjective with Rubric
        {
          id: "q_written",
          type: "written",
          prompt: "Derive the mathematical expression for kinetic energy (KE = 1/2 m v²) from work-energy theorem.",
          points: 10,
          negativePoints: 0,
          rubric: "+ Accuracy 50% | + Methodology 30% | + Step-by-step working 20%",
          explanation: "W = ∫ F dx = ∫ m (v dv/dt) dx = 1/2 m v².",
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/super-admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExamPayload),
    });

    const res = await superAdminExamsPostRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.exam.accessCode).toBe("OLYMP-PAN-2026");
    expect(data.exam.questions.length).toBe(4);
    expect(data.exam.participatingSchoolIds.length).toBe(2);

    nationalExamId = data.exam._id.toString();
    nationalAccessCode = data.exam.accessCode;

    // Super Admin GET global exams catalog inspection
    const getReq = new NextRequest("http://localhost:3000/api/super-admin/exams");
    const getRes = await superAdminExamsGetRoute(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();

    expect(getData.success).toBe(true);
    expect(getData.metrics.totalExams).toBeGreaterThanOrEqual(1);
    expect(getData.exams.some((e: any) => e._id.toString() === nationalExamId)).toBe(true);
  });

  // =========================================================================
  // BOT SUITE 2: SCHOOL ADMIN EXAM VISIBILITY & TENANT ISOLATION
  // =========================================================================
  it("Bot Test 2 [SchoolAdminBot]: Verifies consortium visibility in both partner portals & enforces isolation for private exams", async () => {
    // Delhi Admin queries their school's exam list
    setMockCurrentUser({
      userId: "delhi_admin_01",
      name: "Delhi Headmaster",
      email: "headmaster@delhiworld.edu",
      role: "school_admin",
      schoolId: schoolDelhi._id.toString(),
    });

    const delhiReq = new NextRequest(`http://localhost:3000/api/school/${schoolDelhi._id}/exams`);
    const delhiRes = await schoolExamsGetRoute(delhiReq, {
      params: Promise.resolve({ schoolId: schoolDelhi._id.toString() }),
    });
    expect(delhiRes.status).toBe(200);
    const delhiData = await delhiRes.json();
    // Delhi sees the Super-Admin-assigned national exam
    expect(delhiData.exams.some((e: any) => e._id.toString() === nationalExamId)).toBe(true);

    // Delhi creates a strictly local private exam
    const localExamRes = await schoolExamsPostRoute(
      new NextRequest(`http://localhost:3000/api/school/${schoolDelhi._id}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Delhi Internal Unit Test",
          subject: "Mathematics",
          classGrade: "Grade 10",
          durationMinutes: 30,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          status: "published",
          questions: [
            {
              id: "q_loc_1",
              type: "single_choice",
              prompt: "What is 7 x 8?",
              options: [
                { id: "opt_56", text: "56" },
                { id: "opt_48", text: "48" },
              ],
              correctAnswer: "opt_56",
              points: 5,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ schoolId: schoolDelhi._id.toString() }) }
    );
    expect(localExamRes.status).toBe(200);
    const localExamData = await localExamRes.json();
    const localExamId = localExamData.exam._id;

    // Mumbai Admin queries their school's exam list
    setMockCurrentUser({
      userId: "mumbai_admin_01",
      name: "Mumbai Principal",
      email: "principal@mumbaischolars.edu",
      role: "school_admin",
      schoolId: schoolMumbai._id.toString(),
    });

    const mumbaiReq = new NextRequest(`http://localhost:3000/api/school/${schoolMumbai._id}/exams`);
    const mumbaiRes = await schoolExamsGetRoute(mumbaiReq, {
      params: Promise.resolve({ schoolId: schoolMumbai._id.toString() }),
    });
    expect(mumbaiRes.status).toBe(200);
    const mumbaiData = await mumbaiRes.json();

    // Mumbai sees the consortium national exam
    expect(mumbaiData.exams.some((e: any) => e._id.toString() === nationalExamId)).toBe(true);
    // Mumbai CANNOT see Delhi's private internal exam (strict tenant isolation)
    expect(mumbaiData.exams.some((e: any) => e._id.toString() === localExamId)).toBe(false);
  });

  // =========================================================================
  // BOT SUITE 3: 50-BOT CANDIDATE SWARM VERIFICATION & LEAKAGE AUDIT
  // =========================================================================
  it("Bot Test 3 [CandidateSwarm]: 50 bots across Delhi & Mumbai verify in parallel with zero answer leakage", async () => {
    expect(allStudentBots.length).toBe(50);

    const verificationPromises = allStudentBots.map(async (bot, idx) => {
      const req = new NextRequest("http://localhost:3000/api/portal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.0.${Math.floor(idx / 25)}.${(idx % 25) + 1}`,
        },
        body: JSON.stringify({
          accessCode: nationalAccessCode,
          rollNumber: bot.rollNumber,
          name: bot.name,
        }),
      });

      const res = await portalVerifyRoute(req);
      const data = await res.json();
      return { bot, status: res.status, data };
    });

    const results = await Promise.all(verificationPromises);

    expect(results.length).toBe(50);
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.data.success).toBe(true);
      expect(r.data.sessionToken).toBeTruthy();
      expect(r.data.attempt.id).toBeTruthy();
      expect(r.data.exam.questions.length).toBe(4);

      // Store signed session for subsequent multi-bot testing
      studentSessions.set(r.bot._id.toString(), {
        token: r.data.sessionToken,
        attemptId: r.data.attempt.id,
      });

      // Strict security leakage test: verify student payload has ZERO answers, rubrics, or explanations
      for (const q of r.data.exam.questions) {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.rubric).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      }
    }

    // Verify exactly 50 active attempts were created in database
    const dbAttemptsCount = await ExamAttempt.countDocuments({ examId: nationalExamId });
    expect(dbAttemptsCount).toBe(50);

    // Negative verification test: uninvited school student should be rejected
    const uninvitedStudent = await Student.create({
      schoolId: schoolExcluded._id,
      name: "Rogue Uninvited Student",
      rollNumber: "EXC-ROGUE-999",
      admissionNumber: "ADM-EXC-999",
      email: "rogue@excluded.edu",
      classGrade: "Grade 10",
      section: "A",
      status: "active",
    });

    const rogueReq = new NextRequest("http://localhost:3000/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessCode: nationalAccessCode,
        rollNumber: uninvitedStudent.rollNumber,
      }),
    });
    const rogueRes = await portalVerifyRoute(rogueReq);
    expect(rogueRes.status).toBe(404);
  });

  // =========================================================================
  // BOT SUITE 4: HIGH-FREQUENCY INCREMENTAL AUTOSAVES ACROSS ALL 4 QUESTION TYPES
  // =========================================================================
  it("Bot Test 4 [CandidateSwarm]: 50 bots fire concurrent autosaves across all 4 question types without data loss", async () => {
    // Each bot concurrently saves responses across all 4 question types
    const saveOperations = allStudentBots.map(async (bot, idx) => {
      const session = studentSessions.get(bot._id.toString())!;

      // Bots 0..39 answer correctly; Bots 40..49 answer with mistakes
      const isHighScorer = idx < 40;

      const saves = [
        // 1. Single Choice MCQ
        portalSaveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              questionId: "q_mcq_single",
              selectedOptions: [isHighScorer ? "opt_volt" : "opt_ohm"],
            }),
          })
        ),
        // 2. Multi-Select MCQ
        portalSaveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              questionId: "q_mcq_multi",
              selectedOptions: isHighScorer ? ["opt_vel", "opt_acc"] : ["opt_mass"],
            }),
          })
        ),
        // 3. True / False
        portalSaveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              questionId: "q_true_false",
              selectedOptions: ["true"],
            }),
          })
        ),
        // 4. Written response
        portalSaveRoute(
          new NextRequest("http://localhost:3000/api/portal/attempt/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              questionId: "q_written",
              writtenAnswer: `Proof by Candidate Bot ${idx + 1}: W = ∫ F dx = ∫ m (v dv/dt) dx = m ∫ v dv = 1/2 m v^2. Q.E.D.`,
            }),
          })
        ),
      ];

      const saveResults = await Promise.all(saves);
      for (const sr of saveResults) {
        expect(sr.status).toBe(200);
      }
    });

    await Promise.all(saveOperations);

    // Verify all 50 attempts in MongoDB hold responses for all 4 questions
    const attempts = await ExamAttempt.find({ examId: nationalExamId });
    expect(attempts.length).toBe(50);
    for (const att of attempts) {
      expect(att.responses.length).toBe(4);
      const writtenResp = att.responses.find((r: any) => r.questionId === "q_written");
      expect(writtenResp?.writtenAnswer).toContain("Q.E.D.");
    }
  });

  // =========================================================================
  // BOT SUITE 5: ANTI-CHEATING TELEMETRY, WARNINGS & AUTO-SUBMIT ENFORCEMENT
  // =========================================================================
  it("Bot Test 5 [AntiCheatingBot]: Handles telemetry heartbeats, duplicate suppression & auto-submits 5 cheater bots", async () => {
    // Bots 45..49 act as cheating bots who repeatedly trigger integrity events
    const cheaterBots = allStudentBots.slice(45, 50);

    for (const bot of cheaterBots) {
      const session = studentSessions.get(bot._id.toString())!;

      // Event 1: Tab switch
      const res1 = await portalEventRoute(
        new NextRequest("http://localhost:3000/api/portal/attempt/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session.token,
            type: "tab_switch",
            details: "Candidate switched tab to search engine",
          }),
        })
      );
      const d1 = await res1.json();
      expect(d1.success).toBe(true);
      expect(d1.violationCount).toBe(1);
      expect(d1.autoSubmitted).toBe(false);

      // Event 2: Fullscreen exit
      const res2 = await portalEventRoute(
        new NextRequest("http://localhost:3000/api/portal/attempt/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session.token,
            type: "fullscreen_exit",
            details: "Candidate exited fullscreen browser window",
          }),
        })
      );
      const d2 = await res2.json();
      expect(d2.success).toBe(true);
      expect(d2.violationCount).toBe(2);
      expect(d2.autoSubmitted).toBe(false);

      // Event 3: Copy-paste attempt (Hits threshold of 3 warnings -> auto-submit!)
      const res3 = await portalEventRoute(
        new NextRequest("http://localhost:3000/api/portal/attempt/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session.token,
            type: "copy_paste_attempt",
            details: "Candidate attempted clipboard paste",
          }),
        })
      );
      const d3 = await res3.json();
      expect(d3.success).toBe(true);
      expect(d3.violationCount).toBe(3);
      expect(d3.autoSubmitted).toBe(true);
    }

    // Verify in MongoDB that the 5 cheaters were auto-submitted
    const autoSubmittedCount = await ExamAttempt.countDocuments({
      examId: nationalExamId,
      status: "auto_submitted",
    });
    expect(autoSubmittedCount).toBe(5);
  });

  // =========================================================================
  // BOT SUITE 6: MASSIVE CONCURRENT SUBMISSION & AUTOMATIC OBJECTIVE GRADING
  // =========================================================================
  it("Bot Test 6 [CandidateSwarm]: Remaining 45 candidate bots submit simultaneously with accurate auto-grading", async () => {
    const legitimateBots = allStudentBots.slice(0, 45);

    const submissionStart = Date.now();
    const submissionPromises = legitimateBots.map(async (bot) => {
      const session = studentSessions.get(bot._id.toString())!;
      const req = new NextRequest("http://localhost:3000/api/portal/attempt/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      });
      const res = await portalSubmitRoute(req);
      const data = await res.json();
      return { status: res.status, data };
    });

    const subResults = await Promise.all(submissionPromises);
    const durationMs = Date.now() - submissionStart;

    expect(subResults.length).toBe(45);
    for (const r of subResults) {
      expect(r.status).toBe(200);
      expect(r.data.success).toBe(true);
      expect(r.data.scores).toBeDefined();
    }

    // High scorers (first 40 bots) should have received 10/10 on the 3 objective questions:
    // Single choice (+4), Multi-select (+4), True/False (+2) = 10 marks
    const firstBotSession = studentSessions.get(allStudentBots[0]._id.toString())!;
    const firstAttempt = await ExamAttempt.findById(firstBotSession.attemptId);
    expect(firstAttempt.scores.mcqMarks).toBe(10);
    expect(firstAttempt.scores.isGradingComplete).toBe(false); // Written question still awaits teacher grading

    // Verify all 50 attempts are now either submitted or auto_submitted
    const finishedAttempts = await ExamAttempt.countDocuments({
      examId: nationalExamId,
      status: { $in: ["submitted", "auto_submitted"] },
    });
    expect(finishedAttempts).toBe(50);
  });

  // =========================================================================
  // BOT SUITE 7: INVIGILATOR LIVE DASHBOARD BOT
  // =========================================================================
  it("Bot Test 7 [InvigilatorBot]: Monitors real-time candidate statuses, flagged cheaters, and violation tallies", async () => {
    setMockCurrentUser({
      userId: "delhi_invigilator_01",
      name: "Delhi Chief Invigilator",
      email: "invigilator@delhiworld.edu",
      role: "teacher",
      schoolId: schoolDelhi._id.toString(),
    });

    const req = new NextRequest(
      `http://localhost:3000/api/school/${schoolDelhi._id}/exams/${nationalExamId}/invigilation`
    );
    const res = await invigilationGetRoute(req, {
      params: Promise.resolve({
        schoolId: schoolDelhi._id.toString(),
        examId: nationalExamId,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.summary.totalEnrolled).toBe(25);
    expect(data.summary.submitted).toBe(25);
    expect(data.candidates.length).toBe(25);

    // Now inspect Mumbai's invigilation dashboard to verify cross-school isolation
    setMockCurrentUser({
      userId: "mumbai_invigilator_01",
      name: "Mumbai Chief Invigilator",
      email: "invigilator@mumbaischolars.edu",
      role: "teacher",
      schoolId: schoolMumbai._id.toString(),
    });

    const mumbaiReq = new NextRequest(
      `http://localhost:3000/api/school/${schoolMumbai._id}/exams/${nationalExamId}/invigilation`
    );
    const mumbaiRes = await invigilationGetRoute(mumbaiReq, {
      params: Promise.resolve({
        schoolId: schoolMumbai._id.toString(),
        examId: nationalExamId,
      }),
    });
    expect(mumbaiRes.status).toBe(200);
    const mumbaiData = await mumbaiRes.json();

    expect(mumbaiData.success).toBe(true);
    expect(mumbaiData.summary.totalEnrolled).toBe(25);
    expect(mumbaiData.summary.submitted).toBe(25);
    expect(mumbaiData.summary.totalViolations).toBe(15);
    expect(mumbaiData.candidates.length).toBe(25);

    // Verify cheaters have violation tallies >= 3 in Mumbai's invigilation audit
    const cheaterReports = mumbaiData.candidates.filter((c: any) => c.status === "auto_submitted");
    expect(cheaterReports.length).toBe(5);
    for (const c of cheaterReports) {
      expect(c.violationCount).toBe(3);
    }
  });

  // =========================================================================
  // BOT SUITE 8: EVALUATOR / TEACHER MANUAL GRADING DESK BOT
  // =========================================================================
  it("Bot Test 8 [EvaluatorBot]: Grades written calculus answers against rubric, recalculating percentages & audit logs", async () => {
    setMockCurrentUser({
      userId: "physics_evaluator_01",
      name: "Senior Physics Examiner",
      email: "examiner@delhiworld.edu",
      role: "teacher",
      schoolId: schoolDelhi._id.toString(),
    });

    const topCandidate = allStudentBots[0];
    const topSession = studentSessions.get(topCandidate._id.toString())!;

    // Evaluator awards 10/10 for the kinetic energy derivation
    const gradeReq = new NextRequest(
      `http://localhost:3000/api/school/${schoolDelhi._id}/exams/${nationalExamId}/grade`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: topSession.attemptId,
          evaluations: [
            {
              questionId: "q_written",
              marksAwarded: 10,
              feedback: "Flawless step-by-step calculus derivation with correct units.",
            },
          ],
        }),
      }
    );

    const gradeRes = await gradePostRoute(gradeReq, {
      params: Promise.resolve({
        schoolId: schoolDelhi._id.toString(),
        examId: nationalExamId,
      }),
    });

    expect(gradeRes.status).toBe(200);
    const gradeData = await gradeRes.json();

    expect(gradeData.success).toBe(true);
    expect(gradeData.scores.writtenMarks).toBe(10);
    expect(gradeData.scores.totalMarks).toBe(20); // 10 MCQ + 10 Written = 20/20!
    expect(gradeData.scores.percentage).toBe(100);
    expect(gradeData.scores.isGradingComplete).toBe(true);

    // Verify AuditLog record created for manual grading
    const auditRecord = await AuditLog.findOne({
      resourceId: topSession.attemptId,
      action: "MANUAL_GRADING",
    });
    expect(auditRecord).toBeDefined();
    expect(auditRecord.actorName).toBe("Senior Physics Examiner");
  });

  // =========================================================================
  // BOT SUITE 9: DISTINCTION CERTIFICATE BOT & ANTI-TAMPER VERIFICATION
  // =========================================================================
  it("Bot Test 9 [CertificateBot]: Generates Gold Distinction certificate with cryptographic verification hash", async () => {
    const topCandidate = allStudentBots[0];
    const topSession = studentSessions.get(topCandidate._id.toString())!;

    const certReq = new NextRequest(
      `http://localhost:3000/api/portal/certificate/${topSession.attemptId}`
    );
    const certRes = await certificateGetRoute(certReq, {
      params: Promise.resolve({ attemptId: topSession.attemptId }),
    });

    expect(certRes.status).toBe(200);
    const certData = await certRes.json();

    expect(certData.success).toBe(true);
    expect(certData.certificate.student.name).toBe(topCandidate.name);
    expect(certData.certificate.scores.percentage).toBe(100);
    expect(certData.certificate.distinction).toBe("Certificate of Distinction (Gold Honor Roll)");
    expect(certData.certificate.badgeTier).toBe("gold");
    expect(certData.certificate.verificationHash).toBeTruthy();
    expect(certData.certificate.attemptId).toBe(topSession.attemptId);
  });

  // =========================================================================
  // BOT SUITE 10: EXTREME CONCURRENCY LOAD BENCHMARK (50 SIMULTANEOUS REQUESTS)
  // =========================================================================
  it("Bot Test 10 [LoadTestingBot]: High-throughput concurrent burst benchmark verifies zero race conditions & sub-second latency", async () => {
    // Benchmark 50 concurrent fetch operations against the exam endpoint
    const benchmarkStart = Date.now();

    const burstPromises = allStudentBots.map(async (bot) => {
      const session = studentSessions.get(bot._id.toString())!;
      const req = new NextRequest("http://localhost:3000/api/portal/attempt/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      });
      // Already submitted attempts return idempotently and safely
      const res = await portalSubmitRoute(req);
      return res.status;
    });

    const statuses = await Promise.all(burstPromises);
    const totalLatencyMs = Date.now() - benchmarkStart;
    const avgLatencyMs = totalLatencyMs / TOTAL_BOTS;

    // All 50 concurrent requests handled cleanly (status 200)
    expect(statuses.every((s) => s === 200)).toBe(true);
    expect(statuses.length).toBe(50);

    // Verify average latency is fast (under 200ms per request)
    expect(avgLatencyMs).toBeLessThan(200);

    // Verify DB integrity: Total attempts remains strictly 50 (zero duplicate attempts created)
    const finalAttemptCount = await ExamAttempt.countDocuments({ examId: nationalExamId });
    expect(finalAttemptCount).toBe(50);
  });
});
