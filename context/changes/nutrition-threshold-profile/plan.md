# Nutrition Threshold Profile Implementation Plan

## Overview

Deliver roadmap slice S-04 by extending GoodGut's single, local profile with editable nutrition threshold rules. A shopper can configure one rule for any of the eight normalized nutrients, choose whether it triggers above or below a finite non-negative threshold, and explicitly choose a per-100-g or per-100-ml basis.

This slice stores and edits evaluator-ready rules but does not display nutrition warnings on scan results. Combined ingredient and nutrition evaluation and presentation remain S-05.

## Current State Analysis

The app already has a crash-safe two-slot profile repository, a global profile store, explicit Save semantics, and separate profile summary and ingredient editor routes. The persisted schema is v2 and contains only ingredient selections and custom ingredients; its strict decoder rejects extra fields.

The domain evaluator already defines nutrition-rule identity and comparison semantics. It supports eight normalized nutrients, treats missing values and basis mismatches as unavailable, uses strict greater-than or less-than comparisons, and does not trigger on equality. The remaining work is to model, persist, edit, summarize, and expose those rules through the existing profile boundary.

## Desired End State

From the profile overview, a shopper can open a dedicated nutrition editor, add any unused supported nutrient, explicitly choose direction and basis, enter a non-negative decimal threshold using a comma or point, edit or remove rule cards in a draft, and save the complete profile atomically. One rule is allowed per nutrient.

Existing v2 profiles migrate losslessly to v3 with their ingredient choices preserved and an empty nutrition-rule list. Saved nutrition rules survive restart and project into the existing `PersonalRule[]` evaluator contract with stable identities. Failed saves preserve both the last active profile and the retryable draft.

### Key Discoveries

- `apps/mobile/src/domain/personal-rules.ts:25` already defines the required nutrition rule shape, while `:176` implements basis matching and strict comparison.
- `apps/mobile/src/domain/product-lookup/types.ts:1` fixes the supported catalogue at eight nutrients and `:14` fixes their available/unavailable fact contract.
- `apps/mobile/src/data/personal-profile-codec.ts:3` uses strict schema v2 decoding, so adding thresholds requires an explicit schema migration rather than silently widening v2.
- `apps/mobile/src/data/personal-profile-repository.ts:40` preserves the last valid profile through inactive-slot verification and pointer-last writes; v3 must retain that ordering.
- `apps/mobile/src/features/personal-profile/profile-store.ts:32` promotes only a successfully saved candidate, which is the required atomic boundary for both ingredient and nutrition changes.
- `apps/mobile/src/features/personal-profile/personal-profile-screen.tsx:6` is the existing profile overview and natural entry point for a dedicated nutrition editor.
- `context/foundation/roadmap.md:118` assigns configuration to S-04 and reserves combined scan warnings for S-05.

## What We're NOT Doing

- Nutrition warning cards, highlighted nutrition facts, unavailable-rule presentation, or combined trigger counts on product results; those belong to S-05.
- More than one rule for the same nutrient, bounded-range rules, cross-basis conversion, serving-based thresholds, percentages, or inferred bases.
- Nutrient-specific medical recommendations, suggested thresholds, disease profiles, positive/green rules, or suitability judgments.
- Backend profile storage, authentication, synchronization, sharing, multiple profiles, or transmitting threshold values to the API.
- Adding nutrients beyond the eight fields in product contract 2.0 or changing the API/product-data contract.
- A new rendered-component test dependency; screen layout, keyboard behavior, and TalkBack remain focused manual checks.

## Implementation Approach

Evolve the current ingredient-only profile into one unified personal-profile aggregate containing ingredient selections, custom ingredients, and nutrition thresholds. Keep the existing ingredient helpers focused, introduce a nutrition-profile module for catalogue metadata and rule validation, and expose a combined adapter to `PersonalRule[]` so consumers use one last-saved snapshot.

Version the persisted document and storage keys to v3. Decode v2 with its original strict contract, migrate it deterministically by adding an empty nutrition array, and write v3 through the same verified two-slot protocol. Do not reset valid v2 ingredient data or rewrite corrupt data during load.

Use a dedicated nutrition editor route following the existing ingredient editor's active/draft separation, dirty-navigation guard, explicit Save, retry, and restore behavior. The Add flow lists only unused nutrients; configured rules render as editable cards. Direction and basis have no implicit defaults and must be selected explicitly.

