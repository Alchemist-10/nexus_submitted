# Ending a session and unlocking ratings

The reported Riya/Aarav booking was confirmed with a scheduled end still in the future. Leaving an external Google Meet call did not update Nexus, so the old scheduled-end/manual-completion gate hid the rating and the join window stayed open.

The mentor can now explicitly end a confirmed session after its scheduled start, even before its original end. This marks the booking completed, denies future Nexus joins, and immediately permits the booked student's rating and its public aggregate. Ending remains mentor-only and idempotent; a learner, outsider, cancelled booking, or pre-start booking cannot perform it. No real booking is automatically ended by this change.

The dashboard and meeting-access page provide an End session confirmation with a note to end Google Meet separately. Students see a waiting explanation while confirmed, then a rating or saved score directly on the meeting-access page. Confirmed pages refresh on visibility/focus and every 15 seconds while visible, avoiding refresh during pending forms. A manual refresh button is also available.

Every Join video call link now points to an authenticated, non-cached launch route that rechecks participant identity, booking state, and join window before returning the external URL. A stale Nexus page therefore cannot launch a completed/cancelled/expired booking through this endpoint. This does not revoke a Google URL already copied or close a room controlled by Google.

Migration `20261119081211_session_ending.sql` replaces the completion, rating-eligibility, and public rating-aggregate functions while retaining their existing grants. Types and function signatures are unchanged.

The updated local suite passed 42 tests, with two deliberate independent-connection skips. The new regression test proves early mentor completion, immediate rating/aggregation, join denial, role restrictions, and one completion event under retries. Types, lint, formatting, and the production build passed.

In two isolated browsers against hosted Supabase, a temporary mentor ended a started session whose scheduled end was still in the future. The student's already-open page automatically switched from joining to rating, without reload/navigation. The student submitted five stars successfully. Opening the old launch URL returned to the completed-session page rather than the external meeting. No browser errors were reported; axe reported zero violations and zero incomplete checks on the completed-session rating page.

Temporary test accounts, bookings, meeting link, and rating are removed after verification. The user's ongoing Riya/Aarav booking and existing demo dataset are preserved. Google Meet attendance, host controls, and room lifetime remain outside Nexus; no provider-end webhook or native video integration is claimed.
