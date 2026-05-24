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
