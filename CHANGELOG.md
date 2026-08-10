# Changelog

This file is updated as each agreed Threadwise revamp phase is implemented and verified.

## Unreleased

### Study timetable context and inspection
- Kept wheel input contained inside the Horizontal timetable at both time-axis boundaries, preventing the surrounding page from jumping. Frozen day labels now open the same focused day agenda as Vertical mode.
- Removed the repeated edge shadows from the frozen Deadlines cells; the existing divider now provides a clean, continuous boundary without semicircular artifacts.
- Made ordinary mouse-wheel movement and trackpad gestures pan the Horizontal timetable's time axis while the pointer is inside its frame. Input stays contained at either end instead of moving the surrounding page.
- Kept Day and Deadlines visible while Horizontal week mode scrolls through the 24-hour time axis, with opaque frozen panes, a pinned time ruler, and a quiet boundary between context and schedule.
- Made today unmistakable without confusing it with the current time: teal marks the current-day label and row, while orange remains reserved for the live NOW line.
- Changed timetable block selection from immediate editing to a read-only detail sheet with explicit Edit, Delete, and Close actions. New blocks still open directly in the form.
- Added width-aware horizontal cards so short blocks render as intentional capsules, medium blocks show a compact identity, and wide blocks reveal time and venue without fragmented labels.
- Added focused tests for density thresholds, exact duration widths, overlap lanes, midnight bounds, and detail-to-edit panel transitions.

### Full-day Study timetable and in-app image viewing
- Expanded both desktop timetable orientations to a 00:00–24:00 model with fixed-height scrolling, relevant-time auto-positioning, midnight-safe block bounds, and current-time labels reserved outside event content.
- Kept mobile on the focused day agenda rather than compressing a 24-hour weekly grid into an unreadable viewport.
- Replaced raw protected-media navigation with a same-origin Study lightbox that preserves caption/search context, supports Escape and backdrop dismissal, revokes object URLs, and distinguishes retryable delivery failures from expired media or dashboard authorization.
- Added a visible ten-minute capture-target status when Telegram has a current Study module, matching the backend's durable expiry instead of implying that module selection lasts indefinitely.
- Kept direct page copy and a clean Impeccable scan across the changed Study timetable, library, and stylesheet targets.

### Study reliability and horizontal deadline rail
- Removed the duplicate top weekday/deadline shelf from Horizontal Timetable mode. Weekdays now appear once as frozen day-agenda controls, followed by a compact per-day Deadlines rail and the hourly schedule.
- Kept at most two deadlines visible per horizontal day and moved overflow into the existing day agenda, preserving scanability without hiding access to the full list.
- Added an Inactive module section with explicit Restore or Activate actions. Owner archives remain visually distinct from newly discovered Canvas courses waiting for review.
- Updated the Study snapshot contract so archived modules and their work, resources, mistakes, sessions, schedule blocks, search results, reminders, and travel projections stay outside active semester views.

### Study timetable alignment and day navigation
- Aligned the weekday strip, deadline lane, and hourly schedule to one shared 84px time rail plus seven equal day columns. The earlier strip omitted the rail, shifting every weekday heading left of its actual timetable column.
- Made weekday selection purposeful: choosing a date now opens that date's detailed day agenda instead of silently changing hidden state while the weekly grid remained unchanged.
- Added NUSMods-style week orientation controls. Vertical view keeps days as columns and time running downward; Horizontal view uses days as rows and time running left-to-right with an independently scrollable clock axis.
- Reused the same blocks, module colors, live-time indicator, deadline shelf, and edit action in both orientations so changing the view never changes schedule data.
- Kept mobile navigation compact by removing the desktop time-rail spacer below 860px while preserving full-width touch targets for all seven days.

