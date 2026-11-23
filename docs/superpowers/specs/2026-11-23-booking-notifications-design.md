# Booking notifications and reminders

Approved in chat on 23 November 2026: email plus a private in-app inbox, confirmation/cancellation/meeting updates/completion, reminders 24 hours and 15 minutes before a call, and a missing-link alert to the mentor one hour before. Payments remain Razorpay test-only.

## Architecture and boundaries

An AFTER INSERT trigger on existing booking events creates inbox records and private delivery jobs in the booking transaction. Confirmation schedules future reminders; paid holds do not. There is no historical-event email backfill. A separate notification worker uses bounded batches, SKIP LOCKED leases, conditional acknowledgements, exponential backoff, and a terminal review state. No HTTP occurs in database transactions. Postgres is sufficient; Redis is not introduced.

The recipient-only inbox includes a header bell/unread count, paginated history, individual/all mark-as-read, and session links. Future reminders are hidden until due. Cancellation/completion suppress outstanding reminders. The worker rechecks booking state, expiry, and missing-link conditions immediately before dispatch. A cancellation racing an already-started external send cannot retract an email; session links always show current state.

## Timing and delivery

Only reminder times still in the future at confirmation are scheduled. Times are timestamptz/UTC; emails explicitly label UTC and the session page displays the viewer's local timezone. Twenty-four-hour reminders expire one hour before the call; fifteen-minute reminders and missing-link alerts expire at the start. Immediate confirmation expires at the start; meeting updates expire at the end; cancellation/completion email expires after seven days. Backlogged obsolete messages are suppressed, not burst-sent.

Notification keys identify booking event/recipient or booking/reminder/recipient. Each delivery snapshots the recipient email privately at enqueue time and has a stable payload and provider key. Maximum eight attempts and a 23-hour retry window from the first claim fit within Resend's documented 24-hour idempotency retention. Crashed final attempts and expired windows become review-required. At-least-once processing and bounded provider deduplication are explicit; exactly-once email and inbox delivery receipts are not claimed.

Default transport is preview: write one HTML/text artifact per job under ignored artifacts, never contact recipients, and record previewed separately from provider-accepted. Optional Resend uses server-only credentials and a mandatory exact-recipient allowlist. Invalid transport configuration fails closed before claiming jobs. Changing transport never replays finished preview jobs. Provider acceptance is not proof of inbox delivery. No provider SDK dependency is necessary.

## Security and operation

Enable RLS; revoke direct inbox writes and all ordinary-account job access. Inbox SELECT is recipient-scoped; narrow authenticated mark-read RPCs cannot reassign recipients or edit content. Only service_role can claim, inspect, prepare, and acknowledge delivery jobs. Explicit search paths, qualified names, and grants protect all definer functions. Emails contain a Nexus session-page link, never an external meeting URL, token, secret, or public email address.

The worker works independently of Razorpay keys, supports one batch or watch mode, and reads hosted environment variables without requiring an env file. A read-only status command exposes counts, not addresses or message bodies. A local fixture demo exercises the actual migration and worker with an accelerated disposable clock/fixture rather than a hosted time-control endpoint.

## Acceptance

SQL tests cover atomic rollback, recipient privacy, direct-write/RPC denial, stable retries, free/paid confirmation, cancellation/completion, scheduling boundaries, stale suppression, missing link, exclusive claims, expired leases, final-attempt crashes, backoff, and conditional acknowledgement. Transport tests cover safe preview, escaping, allowlists, timeout/error handling, provider idempotency, and stable retry payloads. Browser checks cover signed-out protection, empty/populated inbox, unread count, mark-read, pagination, session navigation, and narrow light/dark layouts. Existing tests/build and payment test-only guards must continue to pass.
