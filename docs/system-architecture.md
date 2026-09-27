# System architecture

## Records and ownership

- `members` represents living household members and remains separate from the Hương linh catalog (`deceased_people`).
- A Hương linh can exist without a household or family. Its household/family references are an optional pair and can be linked, changed, or cleared later through the audited association RPC.
- The primary Hương linh catalog is `/huong-linh`. A linked Hương linh also appears under its family in `/households/[householdId]`.
- Cầu an is one household-owned registration containing the selected living members from any of that household's families. The family address remains presentation context, not a registration boundary.
- Cầu siêu is a registration for one Hương linh and does not require a household, family, or representative living member.

## Registration and database boundary

Browser-side Supabase authentication is preserved. Administrators enter a username and password; the client normalizes the username and submits the internal Supabase Auth email alias `${username}@ss-lotus.local` with that password. The dashboard route group checks the persisted Supabase session before mounting feature screens; absent or expired sessions redirect to `/login`, preventing RPCs from running as the `anon` role. Mutations use authenticated, admin-gated security-definer RPCs; ownership is validated from database relationships, and registration/association writes create audit events. Registrations, ceremony slots, and death dates retain canonical PostgreSQL `date` values in solar calendar form for comparison, capacity, and sorting. The application converts dates at the repository boundary.

## Calendar contract

All date entry and date display in the admin interface use the Vietnamese lunar calendar and the `Asia/Ho_Chi_Minh` date boundary. `src/features/calendar/lunar-date-domain.ts` owns full lunar/solar conversion, lunar-month/leap-month enumeration, strict round-trip validation, and ceremony-date serialization.

Hương linh death dates use a separate yearless `LunarDayMonth` contract: `day`, `month`, and `isLeap`. The database/RPC contract uses `death_lunar_day`, `death_lunar_month`, and `death_lunar_is_leap`; no death year or fabricated solar date is stored. `LunarDayMonthPicker` is used only for death dates and CSV imports use `dd/mm`, with optional `thang_nhuan` (`true`/`false`) to disambiguate leap months. `LunarDatePicker` remains the full-date UI for ceremony scheduling, which retains solar `YYYY-MM-DD` storage and requires a year for capacity and future-date checks.

## Routes

- `/households`: create a household draft or search existing households.
- `/households/[householdId]`: household-wide Cầu an, living members grouped by family/address, linked Hương linh, and their Cầu siêu actions/history.
- `/huong-linh`: global search, create/import, association management, lunar date of death, and Cầu siêu history/actions.
- Legacy `/prayer-for-wellbeing`, `/memorial-prayer`, and `/memorial-prayer/deceased-persons` routes redirect into household or Hương linh context.
- `/thu-vien` and `/thu-vien/[documentId]`: public PDF catalog, search, preview, download, and stable share links. The catalog exposes only published metadata through public RPCs.
- `/admin/thu-vien`: admin-only category and document management. Route handlers verify bearer tokens and the `admin_users` table before invoking service-role-only lifecycle RPCs.

## PDF library storage boundary

PDF bytes live in S3 (`ap-southeast-1`). Public immutable objects use `documents/{uuid}.pdf`; private one-shot uploads use `pending/{uuid}.pdf`. The browser receives only a 15-minute signed, create-only `PUT` URL and uses XHR for progress. It has no AWS credentials, storage-management capability, TUS client, or persisted resume data. PDFs are capped at 100 MB and a failed upload is settled server-side before a new attempt begins.

Admin library lifecycle Route Handlers validate a Supabase bearer token and `admin_users` membership, then call S3 and service-role-only lifecycle RPCs. Completion holds a database lease while it verifies size, content type, `%PDF-` bytes, copies to the public immutable key, verifies the copy, removes staging, then publishes metadata. Cancellation, expiry cleanup, deletion, and reconciliation are similarly S3-observed before their metadata transition. A maintenance lock starts enabled after the S3 migration and blocks every lifecycle mutation until an approved cutover opens writes. Anonymous users may read known `documents/*` URLs but cannot list, write, or delete; explicit downloads redirect to a short-lived signed S3 attachment URL without proxying bytes through Vercel.

The public detail route uses a client-only PDF.js viewer and fetches `documents/{uuid}.pdf` directly from S3. Its CORS contract permits only the approved app origins to issue `GET`/`HEAD` range reads and expose the range response headers; no Next.js route proxies PDF bytes. PDF.js uses a pinned, version-matched worker, disables eval support and annotation actions, and renders visible pages rather than all document canvases. Embedded outline entries are restricted to in-document destinations; a document without an outline exposes lazy page thumbnails instead.
