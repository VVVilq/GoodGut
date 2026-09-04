# Nutrition Threshold Profile — Plan Brief

> Full plan: `context/changes/nutrition-threshold-profile/plan.md`

## What & Why

GoodGut will let a shopper add personal above-or-below thresholds for any supported nutrition value, with an explicit per-100-g or per-100-ml basis. This completes the configuration half of nutrition rules while preserving the product's non-medical, one-profile, on-device model.

## Starting Point

The app already has a durable ingredient profile, strict versioned codec, crash-safe two-slot persistence, global save lifecycle, and dedicated profile editor. Nutrition evaluator types and strict comparison semantics already exist, but nutrition rules cannot yet be stored or edited.

## Desired End State

The profile overview links to a focused nutrition editor. A shopper can configure at most one rule for each of eight nutrients, explicitly select direction and basis, enter a non-negative decimal, save atomically, and recover the same mixed profile after restart. Existing v2 ingredient profiles migrate without data loss.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Nutrient scope | All eight contract nutrients | Avoids arbitrary gaps in an already stable finite catalogue. |
| Rule multiplicity | One rule per nutrient | Keeps the mobile model clear and prevents contradictory duplicates. |
| Numeric input | Finite non-negative decimals, comma or point | Matches product facts and Polish input habits while rejecting ambiguity. |
| Defaults | Direction and basis must be explicit | Prevents an unnoticed assumption from changing rule meaning. |
| Editor shape | Add unused nutrient, then edit a rule card | Keeps an empty/small profile concise while making configured rules visible. |
| Migration | Lossless v2→v3 | Existing ingredient selections remain valid and must not be reset. |
| Removal | Immediate draft removal | Existing explicit Save, restore, and dirty-discard boundaries provide recovery. |
| Guidance | Plain-language labels, units, basis, equality note | Makes each rule understandable without medical framing. |
| Acceptance | Automated boundaries plus focused Android checks | Covers persistence and domain risks plus real keyboard/accessibility behavior. |

## Scope

**In scope:**

- Unified ingredient-and-nutrition profile aggregate
- Eight supported nutrients with stable Polish labels and fixed units
- One above/below, per-100-g/per-100-ml rule per nutrient
- Decimal parsing and whole-profile validation
- Strict schema v3 plus lossless v2 migration
- Existing two-slot repository/store integration
- Profile summary and dedicated nutrition editor
- Evaluator-rule projection, documentation, and Android acceptance

**Out of scope:**

- Scan-result nutrition warnings and combined trigger counts (S-05)
- Multiple rules per nutrient, ranges, conversions, serving values, or extra nutrients
- Suggested thresholds, medical analysis, positive rules, accounts, sync, or backend storage
- New rendered-component testing infrastructure

## Architecture / Approach

One local aggregate flows through the existing strict codec, two-slot repository, global store, profile summary, and separate ingredient/nutrition editors. Both editors save a full immutable snapshot, so either rule family survives changes to the other. The aggregate projects into the existing `PersonalRule[]` contract for S-05.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Domain | Unified profile, catalogue, validation, parsing, projection | Duplicate vocabularies or ambiguous numeric input |
| 2. Persistence | Strict v3 and lossless v2 migration through existing store | Losing ingredients or weakening crash safety |
| 3. Editor | Summary, Add flow, rule cards, Save/restore/accessibility | Hidden defaults or stale async-save state |
| 4. Handoff | Cross-boundary evidence and Android regression acceptance | Overstating S-04 by pulling in S-05 behavior |

**Prerequisites:** Completed local ingredient profile and product contract 2.0; both are already present.

**Estimated effort:** Approximately 3–4 implementation sessions across four phases, plus focused Android acceptance.

## Open Risks & Assumptions

- React Native numeric keyboards do not guarantee a locale-specific separator; parsing must accept both comma and point independently of keyboard layout.
- Existing hard-coded input colors may need scoped theme fixes to pass dark-mode contrast checks.
- V2 storage keys must remain intact until a verified explicit v3 save succeeds to preserve rollback and recovery options.

## Success Criteria (Summary)

- A shopper can configure, edit, remove, save, and reload unambiguous rules for every supported nutrient.
- Valid v2 ingredient profiles migrate without losing selections, and failed saves never replace the active mixed profile.
- Persisted rules produce exact evaluator-compatible objects while existing ingredient and scan behavior remains unchanged.
