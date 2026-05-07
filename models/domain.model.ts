import mongoose, { type InferSchemaType } from "mongoose"

const domainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ["system", "custom"], required: true },
    isVerified: { type: Boolean, default: false },
    // null = domain sistem (milik semua user), ada userId = domain custom milik user
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
)

domainSchema.index({ name: 1, userId: 1 }, { unique: true })

export type DomainDoc = InferSchemaType<typeof domainSchema> & { _id: mongoose.Types.ObjectId }

export const Domain = mongoose.models.Domain ?? mongoose.model("Domain", domainSchema)
