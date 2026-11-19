# First milestone verification

## Completed locally

| Check                                     | Result                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TypeScript                                | Passed, errors enforced                                                                             |
| ESLint                                    | Passed, zero warnings                                                                               |
| Prettier                                  | Passed                                                                                              |
| Production build                          | Passed with hosted environment configuration and dynamic server-rendered routes                     |
| SQL and validation suite                  | 28 passed, 1 skipped                                                                                |
| Independent-connection PostgreSQL race    | Passed in GitHub Actions against PostgreSQL 17; local PGlite still skips this multi-connection test |
| Package dependency tree                   | Valid, no invalid peer dependencies                                                                 |
| Homepage automated WCAG A/AA audit        | Zero reported violations; some overlapping decorative elements require manual contrast review       |
| Mobile signup automated WCAG A/AA audit   | Zero reported violations, no incomplete checks                                                      |
| Mobile layout                             | No horizontal overflow at 390 px on the homepage and signup screen                                  |
| Browser errors                            | None reported on checked pages                                                                      |
| Signup without backend configuration      | Clear error displayed; no fake account was created                                                  |
| Protected dashboard without configuration | Redirects to setup                                                                                  |
| Original source folder                    | Git working tree unchanged                                                                          |

The SQL suite executes the actual migration, RLS policies, constraints, and RPCs in embedded PostgreSQL. It tests authenticated identity context through test-only Supabase auth scaffolding. The embedded suite alone does not exercise Supabase Auth email delivery or a hosted browser; hosted verification is recorded separately below.

## Hosted backend verification — 19 November 2026

The **2026afternov** connection accesses **nexus-rebuild** (`amgwmeqophjaprqemqym`) in **2026-after_nov**. The `primary` connection accesses the older organization. The foundation migration was applied to the previously empty public schema as version `20261119045345`; the local filename now matches that migration history. All seven application tables have RLS enabled. Database types were generated from this running project. Only the public API URL and publishable key are configured in ignored `.env.local`; the application has no service-role key.

Nine hosted API checks passed using three temporary, preconfirmed `.test` accounts:

- Auth settings reachable, with email confirmation still enabled.
- Invalid password rejected.
- Real password sign-in and verified identity for mentor, learner, and outsider.
- Mentor publication and availability creation.
- Anonymous availability readable; anonymous booking denied.
- Confirmed free booking, idempotent retry, second trial rejected, and occupied slot rejected.
- RLS hides other people's bookings and rejects direct mutation.
- Cancellation restores the allowance; meeting access is private, time-limited, and revoked after cancellation.
- Concurrent real HTTP requests for one slot produce exactly one successful reservation.

The browser journey also passed against the local Next.js server and hosted backend: both accounts signed in, the mentor edited their profile and published a slot, the learner discovered and booked the mentor, both accounts saw the booking, a second introduction was unavailable, cancellation restored bookable slots, and sign-out prevented dashboard access. No browser errors were reported. The automation tool's native datetime fill did not set the field; dispatching normal input/change events exercised the controlled form and its automatic 30-minute end time.

Temporary sessions, users, profiles, slots, bookings, and meetings were removed after verification. Test passwords and browser profiles are excluded from Git and removed locally. Email delivery, clicking a real signup confirmation email, and cross-device confirmation remain **unverified**: the fixture accounts were explicitly preconfirmed, and no mail was sent. A deployed application URL and production SMTP setup have not been validated.

`node --env-file=.env.local scripts/verify-hosted.mjs --fixtures <manifest>` is an explicit opt-in hosted API verifier. It requires an ignored manifest containing the target `projectRef` and three provisioned temporary users (`role`, `id`, `email`, `password`; roles mentor/learner/outsider; addresses under `example.test`). It creates test application data and signs out its sessions, but the operator must delete those fixture users and data afterward. It does not provision users, disable confirmation, accept a service-role key, or reset schemas. Do not use real accounts or run the destructive local database test mode against Supabase.

### Advisory review

Security advisories were reviewed after migration. The no-policy notices for `booking_meetings` and `booking_participants` match intentional default-deny RLS and revoked direct API grants. The executable definer-function notices match the narrow RPC interface: public availability is anonymous-readable; mutation RPCs require authentication, check identity/ownership, use an empty search path, and are covered by denial tests. These notices remain visible; they are not represented as cleared. See Supabase guidance for [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [authenticated definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Performance advisories identify missing covering foreign-key indexes on booking events and the composite booking-slot reference, plus currently unused indexes in this empty project. These are recorded for workload-driven review; constraint-supporting indexes were retained. No performance claim is made from these functional checks.

Final hosted-integration checks also passed: TypeScript, ESLint with zero warnings, formatting, the embedded suite (28 passed, 1 deliberate independent-connection skip), and the configured production build.

## GitHub integration

The clean rebuild was merged into `Alchemist-10/nexus_submitted/main` through [pull request 1](https://github.com/Alchemist-10/nexus_submitted/pull/1), merge commit `041e98e284a50be1390cd0b7e371da8c929f2db1`. The old main is preserved at `legacy/pre-rebuild-2026-11-19` and remains in the merged commit history.

The first native PostgreSQL run exposed timestamp rounding in the adjacency test fixture: JavaScript Date parsing dropped PostgreSQL microseconds. The corrected fixture reads the exact endpoint as text; the database overlap constraint was retained. [The successful CI run](https://github.com/Alchemist-10/nexus_submitted/actions/runs/44459308194) passed type checking, lint, formatting, the embedded suite, all 29 tests on PostgreSQL 17 including the independent-connection race, and the production build.
