import mongoose, { Schema, Model } from "mongoose";
import { IStudent } from "@/types";

const StudentSchema = new Schema<IStudent>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true, uppercase: true },
    admissionNumber: { type: String, required: true, trim: true, uppercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    classGrade: { type: String, required: true, trim: true, index: true },
    stream: { type: String, default: "General", trim: true },
    section: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    customFields: { type: Map, of: String, default: () => new Map() },
  },
  { timestamps: true }
);

StudentSchema.index({ schoolId: 1, rollNumber: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, email: 1 });
StudentSchema.index({ schoolId: 1, classGrade: 1, section: 1 });
StudentSchema.index({ name: "text", rollNumber: "text", admissionNumber: "text", email: "text" });

export const Student: any =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

export default Student;
