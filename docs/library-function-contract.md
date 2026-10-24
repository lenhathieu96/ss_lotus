# Library Function contract

The frontend uses public Supabase RPCs for catalog/category/document metadata.
Privileged PDF lifecycle work runs in `supabase/functions/library-lifecycle`.
PDF preview and upload/download bytes travel directly between browser and S3.
The former `/api/library/*` URLs are retired; share `/thu-vien/{documentId}`.

## Requests

POST `<supabase-url>/functions/v1/library-lifecycle` with application/json.
Use `supabase.functions.invoke('library-lifecycle', { body })` from the feature
repository. Admin calls send the user's current bearer token; a publishable
API key alone never authorizes a mutation. The Function verifies the token
through Supabase Auth and checks admin_users before provider side effects.
Actor identity is server-owned; sending actorId is rejected.

Recovery preserves an existing limitation: while a ticket is pending, any S3
access denial during completion is reported as `read_staging`, even if the
denied operation is final-object copying or staging deletion. Inspect the actual
IAM operation before changing permissions; cleaning-ticket recovery has more
specific capability messages. This migration does not broaden permissions.

| action | Additional fields | Result |
| --- | --- | --- |
| prepare-upload | categoryId, title, author, originalFilename, expectedSize | documentId, stagingPath, uploadUrl, expiresAt, expiresInSeconds |
| complete-upload | documentId | status: published |
| resolve-upload | documentId | status: published or pending |
| recover-upload | documentId | published, pending, reupload_required or needs_s3_access; optional message/capability |
| cancel-upload | documentId | status: cleaning |
| cleanup-uploads | none | cleaned count |
| delete-document | documentId | status: deleted |
| reconcile-document | documentId | status: published or deleted |
| get-download-url | documentId | url; anonymous published-document lookup |

Identifiers are UUIDs; titles/filenames/author are at most 500 characters.
expectedSize is an integer from 1 through 104857600 bytes. JSON request streams
are limited to 16 KiB, independently of Content-Length. PDF bodies must never
be sent to this endpoint. The signed PUT uses application/pdf and If-None-Match: *.

Errors have `{ error: string }`: 400 malformed/invalid action or payload,
401 missing/invalid session, 403 non-admin/unapproved browser origin,
404 unavailable download/unknown path, 405 unsupported method, 413 excessive
body, and a generic 500 for provider failures. Public invalid document IDs are
404. Signed capabilities are private/no-store and must not enter logs or shared links.

OPTIONS handles preflight without authentication. Approved origins receive
CORS on success and error; CORS does not replace identity verification.
`verify_jwt = false` admits the public operations through the gateway; all eight
mutation actions still use the centralized in-handler user/admin guard.

## Configuration and local checks

Frontend: the three public values in the root credential-free environment
template. Backend: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, AWS_REGION,
S3_LIBRARY_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (or the existing
AWS_SECRET_ACCESS alias), and LIBRARY_ALLOWED_ORIGINS. The origins value is a
comma-separated exact allowlist, typically http://localhost:3000 and the approved
production origin. Never put backend credentials in frontend variables or source.

Provision backend values in the Supabase Function secret store. For local CLI
use a private, ignored secret file passed through the CLI's discovered env-file
option. Use `supabase functions serve --help` for the installed CLI. Local gateway
execution requires the Supabase stack and Docker daemon. Schema prerequisites
are the existing S3 lifecycle/recovery migrations; no new migration is added.

```sh
npm ci
npm run test:scripts
npm run functions:check
npm run functions:test
npm test
npm run build
```

Deno 2.9.6 is pinned as a development tool. Function npm dependencies are pinned
in its deno.json and lockfile; frontend and Function tests run in separate runtimes.
The prepare step generates build-info.ts. Unit checks do not establish deployed
gateway, IAM/KMS, real S3 or 100 MB workload compatibility; verify those on an
approved disposable target before production.

## Release ordering

Generate the build identity with `npm run functions:prepare`, deploy the Function
from that artifact using the approved Supabase release procedure, then deploy
the frontend. GET `/functions/v1/library-lifecycle/health` is public and returns
only contractVersion and releaseId, without database/Auth/S3 access. The release
fingerprint covers deployable source, dependencies and this Function's config.

The production workflow requires the repository/environment variable
LIBRARY_FUNCTION_HEALTH_URL to name that endpoint. Before frontend promotion,
the read-only verification script compares the deployed identity with the current
checkout and fails closed on missing, unreachable or mismatched backend.

Uploads were reported complete when this refactor began. Recheck before an
approved production release; open tabs need a refresh after removing old API
routes. Retain the previous deployment and its credentials during the rollback
window. A frontend rollback does not undo SQL or S3 state; reconcile in-flight
tickets using existing lifecycle operations. Never restore the historical
Supabase Storage browser flow. Production deployment requires explicit approval.
