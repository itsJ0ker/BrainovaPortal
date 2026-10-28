import mongoose, { Schema, Model } from "mongoose";
import { IExam, IQuestion, IQuestionOption } from "@/types";

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["single_choice", "multiple_choice", "true_false", "written"],
      required: true,
    },
    prompt: { type: String, required: true },
    options: { type: [QuestionOptionSchema], default: [] },
    correctAnswer: { type: Schema.Types.Mixed }, // Never exposed to client during active exam
    rubric: { type: String },
    points: { type: Number, required: true, default: 1 },
    negativePoints: { type: Number, default: 0 },
    explanation: { type: String },
  },
  { _id: false }
);

const AntiCheatingSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    maxViolations: { type: Number, default: 3 },
    actionOnThreshold: {
      type: String,
      enum: ["warn_only", "auto_submit", "flag"],
      default: "auto_submit",
    },
    blockCopyPaste: { type: Boolean, default: true },
    enforceFullscreen: { type: Boolean, default: false },
    detectTabSwitch: { type: Boolean, default: true },
    preventContextMenu: { type: Boolean, default: true },
  },
  { _id: false }
);

const ExamConfigSchema = new Schema(
  {
    durationMinutes: { type: Number, required: true, default: 45 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    attemptLimit: { type: Number, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    verificationMode: {
      type: String,
      enum: ["roll_or_admission", "roll_and_email", "access_code_only"],
      default: "roll_or_admission",
    },
    resultReleaseMode: {
      type: String,
      enum: ["immediate", "scheduled", "manual"],
      default: "manual",
    },
    resultReleaseDate: { type: String, default: null },
    antiCheating: { type: AntiCheatingSchema, default: () => ({}) },
  },
  { _id: false }
);

const ExamTargetingSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["all", "class_section", "assigned_class", "custom_list"],
      default: "assigned_class",
    },
    classes: { type: [String], default: [] },
    streams: { type: [String], default: [] },
    sections: { type: [String], default: [] },
    studentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  { _id: false }
);

const ExamSchema = new Schema<IExam>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    accessCode: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, required: true, trim: true },
    classGrade: { type: String, trim: true },
    targeting: { type: ExamTargetingSchema, default: () => ({}) },
    questions: { type: [QuestionSchema], default: [] },
    config: { type: ExamConfigSchema, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "archived"],
      default: "draft",
      index: true,
    },
    isResultsPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExamSchema.index({ schoolId: 1, accessCode: 1 }, { unique: true });
ExamSchema.index({ accessCode: 1 }); // For direct public test portal lookup
ExamSchema.index({ schoolId: 1, status: 1 });
ExamSchema.index({ schoolId: 1, createdAt: -1 });

export const Exam: any =
  mongoose.models.Exam || mongoose.model("Exam", ExamSchema);

export default Exam;