## Critical Implementation Details

### State sequencing

Each editor submits an immutable full-profile snapshot. If the user changes the draft while an asynchronous save is in flight, only the submitted snapshot becomes active when the save succeeds; later edits remain dirty. A nutrition save must retain the ingredient fields from the same draft, and an ingredient save must retain nutrition rules.

### User experience spec

Parse both Polish comma and point decimal separators, but store a finite non-negative number and render a stable localized value. Every rule card must state the nutrient, `powyżej` or `poniżej`, the correct unit (`kcal` for energy and `g` otherwise), and `na 100 g` or `na 100 ml`; a short editor note states that equality does not trigger.

## Phase 1: Unified Profile Domain and Nutrition Validation

### Overview

Define one stable aggregate and all pure contracts needed by persistence, UI, and the later S-05 consumer.

### Changes Required

#### 1. Canonical nutrient catalogue

**Files**: `apps/mobile/src/domain/personal-rules.ts`, `apps/mobile/src/domain/product-lookup/types.ts`; new nutrition-profile module under `apps/mobile/src/domain/`

**Intent**: Give the editor and evaluator one compile-time-safe vocabulary for supported nutrients, bases, directions, Polish labels, and units without duplicating identifiers.

**Contract**: The catalogue contains exactly `energy_kcal`, `carbohydrates`, `sugars`, `fat`, `saturated_fat`, `fiber`, `protein`, and `salt`. Energy uses `kcal`; all other entries use `g`. Supported bases are `per_100g` and `per_100ml`, and directions are `above` and `below`.

#### 2. Unified personal-profile aggregate

**Files**: new or renamed personal-profile domain module; `apps/mobile/src/domain/avoided-ingredients/profile.ts`; affected imports and tests

**Intent**: Preserve focused ingredient behavior while giving persistence and stores one atomic profile containing both rule families.

**Contract**: The aggregate retains `selections` and `customIngredients` unchanged and adds `nutritionThresholds`. Empty profile construction initializes all three collections. Nutrition rules have stable IDs and at most one entry per nutrient.

#### 3. Nutrition mutation, parsing, and validation

**Files**: nutrition-profile domain module and focused tests

**Intent**: Make rule creation and editing deterministic before React or storage depends on it.

**Contract**: Pure helpers add, edit, and remove rules; reject duplicate nutrients, duplicate IDs, missing direction/basis, unsupported enum values, blank input, negative values, and non-finite values. Input accepts one decimal separator (`.` or `,`) and normalizes it to a number; malformed mixed/grouped formats are rejected. Zero is valid. Rule ordering is deterministic and does not change merely because a field is edited.

#### 4. Combined evaluator projection

**Files**: personal-profile adapter/domain module; `apps/mobile/src/domain/personal-rules.ts`; tests

**Intent**: Hand S-05 one saved-profile projection instead of parallel ingredient and nutrition sources.

**Contract**: Convert the validated aggregate to stable `PersonalRule[]`, preserving existing ingredient descriptors and emitting nutrition rules with their stored IDs, nutrient, direction, threshold, and basis. Invalid profiles fail before projection rather than being partially evaluated.

### Success Criteria

#### Automated Verification

- Catalogue tests prove exactly eight unique nutrient IDs, correct Polish labels/units, and one canonical vocabulary shared with product facts.
- Domain tests prove add/edit/remove, one-rule-per-nutrient, stable IDs/order, both directions, both bases, and whole-profile validation.
- Parser tests accept zero and finite non-negative comma/point decimals while rejecting blank, negative, non-finite, grouped, mixed-separator, and trailing-junk input.
- Projection tests emit unchanged ingredient rules plus evaluator-compatible nutrition rules with deterministic IDs and order.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- Human reviews all eight Polish nutrient labels, units, direction wording, basis wording, and the equality explanation for clarity and non-medical framing.

**Implementation Note**: Pause for wording review before those labels become persisted UI contracts.

---

## Phase 2: Lossless Persistence Migration and Profile State

### Overview

Move the unified profile to schema v3 without losing valid v2 ingredient choices or weakening crash recovery.

### Changes Required

#### 1. Strict v3 codec and v2 migration

**Files**: `apps/mobile/src/data/personal-profile-codec.ts`; codec tests

