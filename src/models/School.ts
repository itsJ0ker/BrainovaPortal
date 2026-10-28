import mongoose, { Schema, Model } from "mongoose";
import { ISchool } from "@/types";

const SchoolSettingsSchema = new Schema(
  {
    defaultExamDuration: { type: Number, default: 60 },
    allowSelfRegistration: { type: Boolean, default: false },
    enableAntiCheatingByDefault: { type: Boolean, default: true },
    themeColor: { type: String, default: "#4f46e5" },
  },
  { _id: false }
);

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ["active", "suspended", "archived", "invited"],
      default: "active",
      index: true,
    },
    logo: { type: String },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    adminClerkId: { type: String, index: true },
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    adminName: { type: String, trim: true, default: "School Administrator" },
    adminPassword: { type: String }, // Hashed bcrypt password
    settings: { type: SchoolSettingsSchema, default: () => ({}) },
    onboardingStatus: {
      type: String,
      enum: ["invited", "pending_profile", "completed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  }
);

SchoolSchema.index({ name: "text", slug: "text", code: "text" });

if (process.env.NODE_ENV !== "production" && mongoose.models.School) {
  delete (mongoose.models as any).School;
}

export const School: any =
  mongoose.models.School || mongoose.model("School", SchoolSchema);

export async function findSchoolByIdOrSlug(idOrSlug: string, lean = false) {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24;
  const query = isObjectId
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
    : { slug: idOrSlug };
  return lean ? School.findOne(query).lean() : School.findOne(query);
}

export default School;
