export type UserRole = "super_admin" | "school_admin" | "teacher" | "student";

export type SchoolStatus = "active" | "suspended" | "archived" | "invited";

export interface SchoolSettings {
  defaultExamDuration: number;
  allowSelfRegistration: boolean;
  enableAntiCheatingByDefault: boolean;
  themeColor: string;
}

export interface ISchool {
  _id: any;
  name: string;
  slug: string;
  code: string;
  status: SchoolStatus;
  logo?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  adminClerkId?: string;
  adminEmail: string;
  adminName?: string;
  adminPassword?: string;
  settings: SchoolSettings;
  onboardingStatus: "invited" | "pending_profile" | "completed";
  createdAt?: string;
  updatedAt?: string;
}

export interface IAcademicYear {
  _id: any;
  schoolId: any;
  name: string;
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
}

export interface IClassGrade {
  _id: any;
  schoolId: any;
  name: string;
  order: number;
  streams: string[];
  sections: string[];
}

export interface ISubject {
  _id: any;
  schoolId: any;
  name: string;
  code: string;
  department?: string;
}

export interface IStudent {
  _id: any;
  schoolId: any;
  name: string;
  rollNumber: string;
  admissionNumber: string;
  email: string;
  classGrade: string;
  stream?: string;
  section: string;
  status: "active" | "inactive";
  customFields?: Record<string, string>;
  createdAt?: string;
}

export type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "written";

export interface IQuestionOption {
  id: string;
  text: string;
}

export interface IQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: IQuestionOption[];
  correctAnswer?: any; // Stored server-side only
  rubric?: string; // Guidelines for written answer manual grading
  points: number;
  negativePoints?: number; // e.g. 0.25 or 1
  explanation?: string;
}

export interface IExamTargeting {
  type: "all" | "class_section" | "assigned_class" | "custom_list";
  classes: string[];
  streams: string[];
  sections: string[];
  studentIds?: any[];
}

export interface IAntiCheatingConfig {
  enabled: boolean;
  maxViolations: number;
  actionOnThreshold: "warn_only" | "auto_submit" | "flag";
  blockCopyPaste: boolean;
  enforceFullscreen: boolean;
  detectTabSwitch: boolean;
  preventContextMenu: boolean;
}

export interface IExamConfig {
  durationMinutes: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  attemptLimit: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  verificationMode: "roll_or_admission" | "roll_and_email" | "access_code_only";
  resultReleaseMode: "immediate" | "scheduled" | "manual";
  resultReleaseDate?: string | null;
  antiCheating: IAntiCheatingConfig;
}

export type ExamStatus = "draft" | "published" | "ongoing" | "completed" | "archived";

export interface IExam {
  _id: any;
  schoolId: any;
  title: string;
  slug: string;
  accessCode: string;
  description: string;
  subject: string;
  classGrade?: string;
  targeting: IExamTargeting;
  questions: IQuestion[];
  config: IExamConfig;
  status: ExamStatus;
  isResultsPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IExamPublicInfo {
  examId: string;
  schoolId: string;
  schoolName: string;
  schoolLogo?: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  startTime: string;
  endTime: string;
  verificationMode: "roll_or_admission" | "roll_and_email" | "access_code_only";
  antiCheating: IAntiCheatingConfig;
  status: ExamStatus;
}

export interface IStudentResponse {
  questionId: string;
  selectedOptions?: string[];
  writtenAnswer?: string;
  answeredAt?: string;
}

export interface IQuestionEvaluation {
  questionId: string;
  marksAwarded: number;
  maxMarks: number;
  isAutoGraded: boolean;
  feedback?: string;
  gradedBy?: string;
}

export type IntegrityEventType =
  | "tab_switch"
  | "fullscreen_exit"
  | "focus_loss"
  | "copy_paste_attempt"
  | "devtools_attempt"
  | "right_click";

export interface IIntegrityEvent {
  timestamp: string;
  type: IntegrityEventType;
  details?: string;
}

export type AttemptStatus = "in_progress" | "submitted" | "auto_submitted" | "timed_out" | "flagged";

export interface IExamAttempt {
  _id: any;
  schoolId: any;
  examId: any;
  studentId: any;
  studentSnapshot: {
    name: string;
    rollNumber: string;
    admissionNumber: string;
    email: string;
    classGrade: string;
    section: string;
  };
  startedAt: string;
  submittedAt?: string | null;
  serverDeadline: string; // Server authoritative timestamp
  status: AttemptStatus;
  responses: IStudentResponse[];
  scores: {
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    mcqMarks: number;
    writtenMarks: number;
    isGradingComplete: boolean;
  };
  questionEvaluations: IQuestionEvaluation[];
  integrityLog: IIntegrityEvent[];
  violationCount: number;
  shuffledQuestionOrder?: string[];
}

export interface IAuditLog {
  _id: any;
  schoolId?: any;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string | null;
  schoolSlug?: string | null;
}