**Intent**: Accept only valid persisted structures while preserving existing ingredient profiles.

**Contract**: Encode only schema v3 with the unified profile. Decode v3 using exact keys and full nested validation. Decode a valid v2 document under its historical contract and migrate it to v3 by retaining selections/custom ingredients and adding `nutritionThresholds: []`. Unsupported versions, malformed rules, extra fields, invalid numbers, and malformed JSON remain explicit failures.

#### 2. Versioned two-slot repository

**Files**: `apps/mobile/src/data/personal-profile-repository.ts`; repository tests

**Intent**: Keep the last durable profile available across migration, interrupted writes, and corruption.

**Contract**: Add v3 active/a/b keys and retain read-only discovery of v2 keys. A valid v2 load returns a migrated profile without deleting or overwriting v2 data automatically. The next explicit Save writes verified v3 bytes to the inactive v3 slot before flipping the v3 pointer. Recovery distinguishes empty, migrated, loaded, recovered, corrupt, and storage-error outcomes as needed by the UI.

#### 3. Store and provider generalization

**Files**: `apps/mobile/src/features/personal-profile/profile-store.ts`, `apps/mobile/src/features/personal-profile/use-personal-profile.ts`; store tests

**Intent**: Make one app-wide last-saved aggregate authoritative for both editors and future result evaluation.

**Contract**: All lifecycle states carry the unified profile. Save snapshots the submitted candidate, promotes it only after repository success, preserves later draft edits at editor level, and keeps the old active profile on failure. Existing retry, restore, recovered/reset messaging, and corrupt replacement remain available. Expose combined active personal rules while retaining ingredient-only projection where current S-03 composition requires it.

#### 4. Migration and cross-section regression

**Files**: data/store integration tests

**Intent**: Prove neither editor or schema transition can erase the other rule family.

**Contract**: Tests round-trip mixed profiles, migrate representative v2 slots, preserve ingredient ancestry/custom IDs, save v3 after migration, recover backup slots, and verify ingredient-only saves retain nutrition rules and nutrition-only saves retain ingredient rules.

### Success Criteria

#### Automated Verification

- Codec tests prove strict v3 round-trip, deterministic v2 migration, ingredient preservation, and rejection of malformed/unknown documents.
- Repository failure-injection tests preserve pointer-last ordering, inactive-slot verification, v2 source data, backup recovery, and the last valid active profile.
- Store tests prove unified hydration, submitted-snapshot promotion, in-flight edit isolation, failed-save retry/restore, and combined active-rule exposure.
- Mixed-profile integration tests prove edits in either section preserve the other section across save and reload.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- On Android, a populated v2 ingredient profile upgrades without losing selections, then survives a v3 save and process restart with an empty nutrition section.
- A simulated nutrition save failure leaves the prior ingredient and nutrition profile active while keeping the attempted draft available for retry.

**Implementation Note**: Pause after real-device migration and failure checks; the editor must build on verified no-data-loss behavior.

---

## Phase 3: Nutrition Threshold Editor

### Overview

Deliver the complete shopper-facing threshold CRUD flow using the established profile lifecycle.

### Changes Required

#### 1. Profile summary and nutrition route

**Files**: `apps/mobile/src/features/personal-profile/personal-profile-screen.tsx`, `apps/mobile/src/app/_layout.tsx`; new `apps/mobile/src/app/profile-nutrition.tsx` and feature screen

**Intent**: Make nutrition rules discoverable alongside ingredient choices while keeping Home and scanning unchanged.

**Contract**: The profile overview adds a nutrition section and an action to `/profile-nutrition`. Saved rule summaries show nutrient label, direction, localized threshold with correct unit, and basis. The route file remains composition-only and uses the existing provider.

#### 2. Pure nutrition editor state

**Files**: new editor-state module under `apps/mobile/src/features/personal-profile/`; focused tests

**Intent**: Isolate draft mutations and validation from rendering.

**Contract**: State contains active snapshot, full-profile draft, raw threshold inputs, selection state, and field errors. Helpers add an unused nutrient, update direction/basis/value, remove immediately from the draft, reset to active, accept exactly a submitted snapshot, and compute dirty state deterministically. No direction or basis is silently defaulted.

#### 3. Add flow and editable rule cards

