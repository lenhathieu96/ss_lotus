# Deployment guide

## Vercel production deployment

The Next.js App Router application on `chore/V2` is deployed as the Vercel project `ss-lotus`.

- Production URL: `https://ss-lotus.vercel.app`
- Build command: `npm run build`
- Framework: Next.js (auto-detected by Vercel)

The project requires these production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_S3_LIBRARY_BASE_URL`

The `NEXT_PUBLIC_*` values are intentionally browser-visible. Do not add database URLs, service-role keys, or other server secrets to Vercel variables with the `NEXT_PUBLIC_` prefix.

Local dotenv files are excluded from deployments by `.vercelignore`. Configure both browser-visible values and server-only credentials in the Vercel project settings; never depend on local dotenv configuration during a remote build.

Browser login remains client-side and does not use server-side session cookies. The PDF library's admin API Route Handlers separately validate bearer tokens and `admin_users` membership before invoking lifecycle operations; see the [system architecture](system-architecture.md).

## GitHub Actions CI/CD

`.github/workflows/vercel-deployment.yml` validates every pull request and push
to `master` with `npm ci`, `npm test`, and `npm run build`. A push to `master`
deploys the Vercel prebuilt artifact only after the validation job succeeds and
the GitHub `production` environment allows the job to start.

Before enabling this workflow, configure the repository's `production`
environment with the required deployment reviewers. Add these repository or
environment secrets:

- `VERCEL_TOKEN`: a Vercel token with access to `ss-lotus`.
- `VERCEL_ORG_ID`: the Vercel team ID for `hieules-projects-adae357f`.
- `VERCEL_PROJECT_ID`: the Vercel project ID for `ss-lotus`.

The Vercel CLI reads the organization and project IDs from the workflow
environment, so `.vercel/project.json` remains local and is never committed.
If the Vercel project has Git-based production deployments enabled, disable
that production trigger before enabling this workflow to prevent duplicate
deployments for the same `master` commit.

## Administrator provisioning

Signing in verifies the configured username and password, but it does not grant
administrator privileges on its own. Before an administrator uses the dashboard,
an authorized database operator must add that Supabase Auth user's UUID to
`public.admin_users`. Verify the intended Auth user and take the required backup
before changing production data; do not grant access to every authenticated user.

To deploy the linked project again:

```bash
vercel deploy --prod --yes --scope hieules-projects-adae357f
```

Apply `supabase/migrations/20260926155900_restore-admin-access-and-idempotent-prayer-registrations.sql`
to the target database after taking the required schema and data backup. It
restores the `public.admin_users` authorization gate and makes matching prayer
registration retries safe for the same profile and ceremony year. The migration
stops when duplicate wellbeing or memorial prayer profiles already exist; those
duplicates require manual consolidation before the migration is retried.

## Public PDF library setup

The PDF library adds public `/thu-vien` pages and admin `/admin/thu-vien` management. Its S3 cutover migration is `supabase/migrations/20260927140000_migrate_library_storage_lifecycle_to_s3.sql`, followed by `20260927150000_fix-s3-service-role-claim-compatibility.sql`, after the existing library migrations. They are forward-only; the cutover starts with a database maintenance lock enabled. Back up the target PostgreSQL metadata before applying them; never edit a migration already recorded remotely. Do not run a production migration or deploy without current explicit authorization.

Provision a Singapore (`ap-southeast-1`) S3 bucket before cutover. Keep Block Public Access in place except the narrow policy allowing anonymous `s3:GetObject` on `documents/*`. Do not allow public list, put, or delete. The runtime IAM identity needs `s3:GetObject` (including HEAD and copy source reads), `s3:PutObject` (including copy destinations), and `s3:DeleteObject` on the private staging and public document prefixes. It also needs this narrow bucket-level existence-check statement, so a missing key is distinguishable from a denied key without granting general or anonymous listing:

```json
{
  "Sid": "CheckLibraryObjectExistence",
  "Effect": "Allow",
  "Action": "s3:ListBucket",
  "Resource": "arn:aws:s3:::ss-lotus-pdf",
  "Condition": {
    "StringLikeIfExists": {
      "s3:prefix": ["pending/*", "documents/*"]
    }
  }
}
```

Give the Vercel runtime those credentials through its secure environment or an approved workload-identity provider. Configure separate, least-privilege CORS rules for the exact approved origins—`http://localhost:3000` and `https://ss-lotus.vercel.app`—never a wildcard origin or credentials:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://ss-lotus.vercel.app"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Length", "Content-Range", "ETag"],
    "MaxAgeSeconds": 300
  },
  {
    "AllowedOrigins": ["http://localhost:3000", "https://ss-lotus.vercel.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "If-None-Match"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 300
  }
]
```

The reader rule enables PDF.js direct S3 range requests; it must not authorize browser `DELETE` or write headers. CORS is bucket-wide and is not an authorization mechanism: public bucket policy remains limited to `documents/*`, while `pending/*` stays private. Export the existing bucket CORS JSON to the approved operational record and read the final JSON back before changing it. Production CORS changes still require current explicit authorization.

Set `NEXT_PUBLIC_S3_LIBRARY_BASE_URL` to the HTTPS public S3 base. Store `AWS_REGION`, `S3_LIBRARY_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS` and `SUPABASE_SERVICE_ROLE_KEY` only as secure server-side environment variables; never use a `NEXT_PUBLIC_` name for them. The runtime also accepts the AWS-standard `AWS_SECRET_ACCESS_KEY` and prefers it if both names are configured. The Vercel runtime identity requires `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on both `pending/*` and `documents/*`; direct browser uploads alone do not prove the runtime can verify or publish a PDF. If the bucket uses a customer-managed SSE-KMS key, grant the runtime identity the corresponding KMS decrypt/encrypt permissions as well. Test the policy in non-production: anonymous known-document GET succeeds; staging read/list/write/delete fail; an allowed-origin signed `PUT` succeeds once and its replay receives `412`.

Before the approved migration window, record read-only evidence that both Supabase Storage `library/documents/*` and all `library_documents` lifecycle rows are empty. Any source PDF or active/published/deleting metadata row requires a separate remediation plan. Take and record a PostgreSQL backup reference outside the repository. Apply the migration with the lock still enabled, deploy the S3-aware build and secure variables, verify legacy and new lifecycle paths are blocked, then perform non-production-style smoke checks. Only an approved operator may unset the maintenance lock and reopen writes. On failure, repair and reconcile forward; do not redeploy the old Supabase Storage browser flow or roll back the database migration.

S3 is the PDF-object authority. PostgreSQL backups do not restore PDF bytes, so retain an independently tested S3 backup/export and forward-repair procedure. Cleanup waits for ticket expiry plus a 15-minute grace period, removes both staging and any partial final key, then removes metadata. Record the empty-source preflight, backup reference, deployment ID, lock-gate result, smoke checks, and operator in the approved operational record; never commit credentials or signed URLs.

## Rollback

Application rollback changes the deployment only; it does not reverse database migrations. Select a known-good earlier deployment from the current `ss-lotus` project, then promote that exact deployment:

```bash
vercel ls ss-lotus --scope hieules-projects-adae357f
vercel promote <known-good-deployment-url> --scope hieules-projects-adae357f
```

The database migration preserves existing records while adding the prayer-profile
uniqueness needed for retry-safe registration creation. Application rollback does
not roll back the schema; leave it in place unless a reviewed forward-fix is
chosen. The pre-migration schema/data backup is recorded in the plan's Phase 1
evidence. Restoring it would overwrite live database state and must be a
deliberate recovery operation.