### Documentation reconciliation
- Reconciled the README, product definition, architecture, design guidance, 21st context, and contributor handoff with dashboard v0.9.0 and backend v0.32.0.
- Documented the current progressive Telegram-to-dashboard hierarchy, exact record deep links, immediate group-assignment rules, private Study Timetable, and Beacon's deliberate Telegram-only boundary.
- Preserved earlier release notes as historical evidence rather than rewriting the decisions and validation snapshots that were true when those versions shipped.

### Progressive group-work interaction
- Added exact item targeting from Telegram deep links: the dashboard selects the authorized workspace, opens the requested view, and opens the intended task, note, idea, or image without another search.
- Removed acceptance, decline, blocked, and member handoff controls from shared work. Assignments take effect immediately; unassigned members may claim work, while only the creator or a verified current Telegram administrator may assign or reassign it.
- Reduced shared task cards and collaboration sheets to role-appropriate actions. Assignees complete or snooze, unrelated members view, and creator/admin management remains available without granting direct-mutation bypasses.
- Simplified group progress and attention summaries around assigned, unassigned, open, overdue, and completed work while retaining historical activity records.

## Private Study Workspace

### Honest pre-semester and Calendar states
- Replaced `Week —` during the period before semester start with `Pre-semester · Week 1 begins <date>`, derived from the configured Study timezone. Missing semester dates now say so explicitly rather than looking like a rendering failure.
- Added a dedicated regression test for pre-semester, active-week, and missing-date presentation.
- Changed the personal Connections surface to distinguish a usable Google Calendar authorization from a stale stored record. Expired or revoked access now presents `Reconnect required` and a direct reconnect action; the automatic-sync control is shown only for a working connection.
- These changes close two trust gaps: a legitimate academic lifecycle state looked broken, and a saved OAuth record could look healthy even after Google no longer accepted it.

### Live class travel
- Turned recurring schedule blocks into optional class-commute cards without adding another navigation section. Each block can now hold a campus destination, usual origin, and travel buffer.
- Added progressive inline editing: route context remains a compact chip until the selected block expands, keeping the Schedule surface readable on desktop and mobile.
- Added create-time destination controls, edit/disable actions, dark-mode-compatible styling, and proxy authorization for the new scoped PATCH endpoint.
- The change exists because saved origins alone did not connect to a class schedule, forcing users back into Telegram natural-language route queries and leaving proactive departure reminders impossible to configure.

### Friction discovered
- Phase 1 made academic capture reliable in Telegram, but deep-work review still required combining compact chat cards, Canvas status, module resources, mistakes, mastery, and weekly priorities by hand.
- Reusing the personal or shared-group dashboard would expose irrelevant navigation and make Study Mode feel like a themed copy instead of a purpose-built academic workspace.
- Merely hiding a navigation item would not protect a private feature from direct URLs, forged API requests, workspace switching, or protected file requests.

### Product and access decisions
- Added a third, module-first dashboard architecture instead of extending the personal or group shells.
- Reveal Study Mode only to the exact configured Telegram owner while the exact configured Study group is selected and actively bound. Every page, API method, live event, and protected resource repeats the same fail-closed gate and returns an opaque not-found response on mismatch.
- Kept PostgreSQL as the one source of truth. Telegram captures, Canvas changes, and dashboard edits reconcile through the existing authenticated API and scoped server-sent events.
- Kept core Study behavior deterministic. Attention ranking, retrieval, editing, mastery, and synchronization require no AI service.

### Capability
- Added Overview, Modules, Work, Library, Review, live Search, Deep Work, and Settings views with a module-first desktop and mobile shell.
- Added module/work/resource editing, completion and archival; full notes and links; pinned Telegram images/files with protected delivery; OCR recall; mastery and mistake controls; weekly planning/review; focus sessions; Canvas sync and missing-assignment decisions; saved origins; and recurring study blocks.
- Selecting a module on the dashboard updates the active Telegram Study context, while scoped live events refresh open dashboard views after Telegram or Canvas changes.
- Added dark-mode parity, keyboard focus, minimum touch targets, reduced-motion handling, accessible sheets, explicit synchronization state, and the approved Ari untangling loader.

