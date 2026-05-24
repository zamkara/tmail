import mongoose, { type InferSchemaType } from "mongoose"

const domainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ["system", "custom"], required: true },
    source: {
      type: String,
      enum: ["system", "user", "guest"],
      required: false,
      default: null,
    },
    isVerified: { type: Boolean, default: false },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    privateUntil: { type: Date, default: null },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    // null = domain sistem (milik semua user), ada userId = domain custom milik user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
)

domainSchema.index({ name: 1, userId: 1 }, { unique: true })

export type DomainDoc = InferSchemaType<typeof domainSchema> & {
  _id: mongoose.Types.ObjectId
}

export const Domain =
  mongoose.models.Domain ?? mongoose.model("Domain", domainSchema)
