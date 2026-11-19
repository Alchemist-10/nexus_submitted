# Phase one: database, authentication, free introductory bookings

Implementation authorized by the user on 19 November 2026. This clean application lives in `nexus/`; the original `Nexus_submitted/` remains a reference.

## Scope and defaults

Use Next.js App Router, TypeScript, Supabase Auth, and PostgreSQL. Deliver email/password signup, confirmation and sign-in; public mentor discovery; mentor self-service profiles and availability; and authenticated introductory booking, cancellation, completion, and protected meeting access. Payments, community feeds, Redis, and automated reminders follow in later milestones.

One free introduction is allowed per learner-mentor pair. A confirmed booking reserves that allowance. Either participant can cancel before the session starts, releasing it. Completed calls remain consumed; after-start cancellation is rejected. The mentor can mark completion only after the end time. Attendance/no-show adjudication is deferred; a confirmed call continues to reserve the allowance until a supported transition occurs. Intro slots are 15-120 minutes; the form defaults to 30 minutes. All stored timestamps are timezone-aware; users enter availability in their device timezone.

## Authoritative data flow

Auth creates a public profile with no email exposure. A member can publish a mentor profile and create fixed availability slots. Booking accepts a slot ID and a request UUID, never a price or caller-supplied participant ID. A database RPC derives the learner from the authenticated identity, locks the slot, reserves the trial, and writes the booking and both participant reservations together. A unique pair index prevents repeated free calls; GiST exclusion constraints on participant reservations prevent overlap even when one person is learning in one booking and mentoring another. Cancellation releases both reservations in the same transaction. Duplicate request IDs return the existing result and reject reuse for a different slot.

RLS controls readable rows. Important writes go through narrow, authenticated RPCs with explicit ownership/state checks and restricted execution grants. Definer functions pin an empty search path. No browser receives a service-role key. Meeting URLs live outside public mentor/slot/booking records. Only the confirmed participants can retrieve a meeting URL, from 15 minutes before the session until 15 minutes after it ends. External meeting links can be shared; provider-enforced attendance is a later integration.

## Implementation plan

1. Create the isolated app, executable migrations, Supabase config, and example environment.
2. Implement database authorization, trial uniqueness, participant exclusion, idempotency, and transitions.
3. Execute the migration against PGlite PostgreSQL with test-only Supabase role/auth scaffolding. Cover permissions, rollback, duplicate requests, trials, overlap across roles, cancellation, completion, and meeting privacy.
4. Add cookie-based SSR auth and a registered Next.js proxy. Validate inputs and safe redirect targets. Use verified server identity for mutations.
5. Add mentor discovery, local-time slot creation, booking forms, participant dashboard, and protected meeting setup/access.
6. Enforce types, lint, tests, and production build in CI. Document local/hosted setup and verification limits.

## Verification limits

PGlite executes PostgreSQL SQL, functions, RLS, and constraints but uses one backend. It does not establish multi-connection race behavior or verify Supabase Auth/PostgREST/email delivery. The integration suite can also target a disposable PostgreSQL database through `DATABASE_TEST_URL`, using separate database connections to exercise concurrency. That mode bootstraps test auth roles/schema and must never point to a live Supabase project. A new Supabase project or Docker-backed local stack is needed for live sign-up and complete browser journeys.
