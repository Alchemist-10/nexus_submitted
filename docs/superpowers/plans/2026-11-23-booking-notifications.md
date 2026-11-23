# Booking notifications implementation

The user approved the complete design in chat. The writing-plans skill is not installed; this plan records the execution sequence without adding an extra approval loop.

1. Create a CLI-named migration: recipient inbox, private jobs, event enqueue trigger, reminder scheduling, suppression, leased service-only worker RPCs, and mark-read RPC.
2. Verify database behavior in disposable PGlite and PostgreSQL CI tests, including authorization, races, and recovery.
3. Implement a focused renderer, preview/allowlisted Resend transport, worker orchestration, status command, and accelerated local demonstration.
4. Add typed server queries/actions, private paginated inbox, bell/count, refresh and responsive theme-aware styling.
5. Apply the approved additive migration to nexus-rebuild after local verification; regenerate types and check hosted grants/advisors. Do not send real email or backfill old events.
6. Run all checks and browser verification, document commands and evidence, and commit/push only scoped files. Preserve the unrelated launch-readiness review.
