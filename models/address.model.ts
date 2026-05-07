import mongoose, { type InferSchemaType } from "mongoose"

const addressSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, unique: true, lowercase: true },
    domainId: { type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export type AddressDoc = InferSchemaType<typeof addressSchema> & { _id: mongoose.Types.ObjectId }

export const Address = mongoose.models.Address ?? mongoose.model("Address", addressSchema)
