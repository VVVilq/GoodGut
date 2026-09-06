# Nutrition warning scan — Plan brief

> Full plan: [plan.md](plan.md)

## What & Why

Connect saved nutrition thresholds to product scan results so shoppers can see ingredient and nutrition warnings together. One summary reports the total; specific triggers are highlighted directly in the product facts.

## Starting Point

Saved nutrition profiles and strict comparison logic already work. The scan result currently evaluates ingredient rules only and displays individual ingredient warning rows above the facts.

## Desired End State

The result shows one count message and red highlights on matching ingredients and triggered nutrient names/values. Tapping a highlighted nutrition row reveals its saved threshold below it. When evaluation is incomplete, tapping the summary reveals unavailable-rule reasons; zero incomplete results lead with “Ocena niepełna”.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Summary | One message; no separate triggered-rule list | User wants specific warnings shown through highlights. |
| Threshold detail | Tap highlighted row to expand/collapse inline | Explains the trigger while keeping the initial facts compact. |
| Unavailable details | Tap summary to expand reasons | Keeps one summary while allowing inspection of limitations. |
| Incomplete zero | “Ocena niepełna — 0 potwierdzonych ostrzeżeń” | Uncertainty comes before zero. |
| Nutrition highlighting | Name and value in red, icon and tap cue | Makes warnings visible and usable without colour alone. |
| Non-triggering facts | Ordinary styling, no disclosure | Focuses attention on actual warnings. |
| Comparison | Reuse strict evaluator and exact matching basis | Equality and unavailable data must never trigger. |
| Acceptance | Deterministic Android cases plus live scan | Covers repeatable edge cases and the actual scan path. |

## Scope

**In scope:**

- Combined saved-profile evaluation and correct counts.
- Single summary, nutrient highlights, threshold and unavailable-reason disclosures.
- Existing ingredient partial-data behavior and saved-profile lifecycle preservation.
- Automated integration coverage, development fixture server, and Android acceptance.

**Out of scope:**

- API/storage schema changes, profile editor redesign, and new nutrients.
- Unit/basis conversions, medical judgments, positive rule styling, and scan history.

## Architecture / Approach

Saved profile plus decoded product facts feed the existing mixed-rule evaluator through a combined composer. Presentation produces one summary and fact-row states; React Native handles disclosure interaction only. A standalone development fixture server uses the normal API URL setting for deterministic phone checks, with no fixture controls added to the product UI.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Combined evaluation | Mixed counts, evidence, and unavailable reasons | Missing ingredients accidentally suppress nutrition evaluation. |
| 2. Result presentation | Summary, highlights, accessible inline disclosures | Incomplete results look like a trustworthy zero. |
| 3. Android verification | Reproducible scenarios and physical acceptance | Live product data cannot reliably supply edge cases. |

**Prerequisites:** S-03/S-04 complete; existing mobile dependencies, API regression environment, and Android device access.
**Estimated effort:** Approximately 2–3 focused implementation sessions plus device acceptance; depends on test-environment readiness.

## Open Risks & Assumptions

- Partial ingredient evidence affects summary completeness only when ingredient rules are configured, even when all match. Nutrition-only profiles retain ingredient-source notices in product details without making their evaluation incomplete.
- Live source values change; record observed facts during physical scanning.
- Saved profile edits must refresh the result without exposing drafts or stale expanded details.
- Device acceptance remains pending until actually performed; no persisted-data migration is required.

## Success Criteria (Summary)

- Ingredient and nutrition highlights agree with one accurate triggered-rule total.
- Equality, missing facts, and mismatched bases never trigger; incomplete results remain explicit.
- Disclosures, saved-profile updates, and live scanning work on Android, supported by passing automated checks.
