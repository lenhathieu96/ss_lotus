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

To deploy the linked project again:

```bash
vercel deploy --prod --yes --scope hieules-projects-adae357f
```
