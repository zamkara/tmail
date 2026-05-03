import { mockEmailDetails, mockEmails } from "@/mock/inbox"
import type { EmailDetail, EmailItem } from "@/types"

export async function getEmails(addressId: string): Promise<EmailItem[]> {
  return Promise.resolve(mockEmails[addressId] ?? [])
}

export async function getEmailDetail(
  addressId: string,
  mailId: string
): Promise<EmailDetail> {
  const detail = mockEmailDetails[mailId]

  if (!detail || detail.addressId !== addressId) {
    throw new Error("Email tidak ditemukan")
  }

  return Promise.resolve(detail)
}
