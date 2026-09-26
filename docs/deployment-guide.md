# Deployment guide

## Vercel production deployment

The Next.js App Router application on `chore/V2` is deployed as the separate Vercel project `ss-lotus-v2`.

- Production URL: `https://ss-lotus-v2.vercel.app`
- Build command: `npm run build`
- Framework: Next.js (auto-detected by Vercel)

The project requires these production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both variables are intentionally browser-visible. Do not add database URLs, service-role keys, or other server secrets to Vercel variables with the `NEXT_PUBLIC_` prefix.

The current migration intentionally preserves browser-only Supabase login. It does not add server-side session cookies or protected Next.js routes.

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

## Rollback

The previous production deployment before the Hương linh release is `ss-lotus-v2-b5pth1v93-hieules-projects-adae357f.vercel.app`. Promote it if the new application needs to be rolled back:

```bash
vercel promote ss-lotus-v2-b5pth1v93-hieules-projects-adae357f.vercel.app --scope hieules-projects-adae357f
```

The database migration preserves existing records while adding the prayer-profile
uniqueness needed for retry-safe registration creation. Application rollback does
not roll back the schema; leave it in place unless a reviewed forward-fix is
chosen. The pre-migration schema/data backup is recorded in the plan's Phase 1
evidence. Restoring it would overwrite live database state and must be a
deliberate recovery operation.
