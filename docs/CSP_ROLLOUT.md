# Content Security Policy rollout

Threadwise generates one unpredictable nonce per browser document in `src/proxy.ts`. The nonce is
passed to Next.js and the Telegram bootstrap script. The policy intentionally contains neither
`unsafe-inline` nor `unsafe-eval`.

## Current stage

`THREADWISE_CSP_MODE` defaults to `report-only`. This is deliberate: browser QA currently reports
React `style` attributes used for bounded visual values such as colors, widths, and progress. An
enforced `style-src 'self' 'nonce-…'` policy would block those attributes. Do not hide that work with
`unsafe-inline`, and do not set production to `enforce` yet.

Latest evidence (2026-08-31): a fresh live demo load produced at least five report-only `style-src`
violations for legitimate inline style attributes. The page remained functional because the policy is
not enforced. No script error or exploit was observed; the result confirms that the enforcement gate
below is still open.

## Enforcement gate

1. Deploy report-only to staging with synthetic accounts.
2. Exercise public, personal, group, and Study routes in desktop/mobile Chromium and the Telegram
   Mini App. Include Markdown, Mermaid, protected images, dialogs, timers, and PWA registration.
3. Inventory violations without recording user content or full URLs containing sensitive query data.
4. Replace required style attributes with classes, CSS custom-property patterns that satisfy the
   selected policy, or another nonce-compatible approach. Keep the policy free of broad unsafe terms.
5. Run unit, browser, TypeScript, lint, build, secret, and dependency gates again.
6. Set `THREADWISE_CSP_MODE=enforce` in staging first. Promote it separately only after a clean soak.

Rollback is immediate and data-free: set `THREADWISE_CSP_MODE=report-only` (or remove it) and redeploy.
No database migration, key rotation, or content rewrite is involved.