### Verification
- Added contract tests for exact workspace visibility, personal and ordinary-group isolation, inactive bindings, direct Study URL denial, forged proxy paths, and endpoint method allowlists.
- Passed all 29 dashboard tests, lint, standalone TypeScript checking, and an isolated production Next.js build. The Impeccable static scan is clean; desktop/mobile light/dark browser checks caught and corrected narrow heading/filter constraints before handoff.
- No production deployment is included in this local implementation; live owner/group, Canvas, protected-image, and Telegram round-trip checks remain deployment gates.

### Error-check and 38/40 craft hardening
- Ran two independent Impeccable assessments: an unanchored design review and a separate detector/browser evidence pass. The baseline scored 24/40 and exposed flat navigation, undersized operational text, weak contrast, incomplete error states, non-functional shortcut copy, unsafe modal focus, and interruption-prone review/focus flows.
- Adapted relevant 21st.dev patterns into Threadwise's own visual language: grouped desktop navigation, a four-action mobile dock with **More**, command-palette shortcuts, progressive settings panels, and a four-step evidence-led weekly review. No catalog component or generic template was copied wholesale.
- Added a real startup recovery state, distinct success/error/offline feedback, completion Undo, retained Deep Work targets, post-session outcomes, autosaved review drafts, three explicit weekly priorities, dirty-close protection, focus trapping and restoration, Escape handling, and concise in-context keyboard help.
- Removed hard-coded owner identity, made Ari theme-aware, strengthened Study-specific color and operational typography, raised functional text and touch targets, and kept the focus view visually quiet.
- Fixed the final React 19 lint defects by moving state hydration out of synchronous effects and removing render-time ref access.
- The post-fix Nielsen/Impeccable score is **38/40**. The static detector is clean for the Study component and stylesheet; TypeScript, lint, all 29 tests, and the isolated production build pass. The archived assessment lives under `.impeccable/critique/` for future trend comparisons.

## Unreleased - Impeccable Dashboard Reconstruction

### Friction discovered
- The product mark changed between light and dark mode, weakening recognition, while the raster light mark looked soft and slightly off-centre at navigation size.
- The landing-page “Works with Telegram” ornament did not read as Telegram or as a meaningful status.
- The native workspace select inherited browser colours, became unreadable in dark mode, and offered none of the context or interaction quality of the surrounding interface.
- Today repeated the same capture action, rendered long operational task titles as oversized editorial display text, and spent a large part of the viewport on generic statistic cards.
- Threadline nested cards inside a card, and decorative gradients and orbits added polish without explaining the user's work.
- Group-mode QA found editorial typography still leaking into shared task cards and a native checkbox expanding into an unreadable white square in dark-mode group settings.

### Design decisions
- Standardized product chrome on one optically centred inline vector in both themes; Ari remains the contextual mascot and app/avatar artwork.
- Replaced the landing ornament with a recognizable Telegram glyph and direct “Built for Telegram” copy.
- Rebuilt the workspace picker as an accessible, keyboard-navigable listbox with workspace type, selection state, dark-mode parity, and a mobile bottom-sheet presentation.
- Reduced Today to one capture command, one readable focus task, one compact actionable day pulse, and one structural Threadline.
- Reserved serif typography for greetings and collection-level moments; task titles and operational UI now use a readable sans-serif scale.
- Removed decorative background effects and nested card treatment where hierarchy, dividers, and spacing communicate structure more clearly.
- Standardized personal and group task cards on the operational sans-serif scale and replaced the native nudges checkbox with a keyboard-focused, theme-safe switch.

### Quality target
- The pass is evaluated against the Impeccable craft floor: identity consistency, hierarchy, responsive behavior, accessibility, meaningful interaction, theme parity, and the absence of template-like visual filler.

