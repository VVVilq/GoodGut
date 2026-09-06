# Basis-agnostic nutrition thresholds implementation plan

## Overview

Replace basis-specific saved nutrition rules with one numeric threshold per nutrient that applies to either `per_100g` or `per_100ml` product facts. Preserve the product’s reported basis for display, avoid density conversion, and migrate existing schema-v3 profiles without losing configured thresholds.

## Current State Analysis

`NutritionThreshold` and `NutritionRule` both require a basis, and `evaluatePersonalRules` marks a rule unavailable when its basis differs from the product fact. The combined warning composer and presentation expose that mismatch as incomplete analysis. The nutrition editor requires a basis radio choice, profile summaries include the basis, and the profile codec strictly reads and writes schema v3 threshold objects.

The API product contract already reports each fact’s actual basis and should remain unchanged. Existing saved-profile state preserves the active profile during saving and save failure, so the semantic change can remain on-device without changing the store lifecycle.

## Desired End State

A saved nutrient rule has one direction and numeric threshold. It evaluates available product facts regardless of whether the fact is reported per 100 g or per 100 ml, using strict comparisons and no conversion. Equality remains a non-trigger.

The editor shows one threshold control per nutrient plus a short explanation that the rule applies to either product basis. Results retain the product’s actual basis, and triggered details explain the comparison using that basis. Missing, invalid, unsupported-unit, and unknown-basis facts remain unavailable.

### Key Discoveries

- `apps/mobile/src/domain/personal-profile.ts:19-25, 108-121` defines and validates persisted thresholds.
- `apps/mobile/src/domain/personal-rules.ts:17-24, 151-177` defines rule shape and currently rejects basis mismatches.
- `apps/mobile/src/data/personal-profile-codec.ts:3-65` strictly encodes schema v3 and requires `basis` on every threshold.
- `apps/mobile/src/components/personal-profile/nutrition-profile-editor.tsx:67-77` renders the basis selector and threshold copy.
- `apps/mobile/src/features/product-lookup/presentation.ts:44,56-57` formats mismatch and basis-specific threshold details.
- `apps/mobile/src/features/personal-profile/nutrition-presentation.ts:9-12` includes basis in profile summaries.

## What We're NOT Doing

- No density, serving-size, or unit conversion.
- No API contract or server changes.
- No additional thresholds per nutrient or new nutrients.
- No changes to ingredient warning semantics, scan history, or profile storage location.
- No barcode keyboard or other unrelated cosmetic changes.

## Implementation Approach

Remove basis from the saved rule model while retaining basis on normalized product facts. Update the evaluator to compare any available fact with the saved threshold, then simplify composer and presentation unavailable handling. Migrate schema-v3 documents to schema v4 by dropping only the legacy basis field; preserve v2 migration behavior and all threshold values. Remove basis editing, add concise scope copy, and use the product fact’s actual basis in result explanations.

## Critical Implementation Details

### Migration and state sequencing

Decode schema v3 profiles by validating the legacy threshold shape, preserving nutrient, direction, and threshold, and discarding basis. Encode only schema v4. During saving and save failure, evaluation must continue using the active saved profile; candidate edits must not affect an existing result.

### User experience spec

The editor note must state that the threshold applies to values per 100 g or per 100 ml depending on the product data. Triggered result details must show the saved threshold and the product’s actual displayed basis. A basis mismatch must never appear as an unavailable reason after this change.

## Phase 1: Domain and persistence migration

### Overview

Change the saved/rule contracts, evaluator semantics, and profile codec while preserving strict comparison and migration safety.

### Changes Required

#### 1. Rule and profile contracts

**Files:** `apps/mobile/src/domain/personal-profile.ts`, `apps/mobile/src/domain/personal-rules.ts`, `apps/mobile/src/domain/personal-profile.ts` tests

**Intent:** Make basis-independent thresholds the canonical domain model.

**Contract:** Remove `basis` from `NutritionThreshold` and `NutritionRule`; remove basis validation and mismatch classification. Available facts compare by direction and raw numeric value. Unknown or unavailable facts remain unavailable.

#### 2. Persistence codec and migration

**File:** `apps/mobile/src/data/personal-profile-codec.ts`

**Intent:** Preserve existing user thresholds while moving persisted documents to the new model.

**Contract:** Write schema version 4 without threshold basis. Read schema v4 strictly. Read schema v3 and project each valid threshold to the v4 shape while dropping `basis`; retain existing v2 migration to an empty nutrition threshold list. Invalid legacy documents remain rejected.

#### 3. Domain and persistence tests

