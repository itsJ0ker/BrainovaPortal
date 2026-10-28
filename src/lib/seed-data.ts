import mongoose from "mongoose";
import School from "@/models/School";
import { AcademicYear, ClassGrade, Subject } from "@/models/Academic";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import AuditLog from "@/models/AuditLog";
import { connectDB } from "@/lib/db";

export async function seedDatabase() {
  await connectDB();

  // Clear existing collections for a clean, deterministic seed
  await Promise.all([
    School.deleteMany({}),
    AcademicYear.deleteMany({}),
    ClassGrade.deleteMany({}),
    Subject.deleteMany({}),
    Student.deleteMany({}),
    Exam.deleteMany({}),
    ExamAttempt.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 1. Create Schools
  const bcrypt = await import("bcryptjs");
  const defaultHashedPassword = await bcrypt.hash("School@123", 10);

  const school1: any = await School.create({
    _id: new mongoose.Types.ObjectId("67bc98124501a35123456789"),
    name: "Greenwood International Academy",
    slug: "greenwood-high",
    code: "GRN-01",
    status: "active",
    contactEmail: "admin@greenwood.edu",
    contactPhone: "+1 (555) 234-5678",
    address: "1424 Pinecrest Way, Cambridge, MA",
    adminEmail: "admin@greenwood.edu",
    adminName: "Dr. Eleanor Vance",
    adminPassword: defaultHashedPassword,
    onboardingStatus: "completed",
    settings: {
      defaultExamDuration: 60,
      allowSelfRegistration: false,
      enableAntiCheatingByDefault: true,
      themeColor: "#4f46e5",
    },
  } as any);

  const school2: any = await School.create({
    _id: new mongoose.Types.ObjectId("67bc98124501a35123456790"),
    name: "Apex STEM Institute",
    slug: "apex-stem",
    code: "APX-02",
    status: "active",
    contactEmail: "director@apexstem.org",
    contactPhone: "+1 (555) 876-5432",
    address: "88 Science Park Dr, Austin, TX",
    adminEmail: "director@apexstem.org",
    adminName: "Prof. Arthur Pendelton",
    adminPassword: defaultHashedPassword,
    onboardingStatus: "completed",
    settings: {
      defaultExamDuration: 45,
      allowSelfRegistration: false,
      enableAntiCheatingByDefault: true,
      themeColor: "#0ea5e9",
    },
  } as any);

  // 2. Academic setup for Greenwood
  await AcademicYear.create({
    schoolId: school1._id,
    name: "2025-2026",
    isCurrent: true,
    startDate: "2025-09-01",
    endDate: "2026-06-30",
  });

  await ClassGrade.create([
    {
      schoolId: school1._id,
      name: "Grade 10",
      order: 10,
      streams: ["General", "Science"],
      sections: ["A", "B"],
    },
    {
      schoolId: school1._id,
      name: "Grade 11",
      order: 11,
      streams: ["Science", "Commerce", "Humanities"],
      sections: ["A", "B", "C"],
    },
    {
      schoolId: school1._id,
      name: "Grade 12",
      order: 12,
      streams: ["Science", "Commerce"],
      sections: ["A"],
    },
  ]);

  await Subject.create([
    { schoolId: school1._id, name: "Physics", code: "PHY-101", department: "Science" },
    { schoolId: school1._id, name: "Computer Science", code: "CS-201", department: "Technology" },
    { schoolId: school1._id, name: "Mathematics", code: "MTH-101", department: "Mathematics" },
    { schoolId: school1._id, name: "English Literature", code: "ENG-101", department: "Languages" },
  ]);

  // Academic setup for Apex STEM
  await AcademicYear.create({
    schoolId: school2._id,
    name: "2025-2026",
    isCurrent: true,
    startDate: "2025-08-15",
    endDate: "2026-05-30",
  });

  await ClassGrade.create([
    {
      schoolId: school2._id,
      name: "Grade 11",
      order: 11,
      streams: ["STEM"],
      sections: ["Alpha", "Beta"],
    },
  ]);

  await Subject.create([
    { schoolId: school2._id, name: "Calculus", code: "CALC-301", department: "Math" },
  ]);

  // 3. Students
  const greenwoodStudents: any = await Student.create([
    {
      schoolId: school1._id,
      name: "Alex Mercer",
      rollNumber: "GRN-101",
      admissionNumber: "ADM-2025-001",
      email: "alex.mercer@student.greenwood.edu",
      classGrade: "Grade 10",
      stream: "General",
      section: "A",
      status: "active",
      customFields: new Map([["guardianContact", "+1-555-0101"]]),
    },
    {
      schoolId: school1._id,
      name: "Sophia Zhang",
      rollNumber: "GRN-102",
      admissionNumber: "ADM-2025-002",
      email: "sophia.zhang@student.greenwood.edu",
      classGrade: "Grade 10",
      stream: "Science",
      section: "A",
      status: "active",
      customFields: new Map([["guardianContact", "+1-555-0102"]]),
    },
    {
      schoolId: school1._id,
      name: "Jordan Hayes",
      rollNumber: "GRN-103",
      admissionNumber: "ADM-2025-003",
      email: "jordan.hayes@student.greenwood.edu",
      classGrade: "Grade 10",
      stream: "Science",
      section: "B",
      status: "active",
    },
    {
      schoolId: school1._id,
      name: "Maya Patel",
      rollNumber: "GRN-104",
      admissionNumber: "ADM-2025-004",
      email: "maya.patel@student.greenwood.edu",
      classGrade: "Grade 11",
      stream: "Science",
      section: "A",
      status: "active",
    },
  ]);

  const apexStudents: any = await Student.create([
    {
      schoolId: school2._id,
      name: "Ethan Wright",
      rollNumber: "APX-201",
      admissionNumber: "ADM-APX-001",
      email: "ethan@apexstem.org",
      classGrade: "Grade 11",
      stream: "STEM",
      section: "Alpha",
      status: "active",
    },
    {
      schoolId: school2._id,
      name: "Chloe Vance",
      rollNumber: "APX-202",
      admissionNumber: "ADM-APX-002",
      email: "chloe@apexstem.org",
      classGrade: "Grade 11",
      stream: "STEM",
      section: "Alpha",
      status: "active",
    },
  ]);

  // 4. Exams
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const exam1: any = await Exam.create({
    schoolId: school1._id,
    title: "Midterm Physics: Kinematics & Modern Optics",
    slug: "midterm-physics-kinematics-optics",
    accessCode: "PHYS101",
    description: "Assessment covering Newton's laws of motion, wave optics, and refractive indices.",
    subject: "Physics",
    classGrade: "Grade 10",
    targeting: {
      type: "class_section",
      classes: ["Grade 10"],
      streams: ["General", "Science"],
      sections: ["A", "B"],
      studentIds: [],
    },
    config: {
      durationMinutes: 45,
      startTime,
      endTime,
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
    isResultsPublished: false,
    questions: [
      {
        id: "q_phy_1",
        type: "single_choice",
        prompt: "A projectile is launched at an angle of 45° with an initial velocity $v$. Neglecting air resistance, what is the acceleration at the peak of its trajectory?",
        options: [
          { id: "opt_a", text: "0 m/s²" },
          { id: "opt_b", text: "$g$ downward (9.8 m/s²)" },
          { id: "opt_c", text: "$g$ directed horizontally" },
          { id: "opt_d", text: "v / √2" },
        ],
        correctAnswer: "opt_b",
        points: 4,
        negativePoints: 1,
        explanation: "Gravity ($g$) continuously acts downward on a projectile at all points in flight.",
      },
      {
        id: "q_phy_2",
        type: "multiple_choice",
        prompt: "Which of the following phenomena demonstrate the wave nature of light? (Select all that apply)",
        options: [
          { id: "opt_diff", text: "Diffraction" },
          { id: "opt_photo", text: "Photoelectric Effect" },
          { id: "opt_interf", text: "Interference" },
          { id: "opt_polar", text: "Polarization" },
        ],
        correctAnswer: ["opt_diff", "opt_interf", "opt_polar"],
        points: 5,
        negativePoints: 1,
        explanation: "Diffraction, interference, and polarization demonstrate wave behavior. Photoelectric effect proves particle nature.",
      },
      {
        id: "q_phy_3",
        type: "true_false",
        prompt: "The index of refraction of a medium is always greater than or equal to 1 in conventional materials.",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswer: "true",
        points: 2,
        negativePoints: 0,
        explanation: "Since $n = c/v$ and speed in matter cannot exceed $c$, $n \\ge 1$.",
      },
      {
        id: "q_phy_4",
        type: "written",
        prompt: "State Snell's Law of refraction and briefly explain why a pencil partially submerged in a beaker of water appears bent at the boundary.",
        points: 10,
        negativePoints: 0,
        rubric: "5 points for correct formula n1*sin(theta1) = n2*sin(theta2); 5 points for conceptual explanation of phase speed change creating optical refraction.",
      },
    ],
  });

  const exam2: any = await Exam.create({
    schoolId: school1._id,
    title: "Computer Science: Algorithms & Big-O",
    slug: "cs-algorithms-big-o",
    accessCode: "CS202",
    description: "Evaluates sorting algorithms, binary search complexity, and stack operations.",
    subject: "Computer Science",
    classGrade: "Grade 11",
    targeting: {
      type: "class_section",
      classes: ["Grade 11"],
      streams: ["Science"],
      sections: ["A"],
      studentIds: [],
    },
    config: {
      durationMinutes: 30,
      startTime,
      endTime,
      attemptLimit: 1,
      shuffleQuestions: true,
      shuffleOptions: true,
      verificationMode: "roll_or_admission",
      resultReleaseMode: "immediate",
      antiCheating: {
        enabled: true,
        maxViolations: 2,
        actionOnThreshold: "warn_only",
        blockCopyPaste: true,
        enforceFullscreen: false,
        detectTabSwitch: true,
        preventContextMenu: true,
      },
    },
    status: "published",
    isResultsPublished: true,
    questions: [
      {
        id: "q_cs_1",
        type: "single_choice",
        prompt: "What is the worst-case time complexity of QuickSort when a poor pivot strategy is selected?",
        options: [
          { id: "opt_1", text: "O(n log n)" },
          { id: "opt_2", text: "O(n²)" },
          { id: "opt_3", text: "O(log n)" },
          { id: "opt_4", text: "O(1)" },
        ],
        correctAnswer: "opt_2",
        points: 5,
        negativePoints: 1,
      },
      {
        id: "q_cs_2",
        type: "true_false",
        prompt: "A Stack data structure operates on a First-In, First-Out (FIFO) basis.",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswer: "false",
        points: 3,
        negativePoints: 0,
      },
    ],
  });

  // 5. Create initial student attempts for Greenwood High
  const deadline = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

  // Alex Mercer (GRN-101) - High Scorer (Published & Graded)
  await ExamAttempt.create({
    schoolId: school1._id,
    examId: exam1._id,
    studentId: greenwoodStudents[0]._id, // Alex Mercer
    studentSnapshot: {
      name: "Alex Mercer",
      rollNumber: "GRN-101",
      admissionNumber: "ADM-2025-001",
      email: "alex.mercer@student.greenwood.edu",
      classGrade: "Grade 10",
      section: "A",
    },
    startedAt: new Date(now.getTime() - 40 * 60 * 1000).toISOString(),
    submittedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
    serverDeadline: deadline,
    status: "submitted",
    responses: [
      {
        questionId: "q_phy_1",
        selectedOptions: ["opt_b"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_2",
        selectedOptions: ["opt_diff", "opt_interf", "opt_polar"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_3",
        selectedOptions: ["true"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_4",
        writtenAnswer:
          "The apparent bending occurs because light travels at different speeds in water and air. According to Snell's law (n1*sin θ1 = n2*sin θ2), the change in optical density causes refraction at the boundary, shifting the perceived image upwards.",
        answeredAt: new Date().toISOString(),
      },
    ],
    scores: {
      totalMarks: 19,
      maxMarks: 21,
      percentage: 90.5,
      mcqMarks: 11,
      writtenMarks: 8,
      isGradingComplete: true,
    },
    questionEvaluations: [
      { questionId: "q_phy_1", marksAwarded: 4, maxMarks: 4, isAutoGraded: true, feedback: "Correct" },
      { questionId: "q_phy_2", marksAwarded: 5, maxMarks: 5, isAutoGraded: true, feedback: "Correct" },
      { questionId: "q_phy_3", marksAwarded: 2, maxMarks: 2, isAutoGraded: true, feedback: "Correct" },
      {
        questionId: "q_phy_4",
        marksAwarded: 8,
        maxMarks: 10,
        isAutoGraded: false,
        feedback: "Comprehensive Snell's Law derivation and boundary condition discussion.",
        gradedBy: "Dr. Eleanor Vance",
      },
    ],
    integrityLog: [],
    violationCount: 0,
    shuffledQuestionOrder: ["q_phy_1", "q_phy_2", "q_phy_3", "q_phy_4"],
  });

  // Sophia Zhang (GRN-102) - Partial Graded
  await ExamAttempt.create({
    schoolId: school1._id,
    examId: exam1._id,
    studentId: greenwoodStudents[1]._id, // Sophia Zhang
    studentSnapshot: {
      name: "Sophia Zhang",
      rollNumber: "GRN-102",
      admissionNumber: "ADM-2025-002",
      email: "sophia.zhang@student.greenwood.edu",
      classGrade: "Grade 10",
      section: "A",
    },
    startedAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
    submittedAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    serverDeadline: deadline,
    status: "submitted",
    responses: [
      {
        questionId: "q_phy_1",
        selectedOptions: ["opt_b"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_2",
        selectedOptions: ["opt_diff", "opt_interf", "opt_polar"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_3",
        selectedOptions: ["true"],
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: "q_phy_4",
        writtenAnswer:
          "Snell's Law states that n1 * sin(theta1) = n2 * sin(theta2). When light waves travel from water (higher optical density, lower speed) into air (lower optical density, higher speed), the rays bend away from the normal. This angular deflection causes our eyes to extrapolate the submerged pencil's position to a shallower virtual depth, creating the visual impression of a bend.",
        answeredAt: new Date().toISOString(),
      },
    ],
    scores: {
      totalMarks: 11, // 4 + 5 + 2 auto-graded
      maxMarks: 21,
      percentage: 52,
      mcqMarks: 11,
      writtenMarks: 0,
      isGradingComplete: false, // Pending teacher manual evaluation of question 4
    },
    questionEvaluations: [
      { questionId: "q_phy_1", marksAwarded: 4, maxMarks: 4, isAutoGraded: true, feedback: "Correct" },
      { questionId: "q_phy_2", marksAwarded: 5, maxMarks: 5, isAutoGraded: true, feedback: "Correct" },
      { questionId: "q_phy_3", marksAwarded: 2, maxMarks: 2, isAutoGraded: true, feedback: "Correct" },
      {
        questionId: "q_phy_4",
        marksAwarded: 0,
        maxMarks: 10,
        isAutoGraded: false,
        feedback: "Pending review",
      },
    ],
    integrityLog: [
      {
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        type: "tab_switch",
        details: "User navigated away from active exam tab for 3 seconds.",
      },
    ],
    violationCount: 1,
    shuffledQuestionOrder: ["q_phy_1", "q_phy_2", "q_phy_3", "q_phy_4"],
  });

  // 6. Audit Log
  await AuditLog.create([
    {
      schoolId: school1._id,
      actorId: "dev_school_admin_1",
      actorName: "Dr. Eleanor Vance",
      actorRole: "school_admin",
      action: "EXAM_PUBLISHED",
      resourceType: "Exam",
      resourceId: exam1._id.toString(),
      details: { title: exam1.title, accessCode: exam1.accessCode },
      ipAddress: "127.0.0.1",
    },
  ]);

  return {
    schools: [school1, school2],
    exams: [exam1, exam2],
  };
}
