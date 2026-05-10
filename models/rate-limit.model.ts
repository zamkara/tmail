import mongoose, { type InferSchemaType } from "mongoose"

const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
)

export type RateLimitDoc = InferSchemaType<typeof rateLimitSchema> & {
  _id: mongoose.Types.ObjectId
}

export const RateLimit =
  mongoose.models.RateLimit ?? mongoose.model("RateLimit", rateLimitSchema)
