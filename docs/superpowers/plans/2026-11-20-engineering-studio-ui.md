# Engineering Studio UI implementation plan

Approved scope: presentation only; see the corresponding design in ../specs/2026-11-20-engineering-studio-ui-design.md.

1. Record the approved design and inspect the existing Next.js styling guidance, component structure, and style order.
2. Add isolated decorative connection artwork and a reusable connection mark. Rework the home masthead, request index, and discovery rail using existing queries, action controls, and session preview. Keep real state and all form/link contracts intact.
3. Refine the existing workspace styles rather than adding a fourth broad override sheet. Give requests, mentors, appointments, and ordinary forms their own appropriate treatments. Adapt the existing theme stylesheet to the same vocabulary.
4. Inspect secondary screens, small viewports, menus, keyboard focus, light/dark appearance, reduced motion, and rendering errors using an isolated browser profile. Do not submit content, booking, or financial mutations.
5. Run source checks, existing focused theme/session tests, and a production build. Inspect the diff for any business-logic changes. Commit only this design's files, retain the separate untracked launch review, and push under the existing GitHub authorization.

No new dependencies, generated bitmap assets, hosted changes, backend refactoring, or new product features are needed. The concept image guides the layout; the shipped illustration will be native SVG/CSS and avatars remain existing account data.
