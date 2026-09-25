# SS Lotus — Agent Guide

## Project context

SS Lotus is a Next.js App Router web application for managing Buddhist households, prayer registrations, and a deceased-person catalog. Supabase provides browser-side authentication and data access.

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase JavaScript client
- Vitest and Testing Library
- Vercel deployment

## Source layout

```text
src/
├── app/          # Route pages, layouts, and global CSS
├── components/   # Shared presentation components
├── features/     # Feature-owned UI, domain state, and repositories
├── lib/          # Framework/service integrations
└── test/         # Test setup
supabase/
└── migrations/   # Executable database migrations
```

## Commands

```bash
npm run dev
npm test
npm run build
```

## Conventions

- Keep `src/app` route files thin; place reusable business behavior in `src/features`.
- Components using hooks, browser APIs, drag/drop, Supabase browser auth, or `FileReader` require `'use client'` at their client boundary.
- Use `next/link` and `next/navigation`; do not add React Router.
- Public browser environment values use only `NEXT_PUBLIC_*` names. Never expose database URLs, service-role keys, or other server secrets.
- Preserve the current browser-only Supabase login unless a task explicitly adds server-side auth.
- Read a file before editing it. Run focused tests, then `npm test` and `npm run build` for shared contract changes.
- Before changing the database, create a backup and add an executable migration under `supabase/migrations/`.