### Group TODO review
- Desktop testing exposed weak row hierarchy: task numbers, titles, assignment, deadlines, and expansion controls read as one loose line, while an immediate API save on every native date-time change repeatedly dismissed the picker. The sheet also referenced an undefined `--paper` token, making it translucent over its backdrop and undermining both light and dark themes.
- Added a focused review sheet for Telegram `TODO:` and `ACTION ITEMS:` imports without adding another permanent dashboard destination.
- Made every parsed row editable before import: inclusion, title, known-member assignees, plain-language team owner, due time, and initial Open/Done state.
- Kept controls role-aware. The original sender and currently verified group owners/admins may update or import; other group members see the same review read-only.
- Added clear row warnings, partial-failure retry, idempotent completion state, keyboard focus containment, reduced-motion support, and a sticky mobile import action.
- Refreshes Group Work immediately after import and displays retained team-owner labels beside ordinary assignees.
- Hardened the review after a structured-flow audit: terminal imports are read-only, manual refresh is explicit, unmatched Telegram usernames can be removed, and warnings update after assignee/team/status corrections.
- Increased inclusion, expansion, assignee, and unmatched-user controls to touch-safe sizes; added select focus visibility and a compact terminal footer for mobile.
- Preserves the Tasks URL after a successful import instead of changing only the in-memory view.
- Stabilized the review grid so permission, status, and error notices cannot move the scrollable task rows or sticky footer into the wrong track.
- Limited completion and warning summaries to selected rows, removed repeated terminal status copy, and added a visible keyboard focus ring to inline task titles.
- Rebuilt each review row around an explicit Task label, editable title, compact assignee/deadline/status metadata, and one clearly labelled details control; widened the desktop work surface while preserving the compact mobile accordion.
- Made deadlines draft-first: date and time changes remain local until the reviewer presses **Done**, so native calendar and time controls are not interrupted by a server refresh. Clearing a deadline follows the same explicit commit step.
- Restored an opaque adaptive sheet and footer with `--canvas`, corrected primary-action contrast in dark mode, added dark warning treatment, and retained token-driven geometry across both themes.
- Passed dashboard lint, all 12 contract tests, and the production build after the coordinated API/proxy update.

## v0.9.0 - Ari Untangles the Loading State

### Friction addressed
- Replaced generic route waiting with a loading moment that explains Threadwise's purpose visually: Ari turns a knot into one finished thread.
- Used the user's approved artwork directly instead of redrawing, simplifying, or approximating it.

### Exact animation
- Added the original 2,172×724 source as four equal 543×724 frames and advances through them as a stepped sprite.
- Added the loader to the dashboard route boundary with concise “Untangling your workspace…” copy.
- Shows the completed fourth frame without motion when a visitor requests reduced animation.
- Added asset-dimension and frame-position regression assertions so future optimization cannot silently crop, stretch, or replace the approved art.

### Quality
- Passed all 12 dashboard tests, lint, and the production build; a mobile Chromium visual check confirmed the approved 3:4 crop and later untangling frame without distortion.

## v0.8.1 - Exact Ari Artwork and Reminder Controls

### Friction addressed
- Replaced the fixed due-nudge presets with a direct minute interval so a user can choose any whole-minute warning window, including `0` for due-time-only delivery.
- Removed private assignee nudges from Personal settings because assignees are a group-workspace concept.
- Corrected the dashboard's daily-cap input to accept the same range as the API instead of rejecting an existing value above 50.

### Ari and identity
- Replaced the hand-redrawn Ari approximations with deterministic crops from the approved character sheet, preserving the supplied geometry, gradients, proportions, and expressions exactly.
- Used the approved faceless mark in light product chrome and the approved dark app icon on dark surfaces.
- Made Ari a little more present in Quick Capture, Reminder settings, and the empty Find a time state while keeping ordinary records and actions free of mascot clutter.
- Replaced the browser and Telegram-ready icons with the approved dark Ari artwork and retained the original source sheet in the brand directory for traceability.

