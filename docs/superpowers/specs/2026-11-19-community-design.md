# Nexus: find a mentor through a real problem

The user approved the community direction and implementation on 19 November 2026, with engineering students as the initial audience and mentor discovery/video calls as the main purpose. This revision takes precedence over a generic social feed. The existing booking foundation remains in use.

## Experience

The homepage becomes a community of learning requests across coding, projects, academics, and careers. A post includes a title, context/attempts, the specific point of confusion, one to five topic tags, and up to three PNG/JPEG/WebP images of at most 3 MiB each. Posts and their images are public; the composer states this. Plain text and code are escaped rather than interpreted as HTML.

Each post leads with relevant human mentors and a free introductory call. Recommendations require topic overlap with declared expertise or accepted-answer evidence. Matching topics dominate the score; accepted answers, answer upvotes, and availability provide bounded secondary signals. The interface states the reason for each match and handles no matches honestly. No fabricated people, reviews, or AI match percentages. A booking retains its source post privately between its participants while the post itself is public. External meeting access retains the existing authorization and join window.

Members can contribute answers and upvote questions/answers. Only the question author can accept one answer belonging to that question. Self-votes are denied, repeated vote requests are idempotent, and removed votes immediately remove derived reputation. Contribution evidence is distinct from mentorship-session reviews; this milestone does not invent session ratings. Question authors can delete their post, answer authors can delete their answer, and signed-in members can report a question for manual review in Supabase. There is no new admin role exposed in the client.

## Data and boundaries

Add posts, answers, votes, and reports with RLS, explicit column grants, checks, cascading references, and indexes. Public read models use security-invoker views. Narrow functions cover acceptance, ranking, and context-preserving booking. Storage uploads are authenticated and confined to the caller's path; raster signatures and size are checked server-side, with MIME restrictions in Storage. Upload failures clean up partial objects. Database constraints are authoritative for votes and author ownership.

The feed has latest/top/unanswered filters, category/topic filters, text search, and bounded pages. Post detail combines context, images, answers, and a mentor sidebar. Mentor links preserve the source post through sign-in and booking. Navigation includes Community, Find a mentor, My sessions, and Mentor studio. Burgundy, cream, and warm neutral colors replace the green palette throughout the app, with responsive layouts and visible keyboard focus.

## Scope and verification

Implement in this milestone: community feed/composer/detail, public images, answers, upvotes, accepted answers, reports, explainable mentor ranking, booking context, and burgundy theme. Paid follow-ups, native video infrastructure, chat, semantic/learned ranking, notifications, and automated moderation remain later milestones. Current external HTTPS video links and one-free-introduction-per-pair rules continue.

Verify SQL ownership, anonymity, cross-post acceptance, vote/reputation reversibility, matching/cold-start behavior, booking context and rollback, existing booking tests, real hosted Storage restrictions, browser submission/answer/vote/mentor journey, responsive layout, types, lint, formatting, build, and PostgreSQL CI. Use temporary users/data for live tests and remove them without touching the user's real account.
