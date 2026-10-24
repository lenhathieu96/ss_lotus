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
├── app/          # Next routing, metadata, redirects and parameter forwarding only
├── components/   # Shared presentation components
├── data/         # local/ and network/ client infrastructure only
├── features/     # Feature-owned UI and one feature logic/repository module
├── lib/          # Framework/service integrations
└── test/         # Test setup
supabase/
├── functions/    # Privileged library lifecycle and S3 operations
└── migrations/   # Executable database migrations
```

## Commands

```bash
npm run dev
npm test
npm run build
npm run functions:check
npm run functions:test
npm run test:scripts
```

## Conventions

- Use folder-specific source aliases: `@components/`, `@features/`, `@data/`, `@lib/`, `@hooks/`, and `@test/`, not `@/`. Keep TypeScript, Vitest and shadcn alias configuration aligned.
- Within a feature, keep `pages/` and `components/` folders, then consolidate non-UI behavior into one root module such as `household-repository.ts`. That module may contain types, validation, reducer helpers, browser I/O, and provider calls. `lunar-date-domain.ts` is the calendar exception because it has no provider integration. Import within a feature with the shortest relative path; use `@features/<other-feature>/...` only across feature boundaries. Do not recreate `domain/`, `repositories/`, or `services/` folders.
- Keep `src/app` limited to framework adapters; screen composition and styles belong to `src/features`. Feature repositories implement provider behavior directly; `src/data/network` holds only the shared browser client.
- Library mutations and signed-download lookup call the Supabase `library-lifecycle` Function. Do not add Next API routes or put privileged clients in frontend source.
- Components using hooks, browser APIs, drag/drop, Supabase browser auth, or `FileReader` require `'use client'` at their client boundary.
- Use `next/link` and `next/navigation`; do not add React Router.
- Public browser environment values use only `NEXT_PUBLIC_*` names. Never expose database URLs, service-role keys, or other server secrets.
- Preserve the current browser-only Supabase login unless a task explicitly adds server-side auth.
- Read a file before editing it. Run focused tests, then `npm test` and `npm run build` for shared contract changes.
- Before changing the database, create a backup and add an executable migration under `supabase/migrations/`.

## Production Deployment Safety

- Never deploy, promote, or release to production without the user's explicit authorization in the current conversation.
- A plan phase, implementation request, previous approval, or preview deployment does not authorize a production release. Stop before production and ask for explicit approval.
