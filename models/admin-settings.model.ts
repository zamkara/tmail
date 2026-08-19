import mongoose, { type InferSchemaType } from "mongoose"

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    maxAddressesPerUser: { type: Number, required: true, default: 10 },
    addressTtlHours: { type: Number, required: true, default: 24 },
    allowGuestAddresses: { type: Boolean, required: true, default: true },
    allowWildcardSubdomains: { type: Boolean, required: true, default: true },
    enforceGlobalAddressUniqueness: {
      type: Boolean,
      required: true,
      default: true,
    },
    inboxRefreshSeconds: { type: Number, required: true, default: 30 },
    blockedSenderDomains: { type: [String], required: true, default: [] },
  },
  { timestamps: true }
)

export type AdminSettingsDoc = InferSchemaType<typeof adminSettingsSchema> & {
  _id: mongoose.Types.ObjectId
}

export const AdminSettings =
  mongoose.models.AdminSettings ??
  mongoose.model("AdminSettings", adminSettingsSchema)
