import mongoose, { Schema, Model } from "mongoose";

export interface ISchoolAdminInvite {
  _id: string;
  schoolId: mongoose.Types.ObjectId;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

const SchoolAdminInviteSchema = new Schema<ISchoolAdminInvite>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const SchoolAdminInvite: any =
  mongoose.models.SchoolAdminInvite ||
  mongoose.model("SchoolAdminInvite", SchoolAdminInviteSchema);

export default SchoolAdminInvite;
