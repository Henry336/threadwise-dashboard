# Changelog

This file is updated as each agreed Threadwise revamp phase is implemented and verified.

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