## v0.8.0 - Find a time

### Group coordination
- Added a dedicated **Find a time** view for Telegram groups with active-poll navigation, manager creation controls, a touch-friendly availability grid, response progress, and ranked overlapping slots.
- Added active availability polls to Group Overview and confirmed meetings to Group Work so scheduling stays connected to the rest of the group's coordination context.
- Added per-member Calendar actions after finalization without surfacing personal integration state or event links to other members.

### Telegram continuity
- Added signed Mini App start-parameter routing that selects the opaque group workspace before opening the exact poll or create form.
- Kept the Telegram surface compact: the dashboard drives the shared grid while the original group card is refreshed through the existing Render service.
- Added live scheduling state to the dashboard snapshot contract so open browsers reconcile without manual refresh.

### Responsive design and quality
- Designed desktop and mobile scheduling as one progressive surface: readable overlap cards on desktop, 44px touch cells and horizontal day scrolling on mobile, and no hover-only controls.
- Added contract and deep-link regression coverage for valid poll data, malformed windows, viewer-private response data, and invalid Telegram start parameters.
- Made create-form dates follow the user's local calendar day rather than UTC and preserved poll deep links when the Telegram username fallback is needed.
- Passed all 10 dashboard tests, lint, standalone TypeScript checks, and the production build; desktop and 500px browser checks caught and corrected a clipped mobile create action before release.

## v0.7.0 - Focus, Quiet Capture, and Ari

### Product hierarchy
- Established **Capture, Coordinate, Recall** across the landing page, personal workspace, settings, search, and empty-state copy.
- Adopted “Threadwise turns Telegram messages into things people can find, remember, and finish.” as the shared product position.
- Removed Expenses and Excel from active navigation, capture, search, Today, settings, and provider surfaces while preserving their underlying implementation and data.
- Kept Google Calendar as a secondary task integration inside Settings.

### Brand system
- Replaced the dark compass badge with an adaptive, faceless threaded-path mark that sits naturally in light and dark product chrome.
- Added Ari light/dark avatars, a full Ari illustration, a matching favicon, reusable SVG sources, and a 512×512 Telegram PNG.
- Limited Ari to onboarding, empty focus states, and recoverable dashboard failures so the workspace remains calm and professional.

### Layout and quality
- Rebalanced Today after removing peripheral summary cards: recently captured and saved images now complete the final desktop row and collapse cleanly on mobile.
- Added focused copy and schema regressions and retained server-filtering safeguards so hidden expense results cannot reappear through live search.
- Verified the release with lint, all six dashboard contract tests, a production build, and Chromium checks of the landing page, authenticated desktop views, and the 390 px mobile layout with no application console errors.

## v0.6.0 - Provider Connections

### Calendar and Excel
- Replaced “Connect in Telegram” dead ends with direct OAuth actions in the personal dashboard.
- Added provider identity, synchronization coverage, automatic-sync controls, and concise connected/disconnected states.
- Added Calendar backfill for dated tasks and task-card actions to add, update, open, or remove one durable Google event.
- Added Excel workbook bootstrap, existing-expense import, open workbook, retry sync, and workbook setup actions.
- Returned OAuth completions to the Connections view with an explicit success or recovery message.

### Scope and reliability
- Removed Gmail from the active dashboard and public privacy copy.
- Kept Connections exclusive to personal workspaces and routed every mutation through the signed Threadwise API.
- Preserved Threadwise records when either external provider is unavailable; provider synchronization remains a recoverable mirror operation.

### Product record
- Linked the dashboard to the canonical Threadwise product journal, which records the user friction, decisions, implementation rationale, evidence, and follow-up for this revamp and reconstructs earlier phases from Git history.

## v0.5.1 - Concise Group Interface

### Copy and hierarchy
- Replaced explanatory group-page headlines with direct labels for Overview, People, Progress, Activity, Resources, and Search.
- Simplified group empty states, overview cards, resource labels, and navigation actions so the interface explains only what the user needs next.

