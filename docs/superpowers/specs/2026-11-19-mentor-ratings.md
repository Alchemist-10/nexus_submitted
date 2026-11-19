# Ratings after a mentorship call

The user requested a mentor rating option after the video call. Implement a 1–5 star, one-time rating from the booking's learner once the mentor has marked the session completed and its scheduled end has passed. The external Google Meet flow does not prove attendance or automatically complete the booking; existing manual completion remains authoritative.

Use a native radio group with clear labels in My sessions. Show the saved score after submission and refresh mentor summaries. Individual ratings and booking IDs are readable only by the booking participants. Listed mentors expose only their average (one decimal) and count in the directory, profile, and post recommendations. No ratings show an honest empty state; no fake sample ratings or optional written reviews. This is separate from question/answer upvotes and does not change recommendation ranking.

A booking-keyed table prevents duplicate ratings. Table writes are revoked; a narrow authenticated RPC verifies learner identity, completion, end time, and score range under a row lock. Identical retries succeed; attempts to change a submitted score fail. A separate public aggregate RPC returns no booking or student identifiers, and processes at most 60 mentor IDs. Verify authorization, range, lifecycle, idempotency, privacy, averages, and independent concurrent submissions; then run hosted/browser checks using temporary test accounts. Preserve the existing demo data and real accounts.

Implementation sequence: migration and tests; generated types; server action and data queries; accessible burgundy radio controls and summaries; hosted/browser verification; documentation and GitHub checks.
