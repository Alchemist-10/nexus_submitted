# Nexus workspace UI

## Approved direction

The user asked to implement the preceding UI recommendations and make Nexus more stylish. Use a light editorial workspace with burgundy accents, warm neutral surfaces, readable sans-serif app headings, restrained shadows, and purposeful icons. A purely decorative refresh would leave the hierarchy problems intact; a dark dashboard would change the established brand more than needed.

## Scope and implementation checklist

- [x] Review current routes, components, queries, and Next.js documentation.
- [x] Refine the previously approved recommendations into this cohesive direction.
- [x] Add active navigation and a compact account menu with all existing account actions.
- [x] Replace the signed-in marketing hero with a welcome area, quick actions, and a real next-session preview. Keep a distinct guest introduction.
- [x] Add Upcoming, Pending, and History session views with counts, nearest-first upcoming ordering, date tiles, and stronger action hierarchy. Preserve one column and status colours.
- [x] Improve mentor comparison with real prices, topic labels, ratings, and next published availability; add directory search and topic filtering.
- [x] Add mentor discovery alongside a more compact feed, preserving existing author, vote, answer, attachment, and mentor-context links.
- [x] Unify responsive spacing, typography, surfaces, focus states, and reduced-motion behaviour.
- [x] Verify types, lint, formatting, build, session grouping, and desktop/mobile interaction and accessibility.

## Behaviour and boundaries

Use server-rendered links and GET forms for filters. Small client components handle active route indication and browser-local date formatting. Reuse authenticated booking reads and the existing public availability RPC; do not change database policies, booking, payment, or rating rules. Availability is a preview and is rechecked by the existing booking flow. Failed availability reads show an explicit unavailable message rather than invented times. Personal session data is only requested for the authenticated home view.

Pending contains unpaid checkouts and payments requiring attention or awaiting refund. Upcoming contains other confirmed sessions whose end time has not passed. History contains the remainder, including past confirmed sessions that still need the mentor's completion action. Show this action in history rather than silently declaring those sessions completed. Counts describe the existing latest 100 loaded sessions. Sort Upcoming earliest first and History newest first. Empty filtered views offer navigation to useful alternatives.

Do not add decorative fake statistics, unverified badges, fabricated availability, new dependencies, or hosted data mutations. The user has already approved implementing the preceding recommendations; this document makes the implementation concrete without another approval loop.

## Verification plan

Test grouping boundaries and refund attention precedence with focused unit tests. Use a demo student to inspect personal home, all session views, navigation, mentor search/filter, and local time rendering. Check guest home and narrow layouts, horizontal overflow, accessible labels and contrast. Run production build and source checks, then push the reviewed changes under the existing GitHub authorization.

## Verification results

- Production build, TypeScript, ESLint, formatting, and three focused presentation tests passed.
- Demo student: eight desktop route/filter states and seven mobile route states checked. No horizontal overflow at 1256px or 390px. Home, sessions, and directory also checked at the 768px breakpoint.
- Upcoming sessions appear earliest first; History contains cancelled/completed sessions; the empty Pending view is useful. Overview counts match the rendered groups.
- Directory GET form tested by selecting DSA and submitting. Existing free-text DSA expertise correctly finds Aarav; name search finds Meera; unmatched search shows the clear-filters empty state. Published availability and session prices come from existing database reads.
- Automated axe audits: zero violations and zero incomplete checks on the final desktop/mobile page states, guest home, and the demo mentor dashboard with its meeting-link form expanded. The open account popover intentionally overlaps the page; axe flags obscured background text as incomplete, while its visible menu contrast was reviewed separately. Escape closes the menu and returns focus to its summary.
- No browser page errors observed. Temporary demo sessions were signed out. Booking/payment/rating mutations were not exercised or changed by this visual pass.
- Browser viewport changes return a known CLI EOF response after applying; doctor checks passed and rendered viewport sizes were checked directly.

## Follow-up considerations

The directory retains its existing 60-mentor limit. Availability previews use the existing RPC with at most six concurrent reads and do not reserve a slot. A larger campus rollout should paginate the directory and batch these previews. Current displayed counts refer to the latest 100 loaded bookings, with an explicit notice at the limit.
