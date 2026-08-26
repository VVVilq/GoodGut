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
| R-P03 | Draft edits leak into active scan rules before explicit Save. | `apps/mobile/src/features/personal-profile/__tests__/profile-store-test.ts` and `profile-editor-state-test.ts` prove isolation and restore. | Navigate away with dirty changes and confirm discard behavior. | S-02 |
| R-P04 | Failed or corrupt local persistence destroys the last valid profile. | `apps/mobile/src/data/__tests__/personal-profile-repository-test.ts` proves strict decoding, pointer-last saves, recovery, and failure preservation. | Save/relaunch on Android and exercise failure/recovery paths. | S-02 |
| R-P05 | The persisted profile cannot feed the warning evaluator deterministically. | `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts` proves round-trip aliases, custom exact names, stable IDs, and deselection/deletion. | Inspect active saved selections after relaunch before S-03 integration. | S-02 / S-03 |
| R-P06 | The broad catalogue is difficult to navigate on a phone. | `apps/mobile/src/features/personal-profile/__tests__/profile-editor-state-test.ts` preserves category order and search metadata. | Browse/search all categories and complete custom CRUD on Android. | S-02 |
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