### Overview polish
- Rebalanced the desktop Overview into complete card rows, eliminating the uneven empty columns created by the previous grid spans.
- Tightened attention and weekly cards, aligned action and activity panels, and corrected mobile wrapping for unassigned work.

### Quality
- Verified the revised pages in Chromium at 1440px and 390px widths with no browser errors or warnings.

## v0.5.0 - Distinct Group Workspaces

### Group information architecture
- Replaced the personal-dashboard clone with a focused group flow: **Overview**, **Work**, **People**, **Progress**, **Activity**, **Resources**, Search, and role-aware group management.
- Renamed Stand-up to **Progress** and kept its useful done, next, and blocked summary without imposing meeting jargon on every group.
- Consolidated shared notes, ideas, and images into a compact Resources library while keeping their full collection views available from each resource card.
- Kept Expenses and personal integrations exclusive to personal workspaces.

### Permissions and interaction
- Hid management navigation and assignment-creation controls from regular members, with authoritative owner/admin checks still enforced by the bot service.
- Preserved self-service assignment responses and handoffs for every member.
- Added group-specific capture language, responsive role labels, touch-safe navigation, and a dedicated group demo for desktop and mobile QA.

### Quality
- Verified the key group flows in Chromium at desktop and 390px mobile widths with no browser errors or warnings.

## v0.4.0 - Group Collaboration

### Shared workspaces
- Added a restrained **Group overview** with overdue, unassigned, awaiting-reply, and blocked attention cards, active handoffs, recent movement, and a lightweight **This week** summary.
- Added shared task filters for My work, Unassigned, Blocked, Awaiting reply, and individual members, with live search and readable responsive task cards.
- Added a **People** workload view, derived **Stand-up** view, and chronological **Activity** view without turning collaboration into employee surveillance.

### Assignment flow
- Added a responsive task collaboration sheet for assign, unassign, accept, decline, block, unblock, and handoff actions.
- Kept dashboard and Telegram task state on one source of truth, with live browser refresh and quiet Telegram bridge messages for meaningful web changes.
- Preserved group role boundaries while allowing each member to update their own assignment response.

### Interface language
- Replaced generic red and green status dots across personal and group surfaces with Threadwise's hooked thread cue, small line motifs, and explicit sync copy.
- Added compact stagger motion, anchored desktop panels, mobile bottom sheets, touch-safe controls, and reduced-motion fallbacks.

### Quality
- Verified lint, the validated snapshot contract, a production Next.js build, and real Chromium layouts at 1440×900 and 390×844.

## v0.3.0 - Shared Group Workspaces

### Added
- Added a workspace switcher for personal and Telegram group workspaces on desktop and mobile.
- Added a separate group dashboard presentation with shared copy, membership and role context, admin-gated group defaults, and group-aware expense metrics.
- Added a secure workspace-selection cookie and proxy scope so live events, images, search, capture, and every collection mutation stay attached to the selected workspace.

### Boundaries
- Group dashboard requests are still signed by the human Telegram user and then verified against current group membership by the bot service.
- Personal Gmail, Calendar, Excel, export, and account-deletion controls are never shown or accepted in group scope.

## Unreleased - Phase 3: Actions, Navigation, and Mobile Polish

### Collection actions
- Replaced transform-sensitive card menus with a portal-based action system: menus anchor beside their trigger on desktop and become large, reachable bottom sheets on mobile.
- Fixed note ellipsis controls, added direct recoverable deletion, and added long-press/select mode with select-all, multi-delete, and one confirmation for the batch.
- Applied the same anchored action behavior to task, idea, and image cards while keeping right-click support on desktop.

### Brand and navigation
- Standardized the wordmark, in-app mark, browser icon, and mobile header on the bot's dark compass, teal thread/check, and cream needle symbol.
- Added the compact brand mark to the mobile workspace header and kept collection controls at touch-friendly sizes.

