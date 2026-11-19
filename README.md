# Nexus

A clean rebuild of the Nexus mentorship platform. The original project stays in `../Nexus_submitted/` as a reference. The app connects engineering students to mentors through learning requests, useful community explanations, and one free introductory booking per learner-mentor pair.

## What works

- Identifiable member profiles with personal Posts/Answers, public contribution counts, and owner-only editing.
- Distinct default illustrated avatars for every account, plus optional personal photo uploads.

- Community feed with latest/top/unanswered views, category/topic filters, title search, and pagination.
- Learning requests with context, the specific point of confusion, topic tags, and up to three public raster images.
- Answers, unique reversible upvotes, author-accepted answers, owner deletion, and private reports for manual review.
- Explainable mentor recommendations using topic overlap, actual answer evidence, and open introductory slots.
- Booking from a post preserves its context for both participants.
- Email/password signup, email confirmation, sign-in, and sign-out using cookie-based Supabase SSR authentication.
- Public mentor discovery and self-service mentor profiles.
- Availability entered in the browser's local timezone and stored as `timestamptz`.
- Transactional booking, stable retry keys, one free call per pair, and database-enforced participant overlap protection across learner/mentor roles.
- Participant-only session dashboard and booking history.
- Razorpay test checkout for follow-ups after a completed free introduction, mentor-set INR prices, ten-minute reservations, server-verified capture, and tracked full refunds for pre-start cancellation.
- Cancellation before the start time releases both the slot and free introduction. Only the mentor can end a confirmed session after its scheduled start, including when the call finishes early.
- Private meeting links, available only to confirmed participants within the join window.
- One-time 1�5 star mentor ratings from the booked learner after the mentor ends a started session, with public averages and counts.
- Executable migrations, local fixtures, SQL authorization tests, input validation tests, CI, and a production build.

Payments run only in Razorpay test mode. Real gateway testing requires local test keys and a public HTTPS webhook endpoint; simulated provider tests are labelled separately. Live charges and mentor payouts are not enabled. Automated email reminders, Redis, and integrated video rooms are later milestones. The app uses external HTTPS meeting links; it does not host video calls or prevent a participant from sharing an external meeting URL.

## Test payments

Each learner gets one free introduction with each mentor. Complete that call first; then choose a follow-up slot and continue to payment. Mentors set a price per published session in Mentor studio. Aarav and Meera's demo follow-ups are INR 199. An ongoing checkout has a fixed price and reserves both participants' schedules for ten minutes. Payment must be verified as captured before meeting access is possible. See the [approved design](docs/superpowers/specs/2026-11-19-paid-bookings-design.md) and [verification record](docs/payments-verification.md).

Add these values to the existing ignored `.env.local`, keeping the current Supabase public configuration:

```dotenv
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_chosen_webhook_secret
SUPABASE_SECRET_KEY=your_server_only_supabase_secret
```

Use Razorpay **Test mode** API keys. Live key IDs are refused. The Supabase secret key comes from the same nexus-rebuild project, under Settings → API keys → Secret keys. Never put these secrets in chat, a commit, browser code or a NEXT_PUBLIC variable. Configure Razorpay automatic capture for the test integration; authorization alone leaves the booking unconfirmed.

