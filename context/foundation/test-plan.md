# GoodGut MVP Test Plan

## Purpose

This plan ties GoodGut’s highest MVP risks to concrete automated and manual evidence. It is the authoritative risk map used by implementation and by `.agents/prompts/mvp-check.md`; feature plans retain their detailed phase checklists.

## Quality Gates

- Mobile: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`
- API regression: `cd services/api; .\mvnw.cmd test`
- Physical acceptance: Android device checks owned by the active roadmap slice

## Risk-to-Test Matrix

| Risk ID | MVP risk | Automated evidence | Manual evidence | Owner slice |
| --- | --- | --- | --- | --- |
| R-P01 | A catalogue alias matches the wrong ingredient or more than one rule. | `apps/mobile/src/domain/avoided-ingredients/__tests__/catalog-test.ts` proves catalogue IDs/tokens are unique; `profile-test.ts` and `personal-rules-test.ts` prove exact alias and no-substring behavior. | Review every Polish label, canonical name, alias, and category before persistence/UI phases. | S-02 / S-03 |
| R-P02 | Duplicate custom rules inflate the triggered-rule count. | `profile-test.ts` rejects case/whitespace duplicates and predefined canonical/alias collisions; evaluator tests count by rule. | Confirm duplicate errors identify the existing predefined/custom item. | S-02 |
| R-P03 | Draft edits leak into active scan rules before explicit Save. | Planned profile-store/editor tests must prove toggle/add/rename/delete leave active rules unchanged until save success and restore resets the draft. | Navigate away with dirty changes and confirm discard behavior. | S-02 |
| R-P04 | Failed or corrupt local persistence destroys the last valid profile. | Planned repository tests must prove strict v1 decoding, inactive-slot verification, pointer-last save ordering, backup recovery, and no overwrite during load. | Save/relaunch on Android and exercise failure/recovery paths. | S-02 |
| R-P05 | The persisted profile cannot feed the warning evaluator deterministically. | `profile-test.ts` proves the adapter emits existing `IngredientRule[]` shapes and evaluates predefined aliases/custom exact names with one count per rule; later repository integration tests cover round-trip hydration. | Inspect active saved selections after relaunch before S-03 integration. | S-02 / S-03 |
| R-P06 | The broad catalogue is difficult to navigate on a phone. | Planned search/presentation tests must preserve category order and matching metadata. | Browse/search all categories and complete custom CRUD on Android. | S-02 |
| R-REG01 | Profile work regresses scan/product facts. | Existing mobile lookup/decoder/scanner/presentation suites and API tests remain required gates. | Confirm Home profile entry and scanner are both reachable and S-01 behavior is unchanged. | S-02 |

## Exit Criteria

- All automated quality gates pass.
- R-P01 through R-P05 have passing automated evidence before S-02 closes.
- Android save/relaunch and profile CRUD acceptance pass.
- No unresolved critical/high risk remains in the implementation review.

## Deferred Risks

- Fuzzy, substring, stem, translated, or inferred-synonym ingredient matching
- Exhaustive or regulated allergen detection and medical suitability claims
- Multiple profiles, login, synchronization, sharing, and server-side profile storage
- Remote catalogue delivery and scale/performance beyond the bounded local catalogue
