import mongoose, { type InferSchemaType } from "mongoose"

const loginEventSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { _id: false }
)

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
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    lastLoginUserAgent: { type: String, default: null },
    loginEvents: { type: [loginEventSchema], default: [] },
  },
  { timestamps: true }
)

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId
}

export const User = mongoose.models.User ?? mongoose.model("User", userSchema)
