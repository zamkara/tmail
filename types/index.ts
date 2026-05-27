export type DomainType = "system" | "custom"
export type DomainSource = "system" | "user" | "guest"

export interface Domain {
  id: string
  name: string
  type: DomainType
  source: DomainSource
  addedAt: string
  isVerified: boolean
  visibility?: "public" | "private"
  privateUntil?: string | null
  isBanned?: boolean
  isOwnedByUser?: boolean
}

export interface GeneratedAddress {
  id: string
  address: string
  domainId: string
  domainName: string
  username: string | null
  createdAt: string
  expiresAt: string
}

export interface EmailSender {
  name: string | null
  email: string
}

export interface EmailItem {
  id: string
  addressId: string
  from: EmailSender
  subject: string
  receivedAt: string
  isRead: boolean
  snippet: string
  otp?: string | null
}

export interface EmailDetail extends EmailItem {
  bodyHtml: string | null
  bodyText: string
  headers: Record<string, string>
}
