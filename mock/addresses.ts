import type { GeneratedAddress } from "@/types"

const now = new Date()
const minus2h = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
const minus10h = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString()
const plus22h = new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString()
const plus14h = new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString()

export const mockAddresses: GeneratedAddress[] = [
  {
    id: "addr_1",
    address: "wx7k2m@tmail.io",
    domainId: "dom_sys_1",
    domainName: "tmail.io",
    username: null,
    createdAt: minus2h,
    expiresAt: plus22h,
  },
  {
    id: "addr_2",
    address: "p9xnqr@tmpbox.net",
    domainId: "dom_sys_2",
    domainName: "tmpbox.net",
    username: null,
    createdAt: minus10h,
    expiresAt: plus14h,
  },
]
