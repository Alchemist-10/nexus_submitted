# Paid mentorship bookings

Status: approved by the owner on 19 November 2026, including mentor-set prices, reservation expiry, verified capture, pre-start full refunds, and a later mentor-payout milestone. Razorpay test mode and INR are selected.

## Student and mentor experience

- Each learner gets one free introductory booking with each mentor. Preserve existing free bookings and the rule that cancellation before the start restores that introduction. A completed introduction permanently consumes it.
- A completed introduction unlocks paid follow-up bookings with that mentor. While the introduction is still upcoming, show its session link. Completing another mentor's introduction does not affect this pair.
- Mentors set an INR price per session in Mentor studio. Show the full session duration and total price before checkout. A mentor without a saved price cannot accept paid follow-ups yet. Price changes affect future checkouts; existing checkout and booking amounts are fixed.
- Student selects a slot, reviews mentor/time/duration/price, and chooses Pay and confirm. Use Razorpay Standard Checkout. The first free booking bypasses checkout completely.
- Reserve the slot and both participants' time for up to ten minutes during payment, never beyond the session start. Reject a new paid checkout within fifteen minutes of the start. Display the expiry, current payment state, and a way to resume an existing checkout.
- Successful server verification of captured payment confirms the session. Until confirmation, no meeting access, mentor meeting-link form, session completion, or rating is available. Keep the existing external meeting-link and completed-session rating flow for confirmed paid sessions.
- Closing checkout or a failed payment does not confirm a session. Retry within the reservation using the same checkout; expired reservations release their slot and participant schedules. A new request must obtain fresh availability.
- Either participant can cancel before the scheduled start, initiating a full refund of the recorded amount for paid sessions. Display Refund pending until the provider confirms success. Cancellation of a paid session never restores the consumed free introduction. Self-service cancellation after the start is unavailable in this version.
- If captured payment arrives after expiry, cancellation, or loss of the reservation, initiate a full refund and explain the outcome. Never attach the payment to a different slot or force a conflicting booking.
- Sessions display Free introduction or Paid, their recorded amount, and relevant payment/refund status. Mark the test checkout clearly. Use a sample INR 199 fee only for the two existing demo mentors, with no invented payments or ratings.

## Chosen approach and alternatives

Recommend mentor-set prices plus integrated Razorpay Checkout for this test milestone. A single platform-wide fee would reduce configuration but constrain mentor pricing. External payment links could demonstrate collection quickly but make reliable slot reservation and automatic confirmation harder. Automated mentor transfers add linked-account onboarding and should follow a separately designed payout milestone.

This version verifies student collection and refund workflows in Razorpay test mode. It does not enable live keys, create subscriptions, take a commission, claim to pay mentors, or collect mentors' bank details. Razorpay Route is the future integration point for marketplace transfers. Live collection requires a subsequent activation decision, mentor payout setup, and published operating policies.

## Database and concurrency

Keep the existing booking/participant model and extend it with booking kind, immutable integer-paise amount/currency, a payment reservation state and expiry, plus private checkout/payment/refund records. Existing bookings are free introductions with zero amount. Narrow the one-introduction-per-pair unique index to introductions; keep per-slot and cross-role participant overlap protection for active reservations and confirmed/completed bookings.

All booking decisions execute in database transactions with a consistent lock order, ownership checks, and unique constraints. First-call eligibility, completed-introduction checks, displayed amount, slot availability, and mentor price are validated on the server/database. An active paid reservation must prevent concurrent free or paid bookings and availability closure. Expiry releases participant reservations atomically. Expiry checks run before new booking attempts as well as through reconciliation, so correctness does not depend on a browser timer or a scheduled worker running on time.

Learner-scoped request keys make retries return the same checkout/booking and reject reuse for a different slot or source post. Provider order/payment IDs and processed webhook event IDs are unique. Multiple callbacks, duplicate events, out-of-order failed/success events, and simultaneous expiry/capture cannot create duplicate confirmations or reverse a final successful state. Price edits cannot change a pending checkout. Retain learning-request context for paid bookings as for introductions.

