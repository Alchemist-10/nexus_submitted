# Nexus

A clean rebuild of the Nexus mentorship platform. The original project stays in `../Nexus_submitted/` as a reference. This first milestone includes the database, email authentication, mentor profiles, availability, and one free introductory booking per learner-mentor pair.

## What works in this milestone

- Email/password signup, email confirmation, sign-in, and sign-out using cookie-based Supabase SSR authentication.
- Public mentor discovery and self-service mentor profiles.
- Availability entered in the browser's local timezone and stored as `timestamptz`.
- Transactional booking, stable retry keys, one free call per pair, and database-enforced participant overlap protection across learner/mentor roles.
- Participant-only session dashboard and booking history.
- Cancellation before the start time releases both the slot and free introduction. Only the mentor can mark a call complete after its end time.
- Private meeting links, available only to confirmed participants within the join window.
- Executable migrations, local fixtures, SQL authorization tests, input validation tests, CI, and a production build.

Payments, community feeds, automated email reminders, Redis, and integrated video rooms are later milestones. This app does not charge users or distribute mentor payouts yet. It uses external HTTPS meeting links; it does not host video calls or prevent a participant from sharing an external meeting URL.

## Run the app

Use Node.js 22.12 or newer.

```powershell
cd D:\Projects_after_jun_2026\mainpro1\nexus
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Visit <http://localhost:3000>. Without environment values, the landing page and account forms render and link to `/setup`; live accounts and bookings require a new Supabase connection. No fake backend or authentication bypass is used.

The original database was deleted. Use a new project; old keys will not restore it. Never put a service-role/secret key in a `NEXT_PUBLIC_` variable.

## Option A: local Supabase

Docker Desktop must be running. From this directory:

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

`db reset` recreates the LOCAL database using the migration and seed. It is destructive to local development data. The seed contains two explicit demo accounts and is intended for local use only.

Put the local API URL and publishable key shown by the CLI in `.env.local`:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
```

If your CLI only displays an anon JWT key, that public anon key is also accepted as the publishable-key value. Use the public key, never the service-role key. Restart `npm run dev` after changing environment values.

Seed accounts:

| Role    | Email              | Password               |
| ------- | ------------------ | ---------------------- |
| Mentor  | mentor@nexus.test  | Nexus-local-demo-2026! |
| Learner | learner@nexus.test | Nexus-local-demo-2026! |

Slots are seeded two days ahead. Fresh signups receive confirmation mail in the local email viewer at <http://localhost:54324>. The local Studio opens at <http://localhost:54323>.

## Option B: a new hosted Supabase project

1. Create a new project using Supabase.
2. Apply `supabase/migrations/202611190001_foundation.sql` using the SQL editor, or link the project with the CLI and run `supabase db push`. Apply the migration once. Keep local demo seeds out of production.
3. Copy the project's API URL and publishable/anon key into `.env.local`.
4. In Auth URL Configuration, set Site URL to `http://localhost:3000` for development. Allow `http://localhost:3000/auth/callback`.
5. Enable email signup and email confirmation. Set a password minimum of at least 12 characters. Confirm your email before signing in.
6. The default PKCE confirmation flow is handled by `/auth/callback`. For cross-device confirmation, update the Confirm Signup email template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; the app handles that route too.
7. Configure a real email sender for a live project using Supabase's SMTP settings. The app does not silently skip email confirmation.

Set the actual HTTPS deployment URL in both Supabase and `NEXT_PUBLIC_APP_URL` before building for deployment. `NEXT_PUBLIC_` values are embedded at build time: changing them in a production environment requires a rebuild. Local and hosted environment configuration stays outside Git.

## Try the complete free booking flow

