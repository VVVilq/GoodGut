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
| R-TAX01 | Node and subtree scope are confused or a selection is counted more than once. | `personal-rules-test.ts` and `ingredient-warning-composition-test.ts` cover exact nodes, descendants, multiple matches, and one warning per saved selection. | Select goat/sheep milk and egg yolk using both scopes on Android. | S-03 |
| R-TAX02 | Partial or unavailable classification is presented as a trustworthy zero. | Composition and presentation tests cover complete zero, certain partial matches, partial non-matches, missing, and unparseable evidence. | Exercise partial products and an API/catalogue outage; facts, retry, and rescan remain usable. | S-03 |
| R-TAX03 | A catalogue deployment loses its active release. | Import/repository tests cover validation, atomic activation, and rollback. | Record the active version, redeploy the Railway API, and verify promoted/search/product classification still use it. | S-03 |
| R-PRIV01 | Local selections or custom ingredient text leave the device. | Product and catalogue clients expose only barcode/search/catalogue parameters; evaluator integration runs against the hydrated local profile. | Inspect requests during profile editing and scanning; confirm no profile/custom text is transmitted except an intentional catalogue search query. | S-03 |
| R-NUT01 | Invalid or duplicate nutrition thresholds become active, or the editor exposes values outside its approved UX ranges. | `apps/mobile/src/domain/__tests__/personal-profile-test.ts`, `apps/mobile/src/features/personal-profile/__tests__/nutrition-editor-state-test.ts`, and `apps/mobile/src/features/personal-profile/__tests__/nutrition-presentation-test.ts` prove validation, uniqueness, slider ranges/steps, and selection errors. | Exercise zero, both endpoints, and intermediate steps on the energy 0–1000 kcal slider and nutrient 0–100 g sliders. | S-04 |
| R-NUT02 | Schema-v2 migration loses existing ingredient selections or overwrites its only valid source. | `apps/mobile/src/data/__tests__/personal-profile-repository-test.ts` and `personal-profile-integration-test.ts` prove in-memory migration, legacy-slot preservation, verified v3 save, and exact rule projection. | Upgrade a populated v2 profile, save it, terminate the app, and confirm the same ingredients after restart. | S-04 |
| R-NUT03 | Editing one profile section erases the other section. | `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts` proves mixed-profile round trips, ingredient edits preserving thresholds, nutrition removal preserving ingredients, and v2-to-v3 handoff. | Save from both editors in turn and inspect the complete mixed profile after each restart. | S-04 |
| R-NUT04 | Draft or failed nutrition edits leak into active scan rules. | `apps/mobile/src/features/personal-profile/__tests__/profile-store-test.ts` and `nutrition-editor-state-test.ts` prove submitted-snapshot isolation, restore, retry, and post-submit dirty state. | Change a draft during save, simulate failure, retry, restore, and discard navigation on Android. | S-04 |
| R-NUT05 | Persisted thresholds cannot feed the evaluator with exact direction, basis, identity, and missing-data semantics. | `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts` round-trips all eight nutrients through repository/store and evaluates persisted equality, missing-value, and basis-mismatch cases; `personal-rules-test.ts` covers strict above/below boundaries. | Inspect saved rule summaries and confirm no nutrition warning presentation appears before S-05. | S-04 |
| R-PRIV02 | Nutrition thresholds reveal local preferences through API requests or logs. | Profile persistence and evaluator tests operate entirely against local storage; product requests remain barcode-only. | Inspect network traffic while editing, saving, restarting, and scanning; confirm thresholds and the complete profile never leave the device. | S-04 |

## Exit Criteria

- All automated quality gates pass.
- R-P01 through R-P05 have passing automated evidence before S-02 closes.
- Android save/relaunch and profile CRUD acceptance pass.
- No unresolved critical/high risk remains in the implementation review.
- S-03 acceptance covers light/dark themes, long labels, TalkBack order/roles, retry, rescan,
  stale catalogue cache, overlap consolidation, multiple-parent evidence, profile reset notice,
  catalogue rollback, and Railway redeployment persistence.

## Deferred Risks

- Fuzzy, substring, stem, translated, or inferred-synonym ingredient matching
- Exhaustive or regulated allergen detection and medical suitability claims
- Multiple profiles, login, synchronization, sharing, and server-side profile storage
- Remote catalogue delivery and scale/performance beyond the bounded local catalogue
