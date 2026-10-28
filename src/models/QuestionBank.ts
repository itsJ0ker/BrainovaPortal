import mongoose, { Schema, Model } from "mongoose";
import { IQuestion } from "@/types";

export interface IQuestionBank {
  _id: string;
  schoolId: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  classGrade?: string;
  questions: IQuestion[];
  createdAt: string;
  updatedAt: string;
}

const QuestionBankSchema = new Schema<IQuestionBank>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    questions: { type: Array as any, default: [] },
  },
  { timestamps: true }
);

QuestionBankSchema.index({ schoolId: 1, subject: 1 });

export const QuestionBank: any =
  mongoose.models.QuestionBank || mongoose.model("QuestionBank", QuestionBankSchema);

export default QuestionBank;