### Search and settings
- Removed the redundant Search submit step; results now stream as the user types and can be narrowed live by tasks, notes, ideas, images, or expenses.
- Replaced the long settings wall with focused General, Reminders, Connections, and Privacy panels, including previously hidden reminder caps, due nudges, OCR languages, and expense currency.
- Made settings navigation horizontally scrollable on mobile while preserving the shared Telegram/dashboard data source.

### Quality
- Added responsive menu placement, focus behavior, escape/outside-click dismissal, safe-area spacing, and mobile sheet motion with the existing reduced-motion support.

## Unreleased - Phase 2: Notes, Ideas, Images, and Expenses

### Notes and Ideas
- Rebuilt notes as large, readable editorial cards with pin-first and newest-first ordering, direct edit and pin controls, confirmed archive actions, and Windows-style right-click menus.
- Rebuilt ideas as animated project cards with stages, pinning, conversion to tasks, contextual actions, and a first-class Idea Brief entry point on every card.
- Added a saved Idea Brief experience with an executive read, a composite signal, seven scored dimensions, market notes, recommendations, cautions, loading motion, retry handling, and re-analysis.

### Images and Expenses
- Rebuilt Images around a responsive gallery with a dedicated favourites shelf, favourite-first ordering, search-as-you-type, document filtering, batch selection, richer lightbox actions, and right-click menus.
- Rebuilt Expenses as a visual financial pulse with a six-month bar rhythm, category ring, average and largest-movement cards, Excel coverage, a sync ribbon, and a more legible activity ledger.

### Synchronization and quality
- Added image favourite state and saved Idea Brief data to the validated browser snapshot contract.
- Extended stale-write protection to image caption and favourite changes, with optimistic UI rollback and automatic live refresh on conflicts.
- Kept all edits on the shared Threadwise records, so subsequent Telegram and dashboard queries read the same current task, note, idea, image, and expense data.
- Added contract tests for Idea Briefs and image favourites, plus reduced-motion and responsive behavior for every new collection surface.

## Unreleased - Phase 1: Foundation, Today, Threadline, and Tasks

### Brand and interface system
- Standardized the dashboard on Threadwise's needle-and-thread identity with a light-surface wordmark and a dark teal app icon.
- Increased the default reading size, card density, touch targets, and workspace width across desktop and mobile.
- Added restrained staggered loading, task completion, modal, context-menu, and status motion with reduced-motion fallbacks.
- Removed the duplicate header `LIVE` badge; the sidebar now has one larger, truthful connection indicator with reconnect feedback.

### Capture and synchronization
- Replaced the inert quick-capture control with a universal capture composer for tasks, notes, ideas, and expenses.
- Added an intelligent review step that uses the bot's parsing and AI structuring before anything is saved.
- Added live dashboard refresh through authenticated server-sent events, periodic reconciliation, and focus/visibility recovery.
- Added optimistic revision protection for in-place task, note, and idea edits so stale tabs refresh instead of overwriting newer data.

### Today and Threadline
- Rebuilt Today around a focused next action, a compact day pulse, a card-based recently captured section, saved-image preview, spending, and connections without orphaned whitespace.
- Rebuilt Threadline as a useful to-do timeline grouped into Overdue, Today, Next 7 days, Later this month, Later, and Someday.
- Made Threadline and Today update from the shared live snapshot without a page refresh.

### Tasks and search
- Rebuilt Tasks as readable animated cards with newest-first ordering, Today/Upcoming/All/Completed filters, and alternate due/oldest sorting.
- Added complete/restore, edit, pin, one-hour snooze, and archive actions plus a reusable right-click/ellipsis context menu foundation.
- Changed search to update while the user types, with debouncing and stale-request protection.

### Quality
- Added dashboard contract coverage for live snooze state.
- Verified the dashboard test suite, lint, TypeScript production compilation, and the bot's full regression suite.
