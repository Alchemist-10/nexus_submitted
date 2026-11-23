# Nexus portfolio deployment

Deployed 23 November 2026:

- App: <https://nexus-mentorship-akshay-vss-projects.vercel.app>
- Vercel project: `nexus-mentorship`, team `akshay-vss-projects`, Hobby plan, Node 22.
- Existing Supabase project: `amgwmeqophjaprqemqym`.
- Razorpay: test keys only; existing live-key guards remain in force.
- Email: preview only, stored in the private `notification-previews` bucket. No real notification emails are sent.

## Hosted jobs

Supabase Cron runs `nexus-hosted-workers` every minute. The cron command contains only a private function call. The function reads the endpoint/secret from Vault, signs a timestamp and UUID nonce, and sends an HTTP POST to `/api/internal/workers`. The server verifies the HMAC before accessing the nonce ledger or running jobs. Signatures expire after two minutes; a service-only database claim rejects replay atomically. The reusable secret never enters pg_net's request queue. Controlled operator calls can use its bearer-token path.

This distinction matters: hosted pg_net queues have extension-owned PUBLIC grants that `postgres` cannot revoke. They are not exposed through the standard Data API, but database roles can read them. Do not put reusable credentials or private email bodies into these queues. See [Supabase's permission explanation](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16).

Each invocation processes at most five notification jobs and one payment recovery job, in independent bounded batches with a 60-second function limit. Existing row leases recover incomplete attempts. A successful HTTP response means the batch executed; delivery/retry/review states remain authoritative in the job tables. The jobs do not need an open browser or local Node worker. Preview files use stable UUID paths and service-role uploads, so retries overwrite the same artifacts. There is no public preview bucket or unauthenticated worker endpoint.

Hosted-only scheduler SQL is in [hosted-workers.sql](../supabase/operations/hosted-workers.sql), separate from application migrations because pg_cron/pg_net are unavailable in disposable PGlite. Before running it in another environment, populate Vault values `nexus_worker_url` and `nexus_worker_token`, deploy the same 64-hex secret as `WORKER_RUN_SECRET`, and verify the target endpoint. Never commit those values. The preview bucket and nonce ledger are ordinary migrations, tested with the rest of the schema.

To pause/resume without deleting queued work, edit the named job in Supabase Cron or call `cron.alter_job` with its `active` argument. Inspect both `cron.job_run_details` and HTTP response status; an enqueued HTTP request alone does not prove the deployed worker succeeded. Retain only operational history needed for this demo and monitor database/storage growth.

## Production configuration

Production has the existing public Supabase URL/publishable key, private Supabase secret, three Razorpay test variables, and:

```dotenv
NEXT_PUBLIC_APP_URL=https://nexus-mentorship-akshay-vss-projects.vercel.app
HOSTED_WORKERS_ENABLED=true
WORKER_RUN_SECRET=<private 64-hex secret>
NOTIFICATION_TRANSPORT=preview
NOTIFICATION_PREVIEW_STORAGE=supabase
```

These values were configured as encrypted production environment variables, not passed as command-line arguments or included in source uploads. Public app URL changes require a rebuild. Local preview storage still defaults to filesystem; hosted code explicitly uses private Supabase Storage.

The owner confirmed the Supabase Site URL/production callback and Razorpay test webhook were updated to this domain. Localhost callback remains permitted for development. Actual signup email inbox delivery and a new end-to-end sandbox charge were not repeated during deployment acceptance; existing-account sign-in and server/payment-worker connectivity were verified. Supabase Auth SMTP is independent of notification previews.

## Deploy future changes

The current production deployment was uploaded through the authenticated Vercel CLI. The connected Vercel integration could read the account but could not create/access this new project, so its mapped CLI fallback was used. GitHub repository linking was also denied; authorizing Vercel's GitHub access to `Alchemist-10/nexus_submitted` is still needed for automatic deployments on push. The live site and hosted schedule do not depend on that Git connection.

Until connected, deploy from the Nexus checkout:

```powershell
npx vercel deploy --prod --yes --project nexus-mentorship --scope akshay-vss-projects
```

Use `.vercelignore` to exclude `.env*`, artifacts, tests, docs and root database fixtures. The `/supabase/` exclusion is root-anchored so `src/lib/supabase` remains included. Dry-run source checks verified secrets/credential manifests were excluded. Do not import local demo seeds into the hosted database or reapply existing migrations blindly.

## Verified

- Production build, type/lint/format checks and local suites passed; independent database races run in GitHub PostgreSQL CI.
- Public site/health returned 200; unauthenticated worker requests returned 401. Authorized batches returned aggregate counts only.
- A deployed signed invocation returned 200, replay returned 409, and a tampered signature returned 401.
- Supabase Cron delivered HTTP 200 responses without a local worker process. A sample free booking generated two confirmation previews, each with HTML/text, in private cloud storage. The sample booking was cancelled and its temporary slot closed; future reminders were suppressed.
- Service-role preview reads succeeded; public object access was denied. Preview session links use the production origin.
- Existing sample-account sign-in, private inbox and notification/session links worked in the deployed browser. Inbox axe checks found zero violations/incomplete findings and the browser reported no JavaScript errors. Invalid confirmation/callback links returned to the production sign-in page.
- Security advisors retain the intentional default-deny/private-RPC notices and the existing leaked-password-protection warning. Nonce claims and scheduler dispatch are inaccessible to ordinary accounts.

## Free-tier limits

No paid plan, trial upgrade or custom domain was purchased. Hobby is appropriate for this noncommercial portfolio demo, within its usage limits. [Vercel's free cron runs only daily](https://vercel.com/docs/cron-jobs/usage-and-pricing), so the minute trigger is Supabase Cron rather than Vercel Cron. Frequent function calls still consume Vercel quotas: roughly 43,200 calls in a 30-day month before other traffic.

[Supabase Free projects may pause after a week of inactivity](https://supabase.com/pricing). Check availability before interviews; the schedule does not establish an always-on guarantee or bypass provider pausing. Reminders have minute-level scheduling and may be delayed by provider downtime, cold starts or queued work. Monitor usage rather than claiming unlimited free capacity. Real email delivery requires separately configured provider credentials; it is not needed for the current preview demo.
