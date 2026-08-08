import mongoose, { type InferSchemaType } from "mongoose"

const adminApiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    whitelistIps: { type: [String], required: true, default: [] },
    blacklistIps: { type: [String], required: true, default: [] },
    lastUsedAt: { type: Date, default: null },
    lastUsedIp: { type: String, default: null },
    useCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

adminApiKeySchema.index({ name: 1 })

export type AdminApiKeyDoc = InferSchemaType<typeof adminApiKeySchema> & {
  _id: mongoose.Types.ObjectId
}

export const AdminApiKey =
  mongoose.models.AdminApiKey ??
  mongoose.model("AdminApiKey", adminApiKeySchema)
