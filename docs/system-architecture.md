# System architecture

## Records and ownership

- `members` represents living household members and remains separate from the Hương linh catalog (`deceased_people`).
- A Hương linh can exist without a household or family. Its household/family references are an optional pair and can be linked, changed, or cleared later through the audited association RPC.
- The primary Hương linh catalog is `/huong-linh`. A linked Hương linh also appears under its family in `/households/[householdId]`.
- Cầu An is one current household-owned booking per lunar season. A booking snapshots every living member in the canonical household, while family addresses remain presentation context rather than registration boundaries. Replacing a slot creates a new immutable booking revision; it never mutates an earlier snapshot.
- Cầu siêu is a registration for one Hương linh and does not require a household, family, or representative living member.

## Registration and database boundary

Supabase Auth uses SDK-managed, browser-readable session cookies. The Next proxy refreshes them and verifies protected requests with `getClaims()`; Server Components then load a request-scoped, JSON-minimal dashboard bootstrap (verified user, memberships, selected pagoda and library-admin capability). They never trust server `getSession()`, serialize a token, or use a service role. Administrators still enter a username and password; the browser normalizes the username into `${username}@ss-lotus.local`. A legacy localStorage-only session requires one login after this rollout. The active-pagoda preference is a user-scoped cookie, validated against current membership before use; browser memory is seeded synchronously before tenant repositories run. Pending/network revalidation preserves the last confirmed workspace, while a confirmed authorization loss clears tenant capability and locks management actions. A pagoda is the tenant: platform admins in `admin_users` can access every pagoda, while all other users access only explicit `pagoda_memberships`, with equal pagoda-business privileges. The active-pagoda switcher is user-scoped and feature RPCs pass its `pagoda_id`; database relationships enforce same-pagoda parent/child records. The PDF library remains global, and its management remains platform-admin-only. Registrations, ceremony slots, and death dates retain canonical PostgreSQL `date` values in solar calendar form for comparison, capacity, and sorting. The application converts dates at the repository boundary. Household workspace mutations and Cầu An booking use tenant-aware security-definer RPCs with an optimistic workspace revision and idempotency key; browser roles receive no direct table-write access.

## Feature data boundaries

The [auth repository](../src/features/auth/auth-repository.ts) and
[library repository](../src/features/library/library-repository.ts) directly
implement feature behavior and provider translation. The only shared browser
provider is [the Supabase client](../src/data/network/supabase/browser-client.ts).
`src/data` has exactly `local` and `network` directories; local is reserved and
does not implement a cache, offline data, or custom session persistence.

`src/app` contains framework route/layout exports, metadata, stylesheet imports,
redirects and dynamic-parameter forwarding. Screen/layout composition and the
global stylesheet belong to features; common UI primitives remain in components.
`src/proxy.ts` is the only server auth boundary outside App Router glue; it owns cookie refresh and redirect header propagation. There is no Next API backend. Privileged library operations live in the
[library-lifecycle Function](../supabase/functions/library-lifecycle/index.ts),
whose service composes function-local Supabase and S3 implementations.
See the [Function contract and setup](library-function-contract.md).

## Calendar contract

All date entry and date display in the admin interface use the Vietnamese lunar calendar and the `Asia/Ho_Chi_Minh` date boundary. `src/features/calendar/lunar-date-domain.ts` owns full lunar/solar conversion, lunar-month/leap-month enumeration, strict round-trip validation, and ceremony-date serialization.

Hương linh death dates use a separate yearless `LunarDayMonth` contract: `day`, `month`, and `isLeap`. The database/RPC contract uses `death_lunar_day`, `death_lunar_month`, and `death_lunar_is_leap`; no death year or fabricated solar date is stored. `LunarDayMonthPicker` is used only for death dates and CSV imports use `dd/mm`, with optional `thang_nhuan` (`true`/`false`) to disambiguate leap months. Cầu An seasons are explicit per-pagoda metadata containing canonical solar dates for lunar 01/01 through 01/15. The server selects the nearest available season in `Asia/Ho_Chi_Minh`, returns three periods per day, and enforces 200 distinct household bookings per slot. There is no client-controlled year.

## Routes

- `/households`: Cầu An search and multi-family household creation.
- `/households/[householdId]`: canonical household workspace, family/member editing, linked Hương linh/Cầu siêu history, and a household-wide Cầu An booking dock.
- `/huong-linh`: active-pagoda search, create/import, association management, lunar date of death, and Cầu siêu history/actions.
- Legacy `/prayer-for-wellbeing`, `/memorial-prayer`, and `/memorial-prayer/deceased-persons` routes redirect into household or Hương linh context.
- `/thu-vien` and `/thu-vien/[documentId]`: public PDF catalog, search, preview, download, and stable share links. The catalog exposes only published metadata through public RPCs; category navigation may enter the catalog with a `?category=<categoryId>` query.
- `/admin/thu-vien`: admin-only category and document management. The Function verifies bearer tokens and the `admin_users` table before invoking service-role-only lifecycle RPCs.

## PDF library storage boundary

PDF bytes live in S3 (`ap-southeast-1`). Public immutable objects use `documents/{uuid}.pdf`; private one-shot uploads use `pending/{uuid}.pdf`. The browser receives only a 15-minute signed, create-only `PUT` URL and uses XHR for progress. It has no AWS credentials, storage-management capability, TUS client, or persisted resume data. PDFs are capped at 100 MB and a failed upload is settled server-side before a new attempt begins.

The library-lifecycle Supabase Function validates a user bearer token and admin_users membership before any lifecycle mutation, then calls S3 and service-role-only RPCs. Completion holds a database lease while it verifies size, content type and PDF signature, copies to the public key, verifies the copy, removes staging and publishes metadata. Cancellation, cleanup, deletion and reconciliation retain their existing state transitions. The existing database maintenance lock remains enforced. Public signed-download lookup checks published metadata and returns a short-lived attachment URL as JSON; the browser navigates directly to S3. No PDF bytes pass through Next or the Function.

The mixed public/admin Function admits requests through the gateway with verify_jwt disabled, then applies centralized user verification and admin membership to every mutation. Public download lookup and a read-only health probe are the only unauthenticated operations. Bodies are bounded to 16 KiB before parsing; CORS uses explicitly configured origins. Create-only signed PUT is not revocation: after staging deletion, the URL may be reused until expiry. This existing limitation is characterized; replay hardening is separate work.

The public detail route uses a client-only PDF.js viewer and fetches `documents/{uuid}.pdf` directly from S3. Its CORS contract permits only the approved app origins to issue `GET`/`HEAD` range reads and expose the range response headers; no Next.js route proxies PDF bytes. PDF.js uses a pinned, version-matched worker, disables eval support and annotation actions, and renders visible pages rather than all document canvases. Embedded outline entries are restricted to in-document destinations; a document without an outline exposes lazy page thumbnails instead.
