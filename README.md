# tmail

`tmail` is a disposable email web app built with Next.js App Router, TypeScript, shadcn/ui, Zustand, and Ky.

It is a public inbox tool for:
- browsing available domains
- adding custom domains
- generating disposable email addresses
- switching between multiple addresses
- reading inbox contents and full email bodies

## Stack

- Next.js 16 App Router
- TypeScript
- shadcn/ui
- Tailwind CSS v4
- Zustand
- Ky
- pnpm

## Routes

- `/` redirects to `/inbox`
- `/inbox` empty state
- `/inbox/[addressId]` inbox list for one address
- `/inbox/[addressId]/[mailId]` email detail view
- `/signin` login page
- `/signup` registration page

## Features

- Left sidebar for inbox folders and account actions
- Right sidebar for domains and active addresses
- Desktop sidebar shell from `sidebar-09`
- Mobile drawers for both sidebars
- Domain add flow with MX setup instructions
- One active address per domain in the session
- Countdown timer for address TTL
- Preference and notifications surfaces from the account menu

## Project Structure

- `app/` route handlers and layouts
- `components/` UI and feature components
- `components/ui/` shadcn/ui building blocks
- `services/` data access layer
- `stores/` Zustand stores
- `mock/` local mock data
- `types/` shared TypeScript types
- `hooks/` reusable hooks

## Database Schema

The app uses MongoDB through Mongoose. User accounts, custom domains, active
addresses, mailbox UI state, admin settings, rate limits, and vouchers are stored
locally. Email message bodies are fetched from the external email backend and are
not persisted in this MongoDB schema.

```mermaid
erDiagram
  USER ||--o{ ADDRESS : owns
  USER ||--o{ DOMAIN : owns_custom_domains
  USER ||--o| MAILBOX_STATE : has
  USER ||--o{ VOUCHER_REDEMPTION : redeems

  DOMAIN ||--o{ ADDRESS : provides
  DOMAIN ||--o{ VOUCHER_REDEMPTION : made_private_by

  VOUCHER ||--o{ VOUCHER_REDEMPTION : records

  USER {
    ObjectId _id PK
    string email UK
    string password
    string name
    boolean isBanned
    string banReason
    boolean isPremium
    date premiumUntil
    number premiumPrivateDomainLimit
    string apiKeyHash
    string apiKeyEncrypted
    string apiKeyIv
    string apiKeyAuthTag
    string apiKeyPrefix
    date apiKeyCreatedAt
    boolean apiKeyAllowAllIps
    string[] apiKeyAllowedIps
    string[] apiKeyBlockedIps
    date createdAt
    date updatedAt
  }

  DOMAIN {
    ObjectId _id PK
    string name
    string type "system | custom"
    string source "system | user | guest"
    boolean isVerified
    string visibility "public | private"
    date privateUntil
    boolean isBanned
    string banReason
    ObjectId userId FK
    date createdAt
    date updatedAt
  }

  ADDRESS {
    ObjectId _id PK
    string address UK
    ObjectId domainId FK
    ObjectId userId FK
    date expiresAt
    date createdAt
    date updatedAt
  }

  MAILBOX_STATE {
    ObjectId _id PK
    ObjectId userId FK_UK
    string[] readIds
    string[] trashedIds
    string[] permanentlyDeletedIds
    string[] spamSenders
    date createdAt
    date updatedAt
  }

  VOUCHER {
    ObjectId _id PK
    string code UK
    number durationDays
    number privateDomainLimit
    number maxUses
    number usedCount
    date expiresAt
    boolean isActive
    string note
    date createdAt
    date updatedAt
  }

  VOUCHER_REDEMPTION {
    ObjectId userId FK
    ObjectId domainId FK
    date redeemedAt
    date privateUntil
  }

  ADMIN_SETTINGS {
    ObjectId _id PK
    string key UK
    number maxAddressesPerUser
    number addressTtlHours
    boolean allowGuestAddresses
    boolean allowWildcardSubdomains
    number inboxRefreshSeconds
    date createdAt
    date updatedAt
  }

  RATE_LIMIT {
    ObjectId _id PK
    string key UK
    number count
    date expiresAt TTL
    date createdAt
    date updatedAt
  }
```

### Relationship Notes

- `User -> Address`: one user can have many generated addresses. Each address
  belongs to exactly one domain and expires through `expiresAt`.
- `User -> Domain`: system domains use `userId = null`; custom user domains
  store the owner in `userId`.
- `Domain -> Address`: generated addresses reference the domain they use.
- `User -> MailboxState`: one persisted mailbox state per user stores read,
  trash, permanent delete, and spam sender state for messages from the external
  email backend.
- `User.isPremium` and `User.premiumUntil`: set when a valid voucher is
  redeemed. Premium is active only while `premiumUntil` is in the future.
- `User.premiumPrivateDomainLimit`: maximum number of owned domains that can be
  private at the same time. Current usage is computed from active private
  domains, so switching a domain back to public frees quota automatically.
- `User.apiKeyHash` and encrypted API key fields: generated only for active
  premium users. The hash supports future authentication, while the encrypted
  value lets the app show the key again in the account menu. API keys are
  encrypted with AES using `ADMIN_AUTH` as the server-side secret; the plaintext
  key is not stored in MongoDB.
- `User.apiKeyAllowAllIps`, `apiKeyAllowedIps`, and `apiKeyBlockedIps`: API key
  IP access policy for future API authentication.
- `Voucher -> redemptions[]`: voucher redemptions are embedded subdocuments
  that reference the redeeming user and the domain made private.
- `AdminSettings`: singleton-style settings document keyed by `key = "default"`.
- `RateLimit`: per-action request counters with MongoDB TTL cleanup on
  `expiresAt`.

## Setup

```bash
pnpm install
pnpm dev
```

If you want to verify the build:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Environment

Create `.env.local` when connecting a backend:

```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_EMAIL_API_URL=https://...
```

## shadcn/ui

The project uses shadcn/ui components directly in `components/ui/`.
To add more components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Notes

- All user-facing strings are in Indonesian unless the block explicitly needs English.
- The service layer is the only place that should switch from mock data to a real backend.
- The sidebar shell and drawers are intentionally split so desktop and mobile can behave differently without changing the inbox logic.
