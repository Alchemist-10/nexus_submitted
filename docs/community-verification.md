# Community milestone — 19 November 2026

The owner approved the engineering-student community scope, with mentor discovery and video introductions as the main goal, and the burgundy theme. The previous mentorship foundation remains in place. After automatic review initially rejected the hosted change, the owner explicitly approved public posts, answers, and PNG/JPEG/WebP screenshots and the exact migration. The community migration was applied to `amgwmeqophjaprqemqym` as `20261119061237`; the local migration filename matches that history. Database types were generated from the running project. One local type refinement models nullable acceptance arguments, which PostgreSQL permits but introspection does not express.

## Automated verification

Eight new tests execute the actual community migration and policies in embedded PostgreSQL. They cover public reading versus anonymous mutation, author impersonation, self-vote denial and vote uniqueness/reversibility, author-only same-question answer acceptance, relevant/new mentor recommendations and reversible answer evidence, invalid image references, private reports/owner deletion, and context-preserving booking with retry-conflict rollback. Existing booking/validation tests continue to run. Storage tables in offline tests are scaffolding; actual Storage behavior was checked separately against the hosted service.

Eight real hosted API checks passed using three temporary preconfirmed `.test` accounts:

- Real authentication for all three actors.
- A public PNG is served, while SVG, anonymous upload, and another owner's upload path are rejected.
- A public post appears in the feed, while author impersonation is rejected.
- Recommended mentors match the post topics and expose genuinely available introductory slots.
- Answers and repeated upvote requests work; self-voting fails.
- Only the post author can accept an answer; recommendation evidence reflects actual answers and votes.
- A free booking retains its source post and remains invisible to outsiders; cancellation works.
- Reports remain private and another member cannot delete the uploaded image.

The reusable opt-in verifier is `scripts/verify-community-hosted.mjs`. Like the foundation hosted verifier, it requires an ignored manifest with exactly three preprovisioned temporary accounts (mentor/learner/outsider) and a matching project ref. It leaves fixture content for browser verification; the operator must remove that data and the temporary users afterward. It never resets a hosted schema or uses a service-role key.

## Browser verification

Two isolated browser profiles exercised the live forms against hosted Supabase: student login, composing and publishing a learning request with a PNG, displaying and loading that image, mentor answer submission and post upvote, learner answer upvote and acceptance, mentor recommendation, post-context preservation through the mentor page, and successful free booking. Both student and mentor dashboards displayed the source-post link. No browser errors were reported during that journey.

At 390 px, the feed, question detail, and composer had no horizontal overflow. Automated axe WCAG audits reported zero violations and zero incomplete checks on those three pages after fixing a low-contrast eyebrow label on the question page. These automated audits do not replace manual assistive-technology testing. The browser tool reported a one-off viewport-command EOF; reading the resulting viewport confirmed it applied, and diagnostics subsequently passed.

## Boundaries

Recommendation quality is not yet measured against a labelled relevance dataset. Expertise is self-declared and contribution evidence is public, not independent credential verification. Newly listed mentors can appear with relevant skills even before receiving votes. Meeting links still use the existing private external HTTPS video flow; this milestone does not implement a native video provider, payments, session star reviews, or semantic/learned ranking.

Reports require manual operator review in Supabase. Search matches titles; the detail page is bounded to 100 answers; global abuse controls and a moderation UI remain follow-up work before a broad public launch. Public image deletion removes the Storage object but does not guarantee immediate removal from caches or copies previously downloaded.

Security advisors were reviewed after migration. The existing default-deny booking tables and intentionally callable, checked booking RPCs remain flagged as described in `verification.md`. New acceptance and post-booking definer functions are authenticated-only and explicitly check the caller; recommendation/read views use invoker security. Relevant guidance: [authenticated definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Final local results and cleanup

TypeScript, zero-warning ESLint, formatting, and the production build passed. The embedded suite passed 36 tests, with one intentional independent-connection skip (the PostgreSQL CI mode executes that test). All temporary hosted users, posts, bookings, reports, and uploaded objects were removed; scoped cleanup queries confirmed zero remaining fixture users, posts, and images. Temporary browser profiles, auth-vault entries, and local password manifests were removed. The owner's real account was preserved.
