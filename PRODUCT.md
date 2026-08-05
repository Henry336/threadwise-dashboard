# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Threadwise serves Telegram users who capture useful messages, coordinate work, and need to retrieve context without searching through chat history. Personal workspaces support an individual owner; shared workspaces support verified Telegram group members. The private Study workspace is restricted to one configured Telegram owner inside one configured Study group.

## Product Purpose

Threadwise turns Telegram messages into things people can find, remember, and finish. The dashboard is the calm, editable web surface for the same stored work. Success means capture stays quick in Telegram, larger review and editing tasks are clearer on the web, and both surfaces remain synchronized without duplicate data entry.

## Positioning

Threadwise is quiet infrastructure inside Telegram. It organizes information that already originates in conversation into three product pillars: **Capture**, **Coordinate**, and **Recall**. It does not aim to replace a calendar, learning-management system, project-management suite, or notes editor.

## Operating Context

- Telegram is the primary capture and reminder surface.
- The dashboard is used for scanning, editing, search, group coordination, and focused review.
- Group access is derived from signed Telegram identity, an opaque selected workspace id, and live Telegram membership verification.
- Study Mode uses read-only Canvas synchronization, deterministic attention ranking, module-scoped work and resources, weekly planning/review, and focused study sessions.
- PostgreSQL is the shared source of truth for Telegram and dashboard interactions.

## Capabilities and Constraints

- Personal workspaces expose tasks, notes, ideas, searchable images, search, settings, and Google Calendar as a secondary integration.
- Shared workspaces expose assigned work, people, progress, activity, resources, and availability coordination.
- The Study dashboard appears only when the configured owner selects the exact configured Study group. Unauthorized Study routes and API requests return 404 without revealing the feature.
- Study Mode includes Overview, Modules, Work, Library, Review, Search, Deep Work, and Settings; Canvas remains read-only and local completion never submits coursework.
- Expenses and Excel are frozen experiments and remain absent from active user-facing navigation.
- Clear commands and most natural-language capture are deterministic; AI is an optional enhancement, not a dependency for core workflows or Study Mode.
- Browser code never receives database credentials, Telegram bot tokens, Canvas tokens, OAuth refresh tokens, or dashboard service-signing keys.

## Brand Commitments

The product is named Threadwise and uses the line “Threadwise turns Telegram messages into things people can find, remember, and finish.” The faceless threaded-path mark represents the product; Ari is the friendly mascot used selectively for orientation and recovery. Voice is short, direct, calm, and helpful. The established light/dark identity and approved Ari artwork must remain consistent.

## Evidence on Hand

- Product capabilities and operating boundaries: the backend `README.md`, `CASE_STUDY.md`, and `docs/PRODUCT_JOURNAL.md`.
- Architecture and security model: the backend `docs/ARCHITECTURE.md` and this repository’s `README.md`.
- Incumbent interface system: `docs/DESIGN.md`, `.21st/design.json`, `src/app/globals.css`, `src/components`, and `public/brand`.
- Real user feedback and friction records are maintained in the backend product journal. No usage benchmark, testimonial, or commercial claim should be invented.

## Product Principles

1. Capture should be faster than organizing manually.
2. Threadwise should speak only when feedback or a decision is useful.
3. Information hierarchy should reflect attention, not fill a dashboard grid.
4. Telegram and web should edit one shared source of truth.
5. Specialized modes earn their place through a clear Telegram-native job and strict access boundaries.

## Accessibility & Inclusion

Core actions must work with keyboard, touch, and screen readers. Mobile layouts target a 360px minimum width with 44px primary touch targets, readable default text, visible focus, reduced-motion support, and equal information hierarchy in light and dark themes.