**Files**: new nutrition editor component under `apps/mobile/src/components/personal-profile/`; related presentation helpers

**Intent**: Let shoppers configure rules efficiently without exposing contradictory or ambiguous settings.

**Contract**: Add flow lists only unused nutrients. Each card provides labeled direction and basis radio groups, a decimal numeric input, inline `kcal`/`g`, an equality note, field-level errors, and immediate draft removal. Controls expose appropriate accessibility roles, selected/disabled state, labels/hints, and minimum touch targets.

#### 4. Save, restore, and navigation lifecycle

**Files**: nutrition feature screen/editor; reusable dirty-guard helper if extraction reduces duplication

**Intent**: Preserve the same truthful explicit-Save behavior users already have for ingredient edits.

**Contract**: Hydration blocks editing. Successful Save navigates back only after durable promotion. Save failure retains the draft with Retry/restore options. Back gestures and header actions prompt only when dirty. Removal requires no separate confirmation because restore and unsaved-discard are the recovery boundaries. Keyboard dismissal/scrolling must keep all controls reachable.

### Success Criteria

#### Automated Verification

- Editor-state tests prove add/edit/remove, unused-nutrient filtering, raw decimal handling, explicit direction/basis requirements, errors, dirty tracking, reset, and submitted-snapshot acceptance.
- Async-save regression tests prove changes made during an in-flight save remain dirty after the submitted snapshot succeeds.
- Presentation tests prove all eight labels, correct units, direction text, localized threshold formatting, and both basis summaries.
- Existing profile-store, ingredient-editor, ingredient-warning, lookup, scanner, decoder, and presentation suites remain passing.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- On Android, a shopper can add each nutrient, choose both directions and bases, enter comma/point decimals including zero, edit values, and remove rules without ambiguity.
- Save/reopen, dirty-back cancel/discard, restore, failed-save retry, keyboard/scroll behavior, long Polish labels, and empty/all-eight-rule states are usable.
- TalkBack announces nutrient, input purpose, unit, direction, basis, selection state, errors, removal, and save status in a sensible order; light and dark themes retain readable contrast.

**Implementation Note**: Pause for the complete Android editor acceptance pass before final evidence and handoff work.

---

## Phase 4: Cross-Boundary Verification and S-05 Handoff

### Overview

Prove the persisted configuration is durable, private, evaluator-ready, and regression-safe without implementing S-05 presentation.

### Changes Required

#### 1. Persisted profile-to-evaluator integration

**Files**: `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts`; domain/store integration tests

**Intent**: Verify the exact saved representation consumed by the next slice.

**Contract**: Round-trip a mixed profile through codec/repository/store and project it unchanged into `PersonalRule[]`. Cover all eight nutrients across the suite, both directions, both bases, zero/decimal values, stable IDs, v2 migration, removal, and preservation of ingredient rules. Evaluator regression proves equality is non-triggering and basis mismatch/missing values are unavailable, without adding result-screen behavior.

#### 2. MVP evidence and documentation

**Files**: `context/foundation/test-plan.md`, `apps/mobile/README.md`; targeted docs as needed

**Intent**: Make S-04 risks, profile schema behavior, privacy, and verification reproducible.

**Contract**: Add risk rows for threshold validation/duplicates, lossless migration, cross-section preservation, active/draft isolation, and evaluator projection. Document v3 local storage, loss on uninstall/clear data, no sync/API transmission, decimal input behavior, units/bases, and standard verification commands.

#### 3. Final regression and physical-device acceptance

**Files**: no production files unless verification exposes a scoped S-04 defect

**Intent**: Close configuration only after it coexists safely with ingredient editing and scanning.

**Contract**: Run all mobile and API regression gates. On Android, exercise clean install, v2 upgrade, mixed-profile saves from both editors, process restart, recovery/error paths, TalkBack, light/dark appearance, and Home-to-scan regression. Confirm no profile values leave the device and no nutrition warning UI or combined-count changes entered S-04.

### Success Criteria

#### Automated Verification

