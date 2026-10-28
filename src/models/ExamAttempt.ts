import mongoose, { Schema, Model } from "mongoose";
import { IExamAttempt, IStudentResponse, IQuestionEvaluation, IIntegrityEvent } from "@/types";

const StudentResponseSchema = new Schema<IStudentResponse>(
  {
    questionId: { type: String, required: true },
    selectedOptions: { type: [String], default: [] },
    writtenAnswer: { type: String, default: "" },
    answeredAt: { type: String },
  },
  { _id: false }
);

const QuestionEvaluationSchema = new Schema<IQuestionEvaluation>(
  {
    questionId: { type: String, required: true },
    marksAwarded: { type: Number, required: true, default: 0 },
    maxMarks: { type: Number, required: true, default: 0 },
    isAutoGraded: { type: Boolean, default: true },
    feedback: { type: String, default: "" },
    gradedBy: { type: String },
  },
  { _id: false }
);

const IntegrityEventSchema = new Schema<IIntegrityEvent>(
  {
    timestamp: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "tab_switch",
        "fullscreen_exit",
        "focus_loss",
        "copy_paste_attempt",
        "devtools_attempt",
        "right_click",
      ],
      required: true,
    },
    details: { type: String, default: "" },
  },
  { _id: false }
);

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    examId: { type: Schema.Types.ObjectId as any, ref: "Exam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId as any, ref: "Student", required: true, index: true },
    studentSnapshot: {
      name: { type: String, required: true },
      rollNumber: { type: String, required: true },
      admissionNumber: { type: String, required: true },
      email: { type: String, required: true },
      classGrade: { type: String, required: true },
      section: { type: String, required: true },
    },
    startedAt: { type: String, required: true },
    submittedAt: { type: String, default: null },
    serverDeadline: { type: String, required: true },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted", "timed_out", "flagged"],
      default: "in_progress",
      index: true,
    },
    responses: { type: [StudentResponseSchema], default: [] },
    scores: {
      totalMarks: { type: Number, default: 0 },
      maxMarks: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      mcqMarks: { type: Number, default: 0 },
      writtenMarks: { type: Number, default: 0 },
      isGradingComplete: { type: Boolean, default: false },
    },
    questionEvaluations: { type: [QuestionEvaluationSchema], default: [] },
    integrityLog: { type: [IntegrityEventSchema], default: [] },
    violationCount: { type: Number, default: 0 },
    shuffledQuestionOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

ExamAttemptSchema.index({ schoolId: 1, examId: 1, studentId: 1 });
ExamAttemptSchema.index({ examId: 1, status: 1 });
ExamAttemptSchema.index({ examId: 1, "scores.totalMarks": -1 });

export const ExamAttempt: any =
  mongoose.models.ExamAttempt || mongoose.model("ExamAttempt", ExamAttemptSchema);

export default ExamAttempt;
