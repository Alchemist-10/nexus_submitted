# Paid bookings implementation plan

Approved design: [paid bookings](../specs/2026-11-19-paid-bookings-design.md). The writing-plans skill is unavailable in this installation; this file records the implementation and verification sequence directly.

1. Extend the booking schema with kind, amount, pending/expired states and hold expiry. Add participant-protected payment summaries, private provider records and durable refund/reconciliation jobs. Preserve free-introduction RPC compatibility and all existing records.
2. Implement transactional price editing, paid reservation, expiry, privileged order attachment/captured-payment confirmation, pre-start cancellation, event deduplication and leased worker RPCs. Exercise authorization, eligibility, retry, conflict, expiry and refund cases in PGlite and PostgreSQL CI.
3. Add a server-only test-key Razorpay client, signature validation, authenticated checkout orchestration, signed webhook handling and durable worker processing. Check provider data against the immutable stored booking quote. Exercise failure/uncertain/duplicate paths with deterministic fixtures.
4. Add mentor pricing, paid slot controls and checkout review/resume/expiry UI; update session cards and meeting copy. Display free versus paid and payment/refund states without exposing provider identifiers. Refresh pending sessions and preserve rating behavior.
5. Inspect the hosted schema, apply the tested migration, regenerate types and review advisors. Give the two identified demo mentors a labelled INR 199 test fee; preserve existing accounts/content/bookings. Verify hosted access controls and browser behavior with scoped test fixtures.
6. Run types, lint, formatting, tests and production build; push to the existing main branch and inspect CI. Test real Razorpay sandbox checkout/webhook/refund when local keys and a public webhook endpoint are configured; report any missing external setup precisely.

Secrets are configured only in ignored .env.local or deployment settings. No live keys, real charges, mentor transfers or automatic public tunnel are included in this milestone.