- Cross-boundary tests prove persisted v2/v3 profile → repository/store → exact ingredient and nutrition `PersonalRule[]` output.
- Evaluator regressions prove strict above/below comparison, equality non-triggering, and missing/basis-mismatch unavailability for persisted nutrition rules.
- Every new S-04 automated evidence reference in `context/foundation/test-plan.md` resolves to an existing passing test.
- Mobile quality gates pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- API regression tests pass offline: `cd services/api; .\mvnw.cmd test`.
- Scope checks find no server-side profile data, threshold transmission, medical claims, extra nutrients, cross-basis conversion, scan-result nutrition warnings, or combined-count changes.

#### Manual Verification

- Physical Android acceptance confirms migration, mixed-rule persistence, add/edit/remove, both directions/bases, decimal entry, restart, save failure/retry, corrupt recovery, dirty discard, and ingredient-editor preservation.
- TalkBack order/roles/error announcements and light/dark contrast pass for the nutrition editor and updated profile summary.
- Network inspection confirms profile ingredients and nutrition thresholds remain local, and existing barcode lookup/scanning remains usable.

**Implementation Note**: Pause for user confirmation of the S-04 acceptance evidence before implementation review and archive.

---

## Testing Strategy

### Unit Tests

- Canonical nutrient metadata, unique IDs, labels, units, directions, and bases.
- Whole-profile validation and one-rule-per-nutrient invariant.
- Locale-aware decimal parsing and deterministic formatting.
- Pure editor state, dirty tracking, validation errors, removal, reset, and save-snapshot behavior.
- Strict v3 codec and deterministic v2 migration.
- Store active/draft isolation and failure recovery.

### Integration Tests

- Valid v2 slots migrate to v3 without modifying or losing ingredient data.
- Mixed profiles round-trip through both storage slots and recovery paths.
- Ingredient-only and nutrition-only edits preserve the other rule family.
- Persisted profiles project into exact evaluator-compatible personal rules.
- Existing profile, warning, scanner, lookup, decoder, and product presentation suites protect prior slices.

### Manual Testing Steps

1. Upgrade a device containing a non-empty v2 ingredient profile and confirm every ingredient selection remains.
2. Open nutrition settings from the profile overview and verify the empty state and all eight Add choices.
3. Add rules using both directions, both bases, energy and gram units, zero, comma decimals, and point decimals.
4. Attempt blank, negative, non-finite, mixed-separator, grouped, and trailing-junk values and verify specific errors.
5. Edit and remove rules, cancel/confirm dirty navigation, restore saved values, and verify immediate removal remains draft-only.
6. Save, terminate, relaunch, and confirm the same mixed ingredient/nutrition profile.
7. Simulate save failure and corruption/recovery; confirm the old active profile remains authoritative and retry succeeds.
8. Edit ingredients after nutrition rules exist and verify thresholds remain unchanged; then perform the inverse check.
9. Traverse the editor and summary with TalkBack in light and dark themes, with the keyboard open and all eight rules present.
10. Scan a product and confirm existing ingredient behavior remains intact and no S-05 nutrition warning presentation appears.

## Performance Considerations

The catalogue is fixed at eight entries and the profile permits at most eight nutrition rules, so local array operations and full-profile serialization are bounded. Persist only on explicit Save. No remote queries, pagination, caching, or additional indexing are required.

## Security and Privacy Considerations

Thresholds remain in the existing local AsyncStorage profile and are not credentials, but they can reflect sensitive preferences. Do not log complete profiles, threshold values, corrupt raw documents, or send profile data to the API. UI wording must describe personal shopping rules rather than medical advice.

## Migration Notes

Schema v2 is a valid migration source, not a reset condition. Decode it strictly, construct v3 in memory with empty thresholds, and preserve v2 slots until an explicit verified v3 Save succeeds. Unknown or corrupt versions remain explicit errors. Rollback to a v2 application will ignore v3 keys and can still read preserved v2 data; do not delete legacy keys in this slice.

## References