Configure a publicly reachable HTTPS webhook endpoint ending in `/api/payments/razorpay/webhook`, with the same webhook secret. Subscribe to `payment.captured`, `payment.failed`, `order.paid`, `refund.processed` and `refund.failed`. Localhost cannot receive provider webhooks directly; use a staging deployment or an explicitly configured public development tunnel. No tunnel is opened automatically. Follow [Razorpay webhook testing](https://razorpay.com/docs/webhooks/validate-test).

Run the durable payment worker alongside local development:

```powershell
npm run payments:work -- --watch
```

Without `--watch`, it processes one batch and exits. Schedule repeated worker runs on deployment, with the same private environment. Browser verification gives immediate confirmation; webhooks and the worker recover missed callbacks and process refunds after a browser closes. Jobs use leases, bounded backoff and a visible review state when recovery is exhausted. The worker is required for unattended retry processing; refresh alone is not an operational substitute.

Cancel before the session starts to request a full refund. Cancellation immediately releases the slot; the payment summary remains Refund pending until provider verification reports success. Paid cancellation never restores the free introduction. Late capture after expiry also creates a tracked full refund. No subscriptions, commissions, bank-account collection, automatic mentor transfers or live-mode switch are included.

## Run the app

Use Node.js 22.12 or newer.

```powershell
cd D:\Projects_after_jun_2026\mainpro1\nexus
npm ci
# For a fresh checkout only: create .env.local if it does not exist
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
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

This workspace is connected to **nexus-rebuild** (`amgwmeqophjaprqemqym`) in **2026-after_nov**. The foundation and community migrations are applied, and the ignored `.env.local` contains its public client configuration. Do not reapply the migration or overwrite that file when restarting this checkout.

1. Create a new project using Supabase.
2. Apply the files in `supabase/migrations/` in timestamp order, or link the project with the CLI and run `supabase db push`. Each migration is applied once. The current hosted project already has the foundation and community migrations. Keep local demo seeds out of production.
3. Copy the project's API URL and publishable/anon key into `.env.local`.
4. In Auth URL Configuration, set Site URL to `http://localhost:3000` for development. Allow `http://localhost:3000/auth/callback`.
5. Enable email signup and email confirmation. Set a password minimum of at least 12 characters. Confirm your email before signing in.
6. The default PKCE confirmation flow is handled by `/auth/callback`. For cross-device confirmation, update the Confirm Signup email template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; the app handles that route too.
7. Configure a real email sender for a live project using Supabase's SMTP settings. The app does not silently skip email confirmation.

Set the actual HTTPS deployment URL in both Supabase and `NEXT_PUBLIC_APP_URL` before building for deployment. `NEXT_PUBLIC_` values are embedded at build time: changing them in a production environment requires a rebuild. Local and hosted environment configuration stays outside Git.

## Try the complete free booking flow

1. Sign in as a mentor and open **Mentor studio**. Use matching expertise such as `DSA`, `Python`, or `React` to appear on relevant learning requests.
2. Publish the mentor profile and add a future slot.
3. Sign in as a different account in another browser profile or private window.
4. Open the mentor profile and book the free introduction.
5. Check that both accounts see the session in **My sessions**.
6. The mentor adds an HTTPS video meeting link to that booking. It is not included in public mentor/slot data or general booking responses.
7. **Meeting access** becomes available 15 minutes before the call and closes 15 minutes after it ends. Both role and booking state are checked on the server/database.
8. Once the scheduled start has passed and the call is finished, the mentor chooses **End session**, then **End session & unlock rating** in My sessions or Meeting access. The learner can then submit a one-time 1�5 star rating in **My sessions**. Only the average and count are public; individual ratings are visible to the booking participants. Leaving Google Meet does not automatically complete the booking or verify attendance. Confirmed session screens refresh on return and every 15 seconds while visible. Every join click is checked on the server; completed sessions cannot launch the meeting through Nexus. Previously copied Google URLs remain controlled by Google.
9. Cancelling before the start time restores the introduction. A completed call consumes the free introduction with that mentor. Another mentor has a separate allowance.

A member can both mentor and learn. Public profile data includes name and username, not account email. This milestone has no elevated admin UI. No-show and paid cancellation policies will be designed with the payment milestone; a confirmed introduction continues to reserve the allowance until a supported transition occurs.

## Your profile

Click your picture/name in the header or open `/profile` to find your own Posts and Answers. Public author links lead to that person's activity; the Community feed remains shared. Profile settings, session shortcuts, and mentor setup shortcuts appear only to the owner. Public profiles contain no account email or booking history.

In **Edit profile**, change your display name, unique handle, and short bio. Every account starts with a stable illustrated avatar; **Try another avatar** changes the default. You can also upload a PNG/JPEG/WebP photo up to 3 MiB. Profile photos and bios are public. Selecting a default and saving removes the prior uploaded photo. See [profile verification](docs/profiles-verification.md) for checks and boundaries.

## Community and mentor matching

The homepage is the student learning-request feed. Publish at `/posts/new`, then find relevant mentors on each `/posts/[id]` page. The main action leads to a free introductory call; public explanations provide context and evidence of how a mentor teaches. Public answers do not automatically grant reputation just for posting.

Mentor matching requires overlap between request tags and normalized declared expertise or accepted-answer topic evidence. Matching topics dominate bounded contributions and availability signals. It includes new mentors with relevant expertise, excludes the question author and the viewing mentor themselves, and shows an honest empty state when no match exists. This is a deterministic baseline, not an AI model or a claim of verified credentials. Session star ratings are collected separately after completed bookings.

`post-images` is a public Storage bucket explicitly approved by the owner. Only authenticated owners can upload/delete within their UUID path. The form checks raster signatures and limits uploads to three PNG/JPEG/WebP files of at most 3 MiB each. Text and code render as escaped plain text. Images and public discussions should never contain credentials or private student information. Reports are visible only to their reporter and privileged database operators; review them in Supabase until the moderation dashboard is built.

The feed uses pages of 15; post detail currently loads up to 100 answers. Search currently matches titles. There is no automatic image understanding, spam detection, or semantic ranking. See [community verification](docs/community-verification.md) and [rating verification](docs/ratings-verification.md) for evidence and limits.

## Verify

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The default tests execute the real migration, constraints, RLS policies, and functions in PGlite PostgreSQL. Only the Supabase-managed auth schema/identity context is simulated in tests. Coverage includes unauthorized writes, row privacy, duplicate requests, repeat trials, cancellations, cross-role overlapping sessions, transaction rollback, join-window privacy, and validation.

PGlite has one backend, so the independent-connection race test is deliberately skipped there. It does not validate Supabase's actual email/Auth/PostgREST stack. CI also runs the suite on a disposable PostgreSQL 17 service to exercise independent connections. [The verified CI run](https://github.com/Alchemist-10/nexus_submitted/actions/runs/44459308194) passed all 29 tests on PostgreSQL 17, including the concurrent booking race, as well as type/lint/format checks and the production build. Hosted password authentication, booking authorization, concurrent reservation, and the two-account browser booking journey have also passed against the selected project. See [verification notes](docs/verification.md) for scope and remaining email-delivery verification.

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

`src/lib/database.generated.ts` was generated from the running hosted database after migration. `src/lib/database.types.ts` exports application aliases from that generated schema. Regenerate the former after future migrations using the Supabase integration or `npx supabase gen types typescript --project-id YOUR_ID`; review the output before committing.

The database is authoritative: narrow RPCs validate the authenticated identity and reserve/cancel/complete sessions. General table writes are revoked. Participant reservations use GiST exclusion constraints, so an account cannot be a learner in one overlapping booking and a mentor in another. Meeting data has no direct API read grant. Definer functions use an empty search path, explicit object names, restricted execute grants, and ownership checks.

## Next milestones

1. Optional paid offerings after the free introduction; verified server-side checkout, temporary slot holds, payment history, refunds, and reconciliation.
2. Durable notification outbox, Redis/BullMQ workers, reminders, and authorized realtime notifications.
3. Community notifications, shared rate limits, moderation tools, semantic mentor matching evaluated against the topic baseline, monitoring, and campus pilot evidence.
