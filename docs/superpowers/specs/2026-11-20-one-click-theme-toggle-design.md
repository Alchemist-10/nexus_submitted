# One-click appearance switch

The user explicitly requested a one-click switch between dark and light mode, replacing the appearance menu in the approved Nexus design.

Use a single native button in the same header position. Clicking chooses the opposite of the currently resolved appearance, including when the current preference is System. Show a moon to offer dark mode and a sun to offer light mode. The fixed accessible name is "Dark mode" with `aria-pressed` reflecting whether dark mode is active; a tooltip names the action. Native Enter/Space activation and visible keyboard focus remain available.

Keep the existing preference storage, cross-tab updates, pre-paint theme script, and blocked-storage fallback. A first visit still follows the device until a choice is made. Remove the menu's unused styles; retain the account menu. No product or backend logic changes.

Implementation: replace the appearance popover with a native button subscribed to the resolved document theme, reuse `chooseTheme`, and update its shared/dark/mobile styling. Verify one-click changes in both directions, OS-derived initial state, reload/navigation persistence, keyboard activation, cross-tab updates, mobile fit, accessibility, and the existing theme tests; run source checks and a production build.

## Verification

- Real browser: initial System preference follows both light and dark device settings; each click selects the opposite resolved theme. Correct target icon, tooltip, and pressed state were checked in both modes.
- Reload retains the selected mode. Enter and Space each toggle once while keeping focus. Changes sync both ways between the home and directory tabs, including their accessible pressed state.
- Desktop and 320px directory audits have zero accessibility violations or incomplete checks; the phone header fits without horizontal overflow. No browser errors were observed.
- TypeScript, ESLint, formatting, the three existing theme tests, and the production build pass. No auth, community, booking, payment, or database code was changed.