**Files:** `apps/mobile/src/domain/__tests__/personal-rules-test.ts`, `apps/mobile/src/domain/__tests__/personal-profile-test.ts`, `apps/mobile/src/data/__tests__/personal-profile-repository-test.ts`, `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts`

**Intent:** Prove both product bases, strict boundaries, unavailable facts, and migration behavior.

**Contract:** Cover above/below, equality, zero and decimal values for both product bases; unknown basis and unavailable reasons; v3-to-v4 preservation; v2 compatibility; and active-profile isolation during saving/save failure.

### Success Criteria

#### Automated Verification

- Domain evaluator and profile tests pass: `npm.cmd test -- --runTestsByPath src/domain/__tests__/personal-rules-test.ts src/domain/__tests__/personal-profile-test.ts` from `apps/mobile/`.
- Persistence tests pass: `npm.cmd test -- --runTestsByPath src/data/__tests__/personal-profile-repository-test.ts src/data/__tests__/personal-profile-integration-test.ts` from `apps/mobile/`.
- Mobile lint and typecheck pass: `npm.cmd run lint`, `npm.cmd run typecheck` from `apps/mobile/`.

#### Manual Verification

- Existing profiles load with their threshold values preserved after the schema migration.
- A saved threshold evaluates against both a gram-based and millilitre-based product without an incomplete result.

## Phase 2: Editor and result presentation

### Overview

Align profile editing, summaries, warning details, and component interactions with the basis-independent rule contract.

### Changes Required

#### 1. Nutrition editor and profile summaries

**Files:** `apps/mobile/src/components/personal-profile/nutrition-profile-editor.tsx`, `apps/mobile/src/features/personal-profile/nutrition-editor-state.ts`, `apps/mobile/src/features/personal-profile/nutrition-presentation.ts`, related tests

**Intent:** Remove the obsolete basis choice while making the new scope understandable.

**Contract:** Draft and submitted rules contain nutrient, direction, and threshold only. Remove basis controls and basis validation. Add the approved explanatory note near the threshold. Profile summaries omit a saved basis and describe the threshold generically.

#### 2. Composition and presentation

**Files:** `apps/mobile/src/features/product-lookup/personal-warning-composition.ts`, `apps/mobile/src/features/product-lookup/presentation.ts`, their tests

**Intent:** Stop treating a product basis difference as incomplete and retain clear actual-basis details.

**Contract:** Nutrition warnings evaluate across either product basis. Remove `basis_mismatch` unavailable results. Threshold detail includes direction, numeric threshold, nutrient unit, and the product fact’s actual basis. Other unavailable reasons remain unchanged.

#### 3. Result component interactions

**Files:** `apps/mobile/src/components/product-facts/product-result.tsx`, `apps/mobile/src/components/product-facts/__tests__/product-result-test.tsx`, presentation tests

**Intent:** Verify the visible result behavior after the semantic change.

**Contract:** Triggered rows show actual product basis and remain expandable; no mismatch disclosure appears. Existing warning styling, accessibility state, and disclosure reset behavior remain intact.

### Success Criteria

#### Automated Verification

- Editor and presentation tests pass, including removal of basis controls and updated copy.
- Component interaction tests pass for trigger details, no mismatch reason, ordinary rows, and disclosure reset.
- Mobile lint, typecheck, and full Jest suite pass from `apps/mobile/`.

#### Manual Verification

- Configure one threshold without selecting a basis, scan both solid and liquid examples, and confirm the same rule evaluates normally.
- Confirm the result displays the product’s actual `/100 g` or `/100 ml` basis and no false incomplete warning.

## Phase 3: Integration and fixture acceptance

### Overview

Exercise migration, editor-to-result flow, both product bases, and deterministic Android acceptance using the existing fixture-server pattern.

### Changes Required

#### 1. Integration and fixture scenarios

**Files:** `apps/mobile/src/features/product-lookup/__tests__/personal-warning-integration-test.ts`, `scripts/fixtures/nutrition-warning-scan/`, `scripts/nutrition-warning-fixture-server.mjs`, `context/changes/basis-agnostic-nutrition-thresholds/verification.md`

**Intent:** Make the new cross-basis behavior reproducible through decoding, saved-profile projection, composition, and presentation.

**Contract:** Cover at least one solid and one liquid found fixture, equality, above/below strict boundaries, unavailable and unknown-basis facts, v3 profile migration, and saved-threshold edits without a new lookup. The fixture server remains development-only, serves only documented GET product routes, and returns contract not-found for unknown barcodes.

#### 2. Documentation and risk mapping

**Files:** `apps/mobile/README.md`, `context/foundation/test-plan.md`

**Intent:** Document the new fixture setup and connect cross-basis evaluation to the existing S-05 risks without rewriting historical entries.