1. Sign in as a mentor and open **Mentor studio**.
2. Publish the mentor profile and add a future slot.
3. Sign in as a different account in another browser profile or private window.
4. Open the mentor profile and book the free introduction.
5. Check that both accounts see the session in **My sessions**.
6. The mentor adds an HTTPS video meeting link to that booking. It is not included in public mentor/slot data or general booking responses.
7. **Meeting access** becomes available 15 minutes before the call and closes 15 minutes after it ends. Both role and booking state are checked on the server/database.
8. Cancelling before the start time restores the introduction. A completed call consumes the free introduction with that mentor. Another mentor has a separate allowance.

A member can both mentor and learn. Public profile data includes name and username, not account email. This milestone has no elevated admin UI. No-show and paid cancellation policies will be designed with the payment milestone; a confirmed introduction continues to reserve the allowance until a supported transition occurs.

## Verify

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The default tests execute the real migration, constraints, RLS policies, and functions in PGlite PostgreSQL. Only the Supabase-managed auth schema/identity context is simulated in tests. Coverage includes unauthorized writes, row privacy, duplicate requests, repeat trials, cancellations, cross-role overlapping sessions, transaction rollback, join-window privacy, and validation.

PGlite has one backend, so the independent-connection race test is deliberately skipped there. It does not validate Supabase's actual email/Auth/PostgREST stack. CI also runs the suite on a disposable PostgreSQL 17 service to exercise independent connections. [The verified CI run](https://github.com/Alchemist-10/nexus_submitted/actions/runs/44459308194) passed all 29 tests on PostgreSQL 17, including the concurrent booking race, as well as type/lint/format checks and the production build. Hosted authentication and booking verification still require access to the selected Supabase project.

To run that mode yourself, first create a disposable localhost database named `nexus_test_local` and use an appropriately privileged test user:

```powershell
$env:DATABASE_TEST_URL = 'postgres://test_user:test_password@localhost:5432/nexus_test_local'
$env:ALLOW_DATABASE_TEST_RESET = '1'
npm test
Remove-Item Env:DATABASE_TEST_URL
Remove-Item Env:ALLOW_DATABASE_TEST_RESET
```

That mode DROPS and recreates application/auth schemas in the selected test database. The test helper rejects non-local hosts, databases without the `nexus_test` prefix, and runs without explicit reset opt-in. Never point it at a Supabase project or a database containing data you want to keep.

`/api/health` is a liveness endpoint. Its `databaseConfigured` field only indicates environment configuration, not a successful database connection.

## Structure

```text
src/app/                 Pages and auth callbacks
src/components/          Small reusable UI/form components
src/features/auth/       Authentication actions
src/features/bookings/   Booking actions and queries
src/features/mentorship/ Public mentor queries
src/lib/                 Validated inputs, session/env/database contracts
src/proxy.ts             Registered cookie-refresh proxy
supabase/migrations/     Reproducible database schema and functions
supabase/seed.sql        Local-only demo data
tests/                   SQL integration and validation tests
docs/phase-one-design.md Approved scope, defaults, and implementation plan
```

`src/lib/database.types.ts` is a schema-derived contract maintained with this migration, not output claimed to have been generated from a running remote database. After applying the schema, the Supabase CLI can generate full types using `npx supabase gen types typescript --local` (or `--project-id YOUR_ID`). Review the output and replace that file; no service-role credentials should appear in generated types.

The database is authoritative: narrow RPCs validate the authenticated identity and reserve/cancel/complete sessions. General table writes are revoked. Participant reservations use GiST exclusion constraints, so an account cannot be a learner in one overlapping booking and a mentor in another. Meeting data has no direct API read grant. Definer functions use an empty search path, explicit object names, restricted execute grants, and ownership checks.

## Next milestones

1. Optional paid offerings after the free introduction; verified server-side checkout, temporary slot holds, payment history, refunds, and reconciliation.
2. Durable notification outbox, Redis/BullMQ workers, reminders, and authorized realtime notifications.
3. Community features migrated one module at a time; search benchmarks, shared rate limits, monitoring, and campus pilot evidence.
