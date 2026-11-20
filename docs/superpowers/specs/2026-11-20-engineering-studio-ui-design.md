# Nexus: engineering studio visual direction

Status: approved. The user reviewed the generated Engineering Studio concept and said, "This is good, go forward."

## Purpose

Give Nexus an identifiable visual language for engineering students finding a human mentor. The current repeated cards, gradient callouts, pill navigation, and generic slogans make distinct tasks look too similar. The redesign should make people, learning requests, and appointments visually distinct while keeping the existing product behaviour.

## Approaches considered

1. **Engineering studio (recommended).** Warm paper, burgundy ink, editorial serif headings, small technical annotations, and a restrained connection diagram. Learning requests resemble working notes, mentors have portrait-led introductions, and sessions resemble appointment tickets. This connects the identity to the product's purpose without turning the interface into a novelty.
2. **Technical journal.** A mostly monochrome, dense reading layout with strong rules and a type-led masthead. Better for long discussions, but gives live mentorship less visual prominence.
3. **Campus noticeboard.** Coloured notes, playful stickers, and a more informal layout. More expressive, but can become distracting around bookings and payments.

## Recommended design

Keep the user's preferred Georgia display headings, Arial body text, burgundy brand, existing dark-mode preference, and semantic status colours. Use warm ivory in light mode and charcoal in dark mode. Replace pervasive gradients and floating boxes with stronger typography, borders, spacing, and a smaller set of deliberate surfaces.

### Shared identity

- A simpler masthead with a distinctive connection mark and underlined active navigation. Preserve the existing links, accessible names, appearance selector, and account menu behaviour.
- Use a small monospace annotation style for section indices and dates; keep body copy comfortable to read.
- A restrained visual motif showing a question connecting to a person and a conversation. This is decorative, locally rendered SVG/CSS, hidden from assistive technology, and never resembles a live statistic or clickable control.
- Buttons use clear primary, secondary, and text treatments. Preserve visible keyboard focus. Motion is limited to brief hover/focus feedback and respects reduced motion.

### Community and discovery

- Guest hero combines the existing headline with the connection motif and a concise explanation of the free introductory call.
- Signed-in home remains a useful workspace: compact personal greeting, actual next-session preview, then the feed. Decorative graphics must not delay reaching requests.
- Learning requests use ruled entries, clear authorship, topic labels, and a readable title. Upvote, answer, and mentor links retain their existing controls and destinations.
- Category navigation reads as a compact subject index. Avoid decorative badges that could be mistaken for verification or urgency.
- Mentor discovery gives portraits, names, expertise, real ratings, real next availability, and follow-up prices a consistent hierarchy. Replace generic cover slogans with quieter diagram details and topic-led accents. Do not introduce invented credentials or random identity colours that imply status.

### Sessions and secondary screens

- Keep sessions in one column, with a date rail and a restrained appointment-ticket treatment. Maintain green confirmed, red cancelled, and the existing distinct colours for other states.
- Preserve the position and clarity of meeting access, cancellation, checkout, completion, and rating actions. Decorative perforations must not overlap interactive content.
- Carry the same typography, surface, and border system into post details, profiles, mentor details, sign-in/sign-up, composer, editors, and checkout. Keep forms conventional and feedback clearly visible.
- Keep provider-owned Razorpay checkout and truthful test-mode messages intact.

## Implementation boundary

Changes are limited to presentation: CSS, decorative SVG, layout wrappers, classes, and nonfunctional display copy. Prefer editing the existing workspace and theme styles instead of adding another broad override sheet. Small presentational components can keep decorative markup isolated.

Do not edit database migrations, policies, queries, server actions, API routes, authentication/session logic, validation, payment code, booking rules, recommendation calculations, or background workers. Preserve form actions, field names, hidden inputs, submit types, conditional rendering, links, pagination/filter parameters, vote state, and theme persistence. Do not add packages or mutate hosted records.

## Verification

1. Review the final diff against the presentation-only boundary.
2. Run TypeScript, lint, formatting, existing focused presentation/theme checks, and a production build.
3. Use an isolated browser session to inspect guest and signed-in home, mentor directory/detail, sessions, post detail/composer, profile/editor, auth, and an existing checkout without submitting financial or content mutations.
4. Check light and dark modes, keyboard navigation, open menus, mobile widths down to 320px, tablet layout, desktop layout, horizontal overflow, readable contrast, and reduced motion.
5. Verify existing navigation, category/search/sort forms, answer anchors, and action visibility remain intact. Do not create new bookings, payments, posts, or profile edits for a visual review.

## Review outcome

The user selected the Engineering Studio direction after reviewing an image showing the ivory/burgundy masthead, notebook connection illustration, subject index, ruled requests, mentor introductions, and an appointment ticket. Follow that visual vocabulary while keeping body text in the previously requested Arial and all displayed account/session data real. The illustration is decorative; no generated face is presented as a real member.

## Implementation and verification

- Added native SVG/CSS connection artwork and a matching masthead mark; no image generation assets, new packages, external fonts, or new database reads are required by the redesign.
- Reworked the home subject index, request entries, mentor introductions, appointment preview, directory cards, and shared form/detail surfaces. Kept Georgia headings, Arial body text, burgundy branding, semantic booking/payment colours, and the existing appearance selector.
- On small signed-in screens, hide the decorative hero artwork to keep the personal workspace compact. The next-session preview precedes the feed in both DOM and visual order. Guest mobile retains the illustration. Desktop uses named grid areas for the appointment and discovery rail.
- Browser checked guest, student, and mentor screens at 1256px, 768px, 390px, and 320px. No observed horizontal overflow or automated accessibility violations in the final saved page states. The existing mentor meeting-link form was expanded and audited without submitting it.
- Checked appearance selection through the real menu, persistence across navigation, both menus closing with Escape and returning focus, narrow popover bounds, the DSA directory filter returning Aarav, and answer links scrolling to the existing answers section. Reduced motion disables smooth scrolling and presentation transitions.
- Automated contrast checks cannot resolve the ruled illustration background or some clipped decorative pseudo-elements. Reviewed their colours and geometry separately: notebook/annotation/sticky-note text has a minimum measured ratio of 5.07:1 across the reviewed palettes. Ticket cut-outs stay at the outer edge, outside its padded text. Corrected the light-mode own-post label contrast during review.
- TypeScript, ESLint, formatting, the six existing theme/session presentation tests, and the production build passed. No business-logic files, API handlers, database migrations, queries, server actions, payment code, or workers were changed. No posts, bookings, payments, or profiles were submitted during verification; isolated sample sessions were signed out.