**Contract:** State the fixture startup command, expected cross-basis outcomes, restoration steps, and automated/manual evidence locations.

### Success Criteria

#### Automated Verification

- Focused integration and migration tests pass.
- Mobile lint, typecheck, and full Jest suite pass.
- API regression gate passes: `.\mvnw.cmd test` from `services/api/`.
- Fixture server returns both basis fixtures and the contract not-found fallback; startup, request, and shutdown evidence is recorded.

#### Manual Verification

- Android fixture checks confirm one threshold triggers correctly on both `/100 g` and `/100 ml` products, including equality and unavailable facts.
- Android confirms editor copy, result basis display, warning expansion, save/relaunch persistence, and no incomplete status caused solely by basis.

**Implementation Note:** After automated checks pass, pause for human Android confirmation before marking manual progress complete.

## Testing Strategy

### Unit Tests

- Compare one rule against available gram and millilitre facts for both directions and equality.
- Preserve unavailable handling for missing, invalid, unsupported-unit, and unknown-basis facts.
- Decode and migrate schema-v3 profiles without losing threshold values.

### Integration Tests

- Load a shared solid and liquid fixture through the decoder and evaluate the same saved profile.
- Verify presentation changes from incomplete/mismatch to evaluated/triggered or evaluated/non-triggered as appropriate.
- Verify saving and save-error states continue to use the active saved profile.

### Manual Testing Steps

1. Start the fixture server and point Expo at its LAN address.
2. Configure one nutrient threshold without a basis choice.
3. Scan solid and liquid fixture barcodes and verify actual basis display and warning behavior.
4. Test equality and unavailable facts, then save, relaunch, and rescan.
5. Restore the normal API URL and record device evidence.

## Performance Considerations

Evaluation remains an on-device pass over at most eight nutrition rules. Removing a basis comparison does not add network requests or conversion work.

## Migration Notes

Schema v3 profiles migrate to schema v4 by dropping only the threshold basis. Threshold values, nutrients, directions, ingredient selections, and custom ingredients remain intact. The migration is reversible at the code level; v4 documents require the updated app and are not written with the removed field.

## Open Risks & Assumptions

- Applying the same numeric threshold to grams and millilitres is a product decision and intentionally does not claim physical equivalence.
- Unknown product basis remains unavailable to avoid comparing an unqualified value.
- Old v3 documents must be tested with malformed and duplicate threshold entries so migration does not weaken validation.
- Barcode keyboard behavior is tracked separately from this semantic change.

## References

- `apps/mobile/src/domain/personal-profile.ts`
- `apps/mobile/src/domain/personal-rules.ts`
- `apps/mobile/src/data/personal-profile-codec.ts`
- `apps/mobile/src/features/product-lookup/personal-warning-composition.ts`
- `apps/mobile/src/features/product-lookup/presentation.ts`
- `apps/mobile/src/components/personal-profile/nutrition-profile-editor.tsx`
- `context/changes/nutrition-warning-scan/verification.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append a commit SHA when a step lands. Do not rename step titles.

### Phase 1: Domain and persistence migration

#### Automated

- [x] 1.1 Domain evaluator and profile tests pass for both product bases, strict boundaries, equality, and unavailable facts. — 8eebd39
- [x] 1.2 Schema-v3 to v4 migration and v2 compatibility tests pass. — 8eebd39
- [x] 1.3 Mobile lint and typecheck pass. — 8eebd39

#### Manual

- [x] 1.4 Existing profiles load with threshold values preserved after migration. — 8eebd39
- [x] 1.5 One threshold evaluates against both product bases without incomplete status. — 8eebd39

### Phase 2: Editor and result presentation

#### Automated

- [x] 2.1 Editor, composition, presentation, and component interaction tests pass with no basis selector or mismatch disclosure. — 717c9a9
- [x] 2.2 Mobile lint, typecheck, and full Jest suite pass. — 717c9a9

#### Manual

- [x] 2.3 Solid and liquid scans show the same threshold behavior and actual product basis. — 717c9a9

### Phase 3: Integration and fixture acceptance

#### Automated

- [x] 3.1 Integration and migration scenarios pass through decoder, saved profile, composition, and presentation. — 6126c45
- [x] 3.2 Mobile lint, typecheck, and full Jest suite pass. — 6126c45
- [x] 3.3 API regression gate passes. — 6126c45
- [x] 3.4 Fixture server returns documented cross-basis responses and not-found fallback with lifecycle evidence. — 6126c45

#### Manual

- [x] 3.5 Android fixture checks confirm cross-basis triggers, equality, and unavailable facts. — 6126c45
- [x] 3.6 Android confirms editor/result copy, warning disclosures, persistence, and no false incomplete status. — 6126c45

