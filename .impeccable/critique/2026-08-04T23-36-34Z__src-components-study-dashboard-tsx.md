---
target: Threadwise private Study dashboard after Phase 1 and Phase 2
total_score: 38
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-04T23-36-34Z
slug: src-components-study-dashboard-tsx
---
Method: dual-agent (A: study_ui_assessment_a / Hypatia - B: study_ui_assessment_b / Heisenberg)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 4 | Loading, saving, live, reconnecting, offline, and retry states are distinct. |
| 2 | Match system / real world | 4 | The workspace follows the semester's modules, work, resources, review, and focus language. |
| 3 | User control and freedom | 4 | Sheets support Cancel, Escape, backdrop close, focus restoration, draft protection, and completion Undo. |
| 4 | Consistency and standards | 4 | Grouped navigation, action hierarchy, feedback tones, and form patterns now share one grammar. |
| 5 | Error prevention | 4 | Destructive confirmation, required fields, mutation serialization, autosaved review drafts, and explicit review steps prevent common loss. |
| 6 | Recognition rather than recall | 4 | Visible labels, grouped navigation, a mobile dock, retained filters, linked focus targets, and keyboard help remove memory bridges. |
| 7 | Flexibility and efficiency | 4 | Ctrl/Cmd+K, G-chords, ?, persistent preferences, direct module filtering, and mobile shortcuts support fast repeat use. |
| 8 | Aesthetic and minimalist design | 4 | A Study-specific teal-blue system, operational typography, restrained Ari moments, and progressive disclosure replace generic dashboard repetition. |
| 9 | Error recovery | 3 | Startup retry and actionable error feedback are strong; provider-specific field-level recovery can still become more granular. |
| 10 | Help and documentation | 3 | The in-context keyboard guide is useful, but a compact first-use guide for Review and Canvas remains a future polish opportunity. |
| **Total** | | **38/40** | **Excellent** |

## Design Specificity Verdict

The revised surface feels authored for Threadwise Study Mode rather than interchangeable with a generic productivity dashboard. Module context, attention ranking, Deep Work outcomes, the evidence-led weekly review, Ari, and the teal-blue academic visual system form one coherent product language. The deterministic Impeccable scan is clean for both the component and stylesheet. The baseline browser pass exposed 23 runtime patterns (14 undersized operational-text findings, eight low-contrast findings, and one intentional cream-palette signal); the typography, contrast, control sizing, and theme rules were subsequently rebuilt.

## Overall Impression

The largest gain is structural: Study Mode now presents one academic decision at a time. Navigation is grouped, mobile actions stay in the thumb zone, long settings are tabbed, weekly review is a four-step flow, and focus sessions conclude with a meaningful academic outcome instead of a dead end.

## What's Working

- Product-specific information architecture keeps Overview, Work, Deep Work, Modules, Library, Search, Review, and Settings understandable without flattening them into eight equal choices.
- Recovery is calm and explicit: boot failures offer Retry, offline state is not shown as success, review drafts survive interruption, and completed work can be undone.
- Desktop and mobile share the same concepts while using different interaction density: grouped sidebar on desktop, four-item dock plus More on mobile.

## Priority Issues

- **[P2] Authenticated visual sign-off:** The private owner/group gate prevented a fresh post-fix live browser capture in this environment. Run a final deployed light/dark and mobile/desktop check with the real authorized workspace before release.
- **[P2] Contextual first-use help:** Keyboard help is complete, but Canvas setup and the evidence-first Review flow could use one short first-use callout each rather than relying on labels alone.
- **[P3] Very large semesters:** If modules or resources grow into the hundreds, add virtualization or stronger saved views only after real usage demonstrates the need.

## Persona Red Flags

- **Alex (power user):** The original missing shortcut behavior and flat navigation are resolved. Remaining limitation: no bulk editing across modules, which is acceptable until a real batch-use case appears.
- **Sam (keyboard and low-vision user):** Focus trapping, Escape, restoration, labels, contrast, and larger controls are now present. A deployed screen-reader pass remains the final validation step.
- **Casey (distracted mobile user):** The fixed bottom dock, durable review draft, fewer simultaneous decisions, and touch-safe controls address the baseline risks. Very long native select lists remain platform-dependent.

## Minor Observations

- Keep Ari contextual; using the mascot on every card would weaken the current hierarchy.
- Do not add another top-level view unless it cannot live naturally inside the current eight-view model.
- Keep the Study accent distinct from the personal and group dashboards so the private academic workspace remains immediately recognizable.

## Questions to Consider

- If a future feature does not improve academic capture, prioritization, retrieval, or reflection, should it stay out of Study Mode?
- Which real repeated action, if any, would justify bulk controls without increasing everyday cognitive load?
