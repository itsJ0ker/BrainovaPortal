import mongoose, { Schema, Model } from "mongoose";
import { IAcademicYear, IClassGrade, ISubject } from "@/types";

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isCurrent: { type: Boolean, default: false },
    startDate: { type: String },
    endDate: { type: String },
  },
  { timestamps: true }
);

AcademicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

const ClassGradeSchema = new Schema<IClassGrade>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 1 },
    streams: { type: [String], default: ["General"] },
    sections: { type: [String], default: ["A"] },
  },
  { timestamps: true }
);

ClassGradeSchema.index({ schoolId: 1, name: 1 }, { unique: true });

const SubjectSchema = new Schema<ISubject>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

export const AcademicYear: any =
  mongoose.models.AcademicYear || mongoose.model("AcademicYear", AcademicYearSchema);

export const ClassGrade: any =
  mongoose.models.ClassGrade || mongoose.model("ClassGrade", ClassGradeSchema);

export const Subject: any =
  mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
