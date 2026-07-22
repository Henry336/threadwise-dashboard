# Changelog

This file is updated as each agreed Threadwise revamp phase is implemented and verified.

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
