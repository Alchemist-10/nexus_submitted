# First milestone verification

## Completed locally

| Check                                     | Result                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| TypeScript                                | Passed, errors enforced                                                                                 |
| ESLint                                    | Passed, zero warnings                                                                                   |
| Prettier                                  | Passed                                                                                                  |
| Production build                          | Passed with the unconfigured-backend setup state                                                        |
| SQL and validation suite                  | 28 passed, 1 skipped                                                                                    |
| Independent-connection PostgreSQL race    | Configured in CI; not executed on this machine because no PostgreSQL server or Docker daemon is running |
| Package dependency tree                   | Valid, no invalid peer dependencies                                                                     |
| Homepage automated WCAG A/AA audit        | Zero reported violations; some overlapping decorative elements require manual contrast review           |
| Mobile signup automated WCAG A/AA audit   | Zero reported violations, no incomplete checks                                                          |
| Mobile layout                             | No horizontal overflow at 390 px on the homepage and signup screen                                      |
| Browser errors                            | None reported on checked pages                                                                          |
| Signup without backend configuration      | Clear error displayed; no fake account was created                                                      |
| Protected dashboard without configuration | Redirects to setup                                                                                      |
| Original source folder                    | Git working tree unchanged                                                                              |

The SQL suite executes the actual migration, RLS policies, constraints, and RPCs in embedded PostgreSQL. It tests authenticated identity context through test-only Supabase auth scaffolding. These results do not claim that Supabase Auth email delivery or a complete hosted browser booking has passed.

## Hosted backend selected

The user created **nexus-rebuild** (`amgwmeqophjaprqemqym`) in **2026-after_nov** and selected it for the clean application. The current Supabase integration lists only the previous organization and rejects this new project with a permission error. Reauthorization for the new organization is required before applying hosted migrations or obtaining client configuration. No hosted migration or live authentication/booking verification is claimed yet.

After project creation: inspect its public tables, apply the migration, inspect security advisories, generate TypeScript types, configure the public URL/key locally, and verify the connected authentication and booking journey. Public client configuration belongs in ignored `.env.local`; no service-role key is required by this application.

## GitHub integration

The clean rebuild is pushed to `Alchemist-10/nexus_submitted` on `rebuild/foundation`, with [pull request 1](https://github.com/Alchemist-10/nexus_submitted/pull/1). The old main is preserved at `legacy/pre-rebuild-2026-11-19` and remains in the merged commit history. Main-branch integration follows passing CI.

The first native PostgreSQL run exposed timestamp rounding in the adjacency test fixture: JavaScript Date parsing dropped PostgreSQL microseconds. The corrected fixture reads the exact endpoint as text. The native PostgreSQL suite and independent-connection race are being rerun in GitHub Actions; the database overlap constraint was retained.
