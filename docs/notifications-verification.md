# Booking notifications and inbox

Implemented 23 November 2026. Payments remain Razorpay test-only; notification delivery does not depend on Razorpay configuration.

## Use it

Sign in and click the bell, or open `/notifications`. New confirmations and cancellations appear for both participants; meeting-link updates and completion/rating prompts go to the learner. Each entry opens a private `/bookings/[id]` detail page, including mentor meeting-link controls and learner rating controls when eligible. The inbox has 15 entries per page, individual/all mark-read actions, a header unread count, and a refresh control. While visible, the inbox refreshes every 30 seconds and on window focus. Other pages refresh the header count on navigation; no WebSocket delivery is claimed.

Booking confirmation schedules reminders 24 hours and 15 minutes before the start for both participants, plus a one-hour missing-link check for the mentor. Only future reminder times are scheduled. Reminder inbox entries appear when the worker prepares them. Cancellations and completed sessions suppress outstanding reminders; a saved meeting link suppresses its missing-link check. New events only: applying the migration does not backfill historical booking notifications.

## Run local previews

The existing `.env.local` needs the same project URL, publishable key, and server-only `SUPABASE_SECRET_KEY`. No additional email key is needed for previews. The default `NOTIFICATION_TRANSPORT=preview` writes HTML/text to the ignored `artifacts/notification-previews/` directory, never contacts an email provider, and records `previewed` rather than `accepted`.

From the Nexus directory:

```powershell
# One batch
npm run notifications:work
# Keep processing confirmations and reminders every 15 seconds
npm run notifications:watch
# Read-only counts, without recipients or message content
npm run notifications:status
# Accelerated demo in an isolated, disposable in-memory database
npm run notifications:demo
```

The accelerated demo creates a real local booking using the migrations, runs its actual queue/worker, and makes the local reminder jobs due immediately. It creates seven previews: two confirmations, four reminders, and one mentor missing-link alert. It never changes hosted session times or sends email. It refuses to run if `DATABASE_TEST_URL` is set.

The worker optionally reads `.env.local`; hosted deployments can supply process environment variables without a file. Run it on a persistent worker service or schedule repeated one-batch invocations. There is no publicly callable cron or test-clock endpoint. A stopped laptop/worker will delay reminders. Browser polling is not the scheduler. Preview artifacts on ephemeral hosting are not durable email storage.

## Optional controlled email testing

The Resend adapter is implemented, but no real notification email was sent during this verification. Set these server-only values locally when you want to test with addresses you control:

```dotenv
NOTIFICATION_TRANSPORT=resend
RESEND_API_KEY=your_private_key
NOTIFICATION_EMAIL_FROM=Nexus <notifications@your-verified-domain.example>
NOTIFICATION_EMAIL_ALLOWLIST=your-address@example.com,another-address@example.com
```

Use an eligible verified sender. The exact recipient allowlist is mandatory; blocked recipients become review-required rather than receiving email. Configuration is validated before any jobs are claimed. Already-finished preview jobs are not replayed after changing transport; create a new test booking/update. Supabase Auth SMTP is separate from this booking-email transport. Keep sender, origin, provider account and transport stable while retrying pending deliveries; changing them can invalidate provider idempotency and requires operational review.

The adapter uses [Resend's send-email API](https://resend.com/docs/api-reference/emails/send-email) with a deterministic job idempotency key. Resend documents a [24-hour key retention window](https://resend.com/docs/dashboard/emails/idempotency-keys); automatic retries are bounded to eight attempts and 23 hours from the first claim. Provider acceptance is recorded as `accepted`, not confirmed inbox delivery. Bounce tracking and a Resend delivery-webhook integration are outside this milestone.

## Reliability and privacy

Booking event → inbox/outbox transaction → leased worker → preview/provider → conditional acknowledgement.

- An event trigger enqueues inside the booking transaction, so failed bookings cannot leave notification jobs behind. Paid holds create no confirmation; server-verified capture does.
- Queue keys prevent duplicate jobs for repeated booking requests. Saving an unchanged meeting link is now a no-op.
- Workers use `FOR UPDATE SKIP LOCKED`, two-minute leases and bounded batches. Crashed jobs can be reclaimed; old lease tokens cannot acknowledge a new claim.
- Retry backoff starts at 30 seconds. Exhausted attempts, final-attempt crashes and expired retry windows enter `review`. Investigate these with a trusted operator; there is no unsafe public replay endpoint or admin dashboard.
- Recipients, counterpart names and session times are snapshotted. Email templates use explicit UTC and link to Nexus, never expose the private external meeting URL. Session pages display the viewer's timezone and current status.
- The 24-hour reminder expires one hour before the call. The 15-minute reminder and missing-link alert expire at the start. Obsolete backlog is suppressed, not burst-sent. Confirmation email expires at the start, meeting updates at the end, and cancellation/completion email after seven days. Historical immediate inbox updates remain readable.
- Delivery is at least once with bounded provider deduplication. A cancellation racing an already-started provider request cannot retract that email. Opening its session link shows the current state.
- Inbox rows are recipient-only under RLS. Ordinary accounts cannot insert, edit, delete or reassign notification content; narrow mark-read RPCs enforce ownership. Delivery addresses, leases, retry state and provider identifiers remain private. Worker RPCs are service-role-only and all definer functions have explicit search paths.

## Verification evidence

- New SQL tests cover atomic rollback, recipient isolation, denied direct writes and worker access, exact UTC offsets, future-only scheduling, deterministic pagination, mark-all behavior, fixed retry snapshots, free/paid confirmation, cancellation/completion, meeting-update deduplication, stale/expired job suppression, missing links, exclusive leases, backoff and final-attempt crash recovery. The independent-worker race runs on PostgreSQL in CI and is skipped in single-backend PGlite.
- Transport/worker tests execute the actual SQL migration and worker against disposable databases. They verify preview files, HTML escaping, no default outbound email, exact allowlists, stable retry request bodies/keys, sanitized provider failures, outage recovery, lost acknowledgements and cancellation suppression. Provider HTTP responses are mocked and are not evidence of real Resend delivery.
- The accelerated local demonstration generated all seven expected previews.
- Hosted acceptance used existing sample accounts Riya and Meera. The learner booked through the browser; the mentor used authenticated APIs for availability and the private meeting update. The inbox showed confirmation, one update for two identical meeting saves, accurate read/unread state and cancellation. The test booking was cancelled and its temporary slot closed. Final hosted job state was four previewed and six suppressed, with no pending test reminders. Existing bookings, profiles and payment records were preserved.
- Browser checks covered signed-out redirect, an empty mentor inbox, populated learner inbox, individual/all mark-read, exact session navigation, light/dark, and widths 1256/390/320. These inbox layouts had zero horizontal overflow and zero automated axe violations/incomplete findings. The browser reported no JavaScript errors. Native date-entry/auth-vault automation had coordinate issues; authenticated API calls were used for mentor setup rather than attributing those tool failures to the app.
- Hosted security checks confirmed service-only worker grants and recipient-only inbox access. Advisor notices for default-deny private tables and authenticated ownership-checking RPCs match this design. The existing leaked-password-protection warning is unchanged.

See the approved [design](superpowers/specs/2026-11-23-booking-notifications-design.md) and [implementation plan](superpowers/plans/2026-11-23-booking-notifications.md). The CLI-created migration file was aligned to the hosted applied version `20261123060351`; earlier payment migration version drift is unrelated and was not changed.
