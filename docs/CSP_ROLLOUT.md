# Content Security Policy rollout

Threadwise generates one unpredictable nonce per browser document in `src/proxy.ts`. The nonce is
passed to Next.js and the Telegram bootstrap script. Script execution contains neither `unsafe-inline`
nor `unsafe-eval` and is enforced by default.

## Current stage

`THREADWISE_CSP_MODE` now defaults to `enforce`. Next/Telegram scripts and style elements are
nonce-bound. The UI still needs bounded dynamic React style attributes for timetable coordinates,
progress widths, module accents, and drag transforms. Those attributes are isolated under the CSP
Level 3 directive `style-src-attr 'unsafe-inline'`; the allowance does not apply to scripts or style
elements. Raw user HTML remains disabled and accepted Mermaid SVG remains sanitized.

Latest evidence (2026-08-31): the optimized production build completed and the full 20-case
desktop/mobile Playwright gate exercised the enforced header, public/demo routes, responsive scrolling,
rich-note rendering, Mermaid/UML examples, and the cryptographically authenticated synthetic Study
draft lifecycle without a CSP break. Dashboard PR `#6` passed validate/browser/Vercel checks, and
production deployment `dpl_Bhk9yjShbMNnYu4gxYkbCgojHoDp` completed Ready with the canonical alias.

## Maintenance gate

1. Exercise public, Personal, Group, and Study routes in desktop/mobile Chromium and the Telegram Mini
   App after changes to dynamic styling, scripts, Markdown/Mermaid, dialogs, timers, or PWA startup.
2. Treat any script/style-element violation as a release blocker. Do not add `unsafe-inline` to
   `script-src` or `style-src-elem`, and do not add `unsafe-eval`.
3. Keep dynamic style values bounded or enum-derived; move stable presentation to classes. Do not place
   user-authored CSS into the style-attribute compatibility lane.
4. Inventory reports without recording user content or sensitive query strings.
5. Run unit, browser, TypeScript, lint, build, secret, and dependency gates again.

Rollback is immediate and data-free: set `THREADWISE_CSP_MODE=report-only` and redeploy. Removing the
variable restores enforcement; it no longer disables the policy.
No database migration, key rotation, or content rewrite is involved.
