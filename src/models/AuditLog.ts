import mongoose, { Schema, Model } from "mongoose";
import { IAuditLog } from "@/types";

const AuditLogSchema = new Schema<IAuditLog>(
  {
    schoolId: { type: Schema.Types.ObjectId as any, ref: "School", index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ schoolId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: any =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
