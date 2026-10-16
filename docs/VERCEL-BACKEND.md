# Express backend on Vercel

## Project settings

- Root Directory: `backend`
- Framework: **Express**
- Enable **Include source files outside of the Root Directory** (`shared/` is required).
- Install: `npm ci`; Build: `npm run build`; leave Output Directory unset.
- Node.js: **24.x** (also pinned in backend/package.json). Use Fluid compute.

`backend/index.ts` is a thin Express entry wrapper for `src/index.ts`. It prevents automatic detection from selecting `src/app.ts`, which exports a factory rather than an app instance. `src/index.ts` exports the Express application and does not listen when `VERCEL=1`. Local `npm run dev` and `npm start` still listen normally. Production TypeScript compilation includes the actual shared imports and excludes development scripts/tests. No migration, import or seed is part of build/start.

## Private Vercel environment variables

Configure these separately for Production and any Preview environment that will run the API. Do not upload backend/.env.

| Variable | Required value |
| --- | --- |
| `NODE_ENV` | `production`; Vercel's automatic `VERCEL=1` independently enforces production restrictions, including previews |
| `DATABASE_URL` | Supabase **transaction pooler** connection string (normally port 6543), URL-encoded password, verified TLS; obtain the exact URL from Supabase Connect |
| `CORS_ORIGINS` | Exact comma-separated **HTTPS frontend origins**, without trailing slashes/paths/wildcards; e.g. `https://your-web.example.com` |
| `SUPABASE_URL` | Existing project's URL, for server-side private Storage |
| `SUPABASE_SECRET_KEY` | Existing server-only secret; legacy `SUPABASE_SERVICE_ROLE_KEY` remains supported instead |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Existing server-only AI configuration if AI is enabled |
| `MAIDAAN_ENABLE_DEV_SEED` | `false` |
| `MAIDAAN_ENABLE_DIRECTORY_IMPORT` | `false` |

Use `sslmode=verify-full`, or omit SSL query options to use the enforced verified-TLS configuration. Production rejects weaker SSL modes, `ssl` overrides and libpq compatibility overrides. Supply the provider's trusted certificate through its supported certificate configuration if your pooler certificate requires one; never disable verification. Keep credentials out of public VITE_/EXPO_PUBLIC_ variables and logs. No database URL was changed or tested against a hosted server in this deployment pass.

The pool is initialized once per warm module instance, limited to three connections on Vercel, with a five-second idle timeout and Vercel `attachDatabasePool` suspension cleanup. Transactions retain their dedicated connection and release it in `finally`. Account identity remains transaction-local. Limits are per instance; the upstream transaction pooler is still necessary as instances scale.

## Sessions, admin and notifications

Web requests must keep `credentials: include` and the existing `X-Maidaan-Client: web` header. Vercel cookies use Secure, HttpOnly, SameSite=None and the existing `/v1` scope. Exact Origin/header CSRF checks remain enforced. Local cookies retain SameSite=Lax. Browser third-party-cookie blocking can still require frontend/API domains under the same site or a same-origin proxy; test the actual chosen domains.

Every deployed login and session authentication rejects `is_development_fixture` accounts, even if development flags/NODE_ENV are incorrectly set. The known temporary administrator is additionally denied by immutable account ID, username `maidaan_admin`, and email `maidaan.admin.demo@example.com`, including pre-existing web/native sessions. Its credentials and local membership have not been altered. Do not use it for public access.

For public administration, register a **new, non-fixture account with a fresh private password**, then grant only that approved identity using the trusted CLI from a local backend checkout:

```cmd
cd /d D:\maidaan-umer\Maidaan-V2\backend
set NODE_ENV=development
npm run admin:provision -- --email YOUR_APPROVED_EMAIL
npm run admin:provision -- --email YOUR_APPROVED_EMAIL --grant
```

The first command is a read-only eligibility check; the second grants membership and records an audit entry. Neither was run in this deployment pass. Provisioning, fixture seeding/cleanup and directory importing reject hosted Vercel execution regardless of development opt-ins. There is no public provisioning endpoint.

On Vercel, authenticated `GET /v1/notifications` advertises `transport: polling`. The updated web bell polls every 15 seconds, including unread counts, toasts and relevant state refresh, without opening EventSource. Native already polls. SSE explicitly returns 503/POLLING_REQUIRED on Vercel; local persistent SSE is retained. Deploy the updated web source to obtain transport negotiation; older clients still use their existing polling fallback after SSE fails.

## Verification and limitations

```cmd
cd /d D:\maidaan-umer\Maidaan-V2\backend
npm ci
npm run build
npm run typecheck
npm run lint
npm test
```

Lint uses the existing web ESLint installation, so install web dependencies before running lint in a fresh checkout. Backend production install/build does not require web dependencies. `npm test` includes the compiled-entry smoke test, so build first. Tests use isolated PGlite databases, not hosted DATABASE_URL.

- `GET /health`: public 200 liveness response. `configured` indicates configuration presence, **not successful database connectivity**.
- After deployment by the operator, verify health, a newly registered real account's login/session/refresh/logout, allowed/denied CORS origins and notification polling on the actual domains.
- Fixture and temporary-admin login must return 401; protected endpoints without a valid session must return 401. Normal server-side owner/admin checks remain in place.
- Existing rate limits are per function instance, not distributed abuse protection. This is FYP deployment readiness, not a claim of a load-tested commercial launch.
- No Vercel deployment, hosted writes, migrations, seed, cleanup or paid service was performed. Actual Vercel bundling/runtime, production-domain cookies and hosted TLS/connectivity still require operator smoke testing.

References: [Vercel Express entry detection](https://vercel.com/docs/frameworks/backend/express), [Fluid compute connection pools](https://vercel.com/kb/guide/efficiently-manage-database-connection-pools-with-fluid-compute).
