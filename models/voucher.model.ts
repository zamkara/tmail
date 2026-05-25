import mongoose, { type InferSchemaType } from "mongoose"

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    durationDays: { type: Number, required: true, default: 30 },
    privateDomainLimit: { type: Number, required: true, default: 1 },
    maxUses: { type: Number, required: true, default: 1 },
    usedCount: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, required: true, default: true },
    note: { type: String, default: "" },
    redemptions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        domainId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Domain",
          default: null,
        },
        redeemedAt: { type: Date, required: true, default: Date.now },
        privateUntil: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
)

export type VoucherDoc = InferSchemaType<typeof voucherSchema> & {
  _id: mongoose.Types.ObjectId
}

export const Voucher =
  mongoose.models.Voucher ?? mongoose.model("Voucher", voucherSchema)