Refund intent is stored durably in the same transaction that cancels a paid booking or rejects a late payment. Provider refund submission and retries are tracked separately from booking cancellation. A timeout is an uncertain provider outcome, not proof of failure or permission to create a second charge/refund. Reconcile provider state before retrying an uncertain operation.

## Server boundaries

Use a small server-only Razorpay HTTP client, checkout orchestration functions, authenticated checkout/status/verification endpoints, and an unauthenticated signed webhook endpoint. Keep API credentials, webhook secret, and the Supabase server secret out of browser bundles, logs, commits, and NEXT_PUBLIC variables. Expose only the Razorpay key ID and required checkout data to its browser integration. Refuse non-test Razorpay keys in this milestone.

Derive the learner from verified auth; calculate the total from the stored mentor price. Verify the Checkout signature against the stored order ID, then fetch provider payment/order state and check captured status, order, amount, currency, and ownership before confirmation. Browser success alone cannot write a confirmed booking. Validate webhook signatures using the unmodified request body, then perform the same idempotent server-side transition. Preserve provider identifiers needed for audit and reconciliation without retaining card or bank details.

Authenticated clients can read only their permitted booking/payment summaries. They cannot write payment status or invoke privileged confirmation/refund-worker functions. Restrict privileged RPCs to the trusted server role. Public mentor prices may be readable; provider events, secrets, job claims, payment identifiers, and refund operations remain private. Enable RLS and explicit grants on exposed tables; use invoker views and pinned search paths where definer functions are required.

## Recovery and configuration

Persist retryable reconciliation/refund work with bounded attempts, leases and visible failure states. Supply a private worker command for local development and document scheduling it on deployment. Checkout status refresh can request reconciliation of that student's checkout. An external HTTPS endpoint is required for real provider webhook delivery; localhost tests use the provider's documented public tunnel approach. Do not open a public tunnel or deploy automatically as part of implementation.

Real Razorpay testing requires locally configured test key ID/secret and webhook secret; trusted payment writes require a Supabase server secret. Add empty documented entries to .env.example without overwriting existing .env.local configuration. The owner should enter secrets locally rather than send them in chat. Without credentials, validate against deterministic provider fixtures and report real gateway testing as outstanding.

## Validation and rollout

1. Apply a local migration to disposable test databases; preserve and exercise all existing free booking tests. Cover pair eligibility, paid repeats, price snapshots, access denial, request retries, active/expired reservations, conflicts across both participant roles, and slot closure.
2. Test genuine/invalid signatures, tampered order/amount/currency, authorization without capture, duplicate/out-of-order events, browser closure, uncertain requests, late capture, cancellation/refund retries, and recovery with a provider test double.
3. Run independent PostgreSQL races for one slot and capture versus expiry/cancellation. Confirm one winning reservation/confirmation or a durable refund outcome, with no free entitlement reset by paid cancellation.
4. Verify the free and paid student journeys, mentor pricing, payment summaries, failure/resume states, meeting access, and rating in the browser at desktop/mobile sizes. Check accessibility and existing community/profile flows.
5. Review Supabase advisors; apply the verified migration to nexus-rebuild, refresh generated types, and inspect hosted access rules. Preserve real accounts and the five demo accounts. Use identified temporary fixtures for hosted checks and scoped cleanup.
6. With locally supplied credentials, run Razorpay test Checkout plus a real signed webhook delivery and test refund. Clearly distinguish provider tests from simulated tests in the verification record. Run repository checks, push to the existing GitHub main branch, and verify CI.

## Primary references

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps)
- [Webhook validation, duplicate delivery and ordering](https://razorpay.com/docs/webhooks/validate-test)
- [Refunds](https://razorpay.com/docs/payments/refunds)
- [Route and linked-account transfers](https://razorpay.com/docs/payments/route)
- [Supabase securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
