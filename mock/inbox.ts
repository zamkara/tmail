import type { EmailDetail, EmailItem } from "@/types"

export const mockEmails: Record<string, EmailItem[]> = {
  addr_1: [
    {
      id: "mail_1",
      addressId: "addr_1",
      from: { name: "GitHub", email: "noreply@github.com" },
      subject: "Verify your email address",
      receivedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isRead: false,
      snippet:
        "Hey there! Please verify your email address by clicking the link below...",
    },
    {
      id: "mail_2",
      addressId: "addr_1",
      from: { name: "Notion", email: "marie@makenotion.com" },
      subject: "Welcome to Notion!",
      receivedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      isRead: true,
      snippet:
        "You're all set. Here's how to get started with your new workspace...",
    },
  ],
  addr_2: [],
}

export const mockEmailDetails: Record<string, EmailDetail> = {
  mail_1: {
    id: "mail_1",
    addressId: "addr_1",
    from: { name: "GitHub", email: "noreply@github.com" },
    subject: "Verify your email address",
    receivedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead: false,
    snippet:
      "Hey there! Please verify your email address by clicking the link below...",
    bodyHtml:
      '<p>Hey there!</p><p>Please verify your email address by clicking the link below:</p><p><a href="#">Verify email address</a></p>',
    bodyText:
      "Hey there!\n\nPlease verify your email address by clicking the link below:\n\nhttps://example.com/verify?token=abc123",
    headers: {
      "message-id": "<abc123@github.com>",
      "content-type": "text/html; charset=utf-8",
    },
  },
  mail_2: {
    id: "mail_2",
    addressId: "addr_1",
    from: { name: "Notion", email: "marie@makenotion.com" },
    subject: "Welcome to Notion!",
    receivedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    isRead: true,
    snippet:
      "You're all set. Here's how to get started with your new workspace...",
    bodyHtml:
      "<p>You're all set.</p><p>Here's how to get started with your new workspace.</p>",
    bodyText:
      "You're all set.\n\nHere's how to get started with your new workspace.",
    headers: {
      "message-id": "<xyz789@notion.so>",
      "content-type": "text/html; charset=utf-8",
    },
  },
}
