import mongoose, { type InferSchemaType } from "mongoose"

const mailboxStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    readIds: [String],
    trashedIds: [String],
    permanentlyDeletedIds: [String],
    spamSenders: [String],
  },
  { timestamps: true }
)

export type MailboxStateDoc = InferSchemaType<typeof mailboxStateSchema> & {
  _id: mongoose.Types.ObjectId
}

export const MailboxState =
  mongoose.models.MailboxState ??
  mongoose.model("MailboxState", mailboxStateSchema)