- `context/foundation/prd-v3.md` — FR-003, FR-007, and personal-rule boundaries
- `context/foundation/roadmap.md` — S-04 outcome and S-05 handoff
- `context/foundation/test-plan.md` — existing profile and regression risk evidence
- `context/archive/2026-08-26-avoided-ingredient-profile/plan.md` — repository, store, editor, and explicit-Save architecture
- `context/archive/2026-08-31-ingredient-warning-scan/reviews/impl-review.md` — cross-boundary and evidence lessons
- `docs/reference/product-data-contract.md` — fixed nutrition catalogue, unit, basis, and unavailable semantics
- `apps/mobile/src/domain/personal-rules.ts` — existing nutrition evaluator contract
- `apps/mobile/src/data/personal-profile-codec.ts` — strict v2 persistence boundary
- `apps/mobile/src/data/personal-profile-repository.ts` — two-slot verified save protocol
- `apps/mobile/src/features/personal-profile/profile-store.ts` — active profile lifecycle
- `apps/mobile/src/features/personal-profile/personal-profile-screen.tsx` — profile overview and navigation entry
- `apps/mobile/src/components/personal-profile/profile-editor.tsx` — established editor and accessibility patterns

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Unified Profile Domain and Nutrition Validation

#### Automated

- [x] 1.1 Catalogue tests prove the exact eight nutrient IDs, labels, units, and canonical shared vocabulary. — c09f1c1
- [x] 1.2 Domain tests prove nutrition CRUD, uniqueness, stable identity/order, directions, bases, and whole-profile validation. — c09f1c1
- [x] 1.3 Parser tests accept finite non-negative comma/point decimals and reject every malformed input class. — c09f1c1
- [x] 1.4 Projection tests emit unchanged ingredient rules and evaluator-compatible nutrition rules. — c09f1c1
- [x] 1.5 Mobile lint, type checking, and tests pass. — c09f1c1

#### Manual

- [x] 1.6 Human approves Polish labels, units, directions, bases, equality guidance, and non-medical wording. — c09f1c1

### Phase 2: Lossless Persistence Migration and Profile State

#### Automated

- [x] 2.1 Codec tests prove strict v3 round-trip, deterministic v2 migration, preservation, and rejection behavior. — a917aa5
- [x] 2.2 Repository tests prove v3 pointer-last saves, v2 preservation, backup recovery, and failure safety. — a917aa5
- [x] 2.3 Store tests prove unified hydration, snapshot promotion, in-flight edit isolation, retry/restore, and active-rule exposure. — a917aa5
- [x] 2.4 Mixed-profile integration tests prove each editor preserves the other rule family. — a917aa5
- [x] 2.5 Mobile lint, type checking, and tests pass. — a917aa5

#### Manual

- [x] 2.6 Android v2-to-v3 migration preserves ingredients through explicit save and restart. — d6cea8b
- [x] 2.7 Simulated save failure preserves the active mixed profile and retryable draft. — d6cea8b

### Phase 3: Nutrition Threshold Editor

#### Automated

- [x] 3.1 Editor-state tests prove add/edit/remove, filtering, parsing, validation, dirty/reset, and submitted-snapshot behavior. — 46da12a
- [x] 3.2 Async-save regression tests keep post-submit edits dirty after save success. — 46da12a
- [x] 3.3 Presentation tests prove nutrient labels, units, directions, localized values, and bases. — 46da12a
- [x] 3.4 Existing profile, warning, lookup, scanner, decoder, and presentation suites remain passing. — 46da12a
- [x] 3.5 Mobile lint, type checking, and tests pass. — 46da12a

#### Manual

- [x] 3.6 Android threshold CRUD works for all nutrients, directions, bases, and accepted decimal formats. — 46da12a
- [x] 3.7 Save/reopen, dirty discard, restore, retry, keyboard, scrolling, and empty/full states are usable. — 46da12a
- [x] 3.8 TalkBack semantics/order and light/dark contrast are acceptable. — 46da12a

### Phase 4: Cross-Boundary Verification and S-05 Handoff

#### Automated

- [x] 4.1 Persisted v2/v3 mixed profiles produce exact evaluator-compatible personal rules.
- [x] 4.2 Evaluator regressions prove strict comparison, equality, missing-data, and basis-mismatch behavior.
- [x] 4.3 Every new S-04 automated test-plan reference resolves to a passing test.
- [x] 4.4 Mobile lint, type checking, and all tests pass.
- [x] 4.5 API regression tests pass offline.
- [x] 4.6 Scope checks exclude server profile data, medical claims, contract expansion, conversion, and S-05 presentation.

#### Manual

- [x] 4.7 Physical Android migration, mixed persistence, CRUD, restart, failure, recovery, and discard acceptance passes.
- [x] 4.8 TalkBack and light/dark acceptance passes for the editor and profile summary.
- [x] 4.9 Network/privacy and existing scan regression checks pass.
