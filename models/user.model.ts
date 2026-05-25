import mongoose, { type InferSchemaType } from "mongoose"

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    isPremium: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    premiumPrivateDomainLimit: { type: Number, default: 0 },
    apiKeyHash: { type: String, default: null },
    apiKeyEncrypted: { type: String, default: null },
    apiKeyIv: { type: String, default: null },
    apiKeyAuthTag: { type: String, default: null },
    apiKeyPrefix: { type: String, default: null },
    apiKeyCreatedAt: { type: Date, default: null },
    apiKeyAllowAllIps: { type: Boolean, default: true },
    apiKeyAllowedIps: { type: [String], default: [] },
    apiKeyBlockedIps: { type: [String], default: [] },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
}

export const User = mongoose.models.User ?? mongoose.model("User", userSchema)
