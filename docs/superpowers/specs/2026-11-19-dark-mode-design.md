# Nexus dark mode

## Direction

The user requested a stylish dark mode following the restoration of Georgia headings and Arial body text. Use near-black charcoal, layered graphite surfaces, warm ivory text, soft rose highlights, and deep burgundy primary actions. This keeps the existing identity; an inverted palette would distort avatars/images and pure black would flatten card hierarchy.

## Implementation checklist

- [x] Review the current style sheets, navigation, and Next.js client boundaries.
- [x] Add a compact appearance control with Light, Dark, and System choices on all routes, including guest pages.
- [x] Persist the preference locally, follow OS changes in System mode, and sync the choice across tabs. If browser storage is blocked, still allow a temporary selection.
- [x] Apply the resolved palette in the document head before first paint. Suppress hydration warnings only on the document element whose attributes are intentionally set there.
- [x] Theme existing surfaces, fields, feedback, menus, status badges, and focus styles. Preserve serif typography and unmodified image/avatar content.
- [x] Verify real guest and demo-account pages, persistence/reload/navigation, system preference, blocked storage, accessibility, responsive layouts, and production build.

## Behaviour

First visit follows the OS preference. A chosen Light/Dark mode overrides the OS until System is selected. Store only the appearance preference in localStorage; no schema or account changes. Keep status colours semantically green, red, blue, amber, grey, and purple with dark backgrounds and readable text. The hosted payment provider's own popup remains provider-owned.

Use a small browser-only theme utility, a client appearance selector reusing the existing keyboard-dismissable account popover, and scoped CSS overrides after the current styles. Do not change booking, payment, auth, or publishing behaviour.

## Verification

Exercise the pre-paint script in isolated JavaScript contexts for saved, missing, invalid, and inaccessible storage. Browser-check the appearance controls with actual navigation, reload and OS changes, then inspect desktop/mobile layouts and axe contrast. Review the document for scope and consistency, run lint/type/format/build checks, and push using the existing GitHub authorization.

## Verification results

- TypeScript, ESLint, formatting, the production build, and six focused theme/session presentation tests passed. Theme tests cover initial paint, explicit overrides, invalid and inaccessible storage, OS changes, cross-tab events, and write-blocked storage with a working temporary choice.
- Browser verified: Light/Dark/System selection, automatic OS light/dark following, an explicit Light override with a dark OS, persistence through full reloads and navigation, and real storage-event sync in two tabs.
- Dark pages audited on desktop: personal home, all three session views, mentor directory, public profile, profile editor, mentor studio, post composer, post discussion, mentor detail, and a confirmed test-mode checkout. No bright panels or horizontal overflow; no automated axe violations.
- Six key signed-in routes checked at 390px. Header checked at 768px; guest appearance menu, auth forms, and keyboard dismissal checked at 320px. Corrected a left-edge popover clipping issue at that width. Light mode remains available with the prior typography and palette.
- Gradient callouts cannot be evaluated automatically by axe. Manual contrast checks against their brighter endpoint give at least 6.07:1 for the displayed text palette. The scrolled post page also produced an incomplete contrast result for the translucent sticky logo area; its warm text on the dark header was reviewed separately. No automated contrast violations were reported.
- All test browsing used an isolated profile. Demo authentication was signed out; no bookings, payments, posts, or profile records were changed.
- Viewport-setting CLI commands return EOF after applying on this machine; doctor passed and actual dimensions were inspected directly.
