# Community implementation plan

The approved product design is in ../specs/2026-11-19-community-design.md. The writing-plans skill is unavailable in this installation, so this plan records the implementation sequence directly.

1. Add the community schema, Storage configuration, RLS, read models, acceptance, ranking, and source-post booking functions. Exercise them against disposable PostgreSQL-compatible test databases before hosted application.
2. Add shared topic/input/image validation, server-side queries and authenticated actions, upload cleanup, and live generated database types.
3. Build the feed, post composer, question detail, answer/vote/accept/report controls, and mentor recommendations. Retain original source as reference.
4. Preserve post context through mentor discovery, login, booking, and session dashboards; replace the global green theme with burgundy and warm neutrals.
5. Apply the verified migration to the authorized hosted project, run hosted API/Storage and isolated browser tests, remove test data, and finish local checks plus GitHub CI.
