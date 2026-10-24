# Deployment guide

## Vercel production deployment

The Next.js App Router application is deployed as the Vercel project `ss-lotus`.

- Production URL: `https://ss-lotus.vercel.app`
- Build command: `npm run build`
- Framework: Next.js (auto-detected by Vercel)

The project requires these production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_S3_LIBRARY_BASE_URL`

The `NEXT_PUBLIC_*` values are intentionally browser-visible. Do not add database URLs, service-role keys, or other server secrets to Vercel variables with the `NEXT_PUBLIC_` prefix.

Local dotenv files are excluded from deployments by `.vercelignore`, except the credential-free `.env.example` template. Configure browser-visible values in Vercel. Backend Supabase and AWS credentials belong to the Supabase Function secret store; never depend on local dotenv configuration during a remote build.

Browser login remains client-side and does not use server-side session cookies. The PDF library's Supabase Function validates user tokens and admin_users membership before lifecycle mutations; see the [Function contract and local setup](library-function-contract.md). There are no Next API routes.

## GitHub Actions CI/CD

`.github/workflows/vercel-deployment.yml` validates every pull request and push
to `master` with frontend tests/build, Node release-script tests, and Deno
Function checks/tests after `npm ci`. A `master` push then applies pending
Supabase migrations before the Vercel production deployment. Both jobs use the
protected `production` environment, so its required reviewer is the approval
gate for a database-changing release. Take and verify the production database
backup before approving that job; the workflow records migration history and a
dry-run but cannot create or verify a backup on its own. The deployed Function
health fingerprint must still match the checkout before the frontend promotion.
`20261024090001_correct-pagoda-access.sql` also restores administrator-only
legacy RPC overloads for the original pagoda while the tenant-aware frontend is
promoted. It also converges the known partial state where the preceding pagoda
migration was recorded after only `pagodas` existed. Do not mark migrations
applied or reverted manually to recover a failed migration: preserve the failed
run log, take a backup, and use a reviewed forward migration. Do not remove the
legacy overloads until that older frontend is retired.
Configure at least one required reviewer on the `production` environment;
without it, pending migrations run automatically after each successful `master`
push.
Set the repository or production-environment variable `LIBRARY_FUNCTION_HEALTH_URL`
to `<supabase-url>/functions/v1/library-lifecycle/health`; missing/mismatched
Function readiness blocks frontend promotion. Deploy the approved Function
artifact first using the release steps below.
After a successful production deployment, the workflow creates one GitHub
Release tagged and titled `0.<workflow-run-number>.0`. The run number increases
for every workflow execution, so production deployments receive unique release
versions without changing `package.json`. Each release links the commit, Vercel
deployment, and workflow run. The deployment job needs
`contents: write` permission to publish the release.

Configure these repository or `production` environment secrets:

- `VERCEL_TOKEN`: a Vercel token with access to `ss-lotus`.
- `VERCEL_ORG_ID`: the organization ID from the linked `ss-lotus` project's
  `.vercel/project.json`.
- `VERCEL_PROJECT_ID`: the project ID from that same file.
- `SUPABASE_ACCESS_TOKEN`: a scoped Supabase token that can link the project
  and write database migrations.
- `SUPABASE_DB_PASSWORD`: the database password used only by the migration job.

Configure this `production` environment variable:

- `SUPABASE_PROJECT_REF`: the Supabase project reference targeted by the
  migration job.

The Vercel CLI reads the organization and project IDs from the workflow
environment, so `.vercel/project.json` remains local and is never committed.
This GitHub Actions workflow is the production deployment owner. Disable
Vercel's Git-based production deployment trigger to avoid duplicate
deployments for the same `master` commit. The `production` environment must
retain its required-reviewer protection because the workflow can apply database
migrations.

## Administrator provisioning

Signing in verifies the configured username and password, but it does not grant
administrator privileges on its own. Before an administrator uses the dashboard,
an authorized database operator must add that Supabase Auth user's UUID to
`public.admin_users`. Verify the intended Auth user and take the required backup
before changing production data; do not grant access to every authenticated user.

Only after explicit production approval and a successful Function release check,
the deployment owner may deploy the linked frontend:

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

Give the Supabase Function runtime those credentials through its protected secret store. Retain any credentials needed by the previous Vercel deployment until the rollback window ends. Configure separate, least-privilege S3 CORS rules for the exact approved origins—`http://localhost:3000` and `https://ss-lotus.vercel.app`—never a wildcard origin or credentials:

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

Set `NEXT_PUBLIC_S3_LIBRARY_BASE_URL` to the HTTPS public S3 base. Configure `AWS_REGION`, `S3_LIBRARY_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or existing `AWS_SECRET_ACCESS` alias), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `LIBRARY_ALLOWED_ORIGINS` for the Function only. The origin allowlist contains exact comma-separated browser origins; until configured, origin-bearing requests fail closed. Never use a NEXT_PUBLIC prefix for privileged credentials. The Function IAM identity requires GetObject, PutObject and DeleteObject on pending/* and documents/*, plus the restricted existence-check policy above. If using SSE-KMS, grant only the necessary encryption/decryption access. Verify on disposable non-production resources: public known-document read succeeds, anonymous staging/list/write/delete fail, and signed PUT replay returns 412 while staging still exists. After staging deletion, the same unexpired signed URL can recreate that key; do not describe this existing behavior as revocation or strict single-use.

## Library Function release

Use the pinned Deno tool through npm scripts. Run `npm run functions:check`,
`npm run functions:test`, `npm run test:scripts`, `npm test` and `npm run build`.
`npm run functions:prepare` generates immutable build identity from Function
source/config/dependencies. Use the installed Supabase CLI's live help for
local serving and deployment; this repository does not automatically deploy
Functions on PRs. Local gateway smoke tests need Docker and a Supabase stack.

After explicit release approval, provision Function secrets and deploy the
fingerprinted Function artifact first. Verify GET health against the expected
identity with `node scripts/verify-library-function-release.mjs --url <supabase-url>/functions/v1/library-lifecycle/health`.
Then promote the frontend through its gated workflow. Confirm no uploads have
started since the user's completed-upload report and refresh old browser tabs;
they still reference the retired API until reloaded. Keep the previous frontend
deployment and credentials available for rollback and retain the Function for
any new clients. Runtime import/unit checks do not establish actual hosted
gateway, 100 MB workload or IAM/KMS compatibility; record isolated smoke proof
before production.

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
