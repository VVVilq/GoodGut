# Partial Ingredient Display Implementation Plan

## Overview

Keep structured ingredient leaves visible when the local taxonomy cannot classify them. Recognized items retain taxonomy evidence; unrecognized items are explicit, shown in yellow on mobile, and remain eligible for exact custom-ingredient rules.

## Current State Analysis

OpenFoodFactsProductMapper recursively collects trusted leaves, classifies them, drops classifier misses, and returns unparseable when no classified item remains. ProductIngredientItem, the JSON schemas, and the mobile decoder require taxonomy identifiers for every item. Mobile cannot therefore distinguish a partial list from a completely unreadable list.

The evaluator already treats partial evidence as uncertain for unmatched taxonomy rules, while custom rules compare exact display names. The change must preserve source order and duplicates for presentation without allowing taxonomy-only rules to use unrecognized evidence.

## Desired End State

Contract 3.0 responses carry an ordered ingredient list with items explicitly recognized or unrecognized. A structured list with at least one displayable leaf is available/partial when any item is uncertain, including when the catalogue is unavailable. Raw text without a structured displayable list remains unparseable and absent evidence remains missing.

Mobile shows every available item in source order. Recognized items render normally, recognized taxonomy matches render red, and unrecognized items render yellow with an accessible textual status. An exact case-insensitive custom rule may match either status; red matching takes visual precedence over yellow uncertainty. No fuzzy matching, translation, or S-05 nutrition behavior is added.

### Key Discoveries

- OpenFoodFactsProductMapper.java:105-136 drops classifier misses and converts an all-miss structured list to unparseable.
- ProductIngredientItem.java:7-12 requires taxonomy evidence for every item.
- mobile decoder.ts:109-149 strictly decodes contract 2.0 and rejects items without canonical taxonomy IDs.
- personal-rules.ts:99-119 separates taxonomy matching from exact custom-name matching.
- product-result.tsx:96-107 already renders per-item red warning state and accessibility labels.
- product-data-contract.md:18-20 requires a contract-version change when required fields or availability semantics change.

## What We're NOT Doing

- No fuzzy matching, translation, arbitrary raw-prose splitting, or invented taxonomy ancestry.
- No new taxonomy edges, catalogue import behavior, or server-side profile storage.
- No change to nutrition thresholds, nutrition warnings, combined counts, or other S-05 presentation.
- No raw Open Food Facts JSON exposed to mobile.
- No deduplication of structured source leaves; repeated entries and source order are intentional.

## Implementation Approach

Version the normalized product contract to 3.0 and model ingredient items as a discriminated union. The backend retains displayable structured leaves and attaches taxonomy evidence only when classification succeeds. The mobile decoder validates the union strictly, presentation consumes all items, and evaluator adapters use taxonomy evidence only for taxonomy rules while allowing exact custom-name matching against displayed text.

## Critical Implementation Details

Classification is evidence, not extraction. Preserve a leaf before classification, then mark it unrecognized if the active catalogue cannot resolve it. Taxonomy rules inspect only recognized evidence; a user-authored exact custom name may compare against either status. The 3.0 rollout must update API and mobile together because both reject unknown contract versions.

## Phase 1: Contract 3.0 and Fixture Model

### Overview

Define the wire-level item union and update normative schemas and representative offline data.

### Changes Required

#### 1. Product contract and schemas

Files: docs/reference/product-data-contract.md, docs/reference/schemas/product-lookup.schema.json, docs/reference/schemas/normalized-product.schema.json, and the three product lookup response constructors.

Intent: Make recognition status explicit and version the changed availability semantics.

Contract: Contract version is 3.0. Recognized items contain recognition, displayName, nodeId, and ancestorNodeIds. Unrecognized items contain recognition and displayName only. catalogueVersion is nullable when no item was recognized. available/partial permits all-unrecognized displayable lists.

#### 2. Fixtures and contract tests

Files: API raw/normalized fixtures, manifest.json, ProductContractFixturesTests, and IngredientWarningBoundaryTests.

Intent: Make mixed, duplicate, all-unrecognized, missing, and raw-only cases reproducible offline.

Contract: Every fixture and manifest entry declares 3.0; synthetic mixed fixtures preserve order and duplicate leaves. Add the Majonez snapshot only with recorded source metadata and attribution.

### Success Criteria

#### Automated Verification

- Canonical schemas validate recognized, unrecognized, mixed, duplicate, all-unrecognized, raw-only, and missing examples.
- Contract fixture and boundary tests pass offline and reject malformed union members or unknown contract versions.

#### Manual Verification

- Review the 3.0 JSON examples for clear recognition semantics and absence of raw source leakage.

## Phase 2: Backend Preservation and Mapping

### Overview

Retain displayable leaves through classification and serialize recognition status without weakening the source trust boundary.

### Changes Required

#### 1. Domain item model

Files: ProductIngredientItem.java and ProductIngredients.java.

Intent: Represent display text independently from optional taxonomy evidence.

Contract: Domain records enforce the recognized/unrecognized invariant, copy lists defensively, allow nullable catalogue version only for available lists, and preserve item order and duplicates.

#### 2. Open Food Facts mapper

Files: OpenFoodFactsProductMapper.java, OpenFoodFactsResponse.java, and IngredientCatalogueRepository.java.

Intent: Keep every displayable structured leaf while retaining conservative classification.

Contract: Traverse nested children before rejecting an uncertain parent; a node with non-blank `text` is displayable using trimmed text as-is, otherwise a leaf with an ID is displayable using a deterministic fallback that strips a leading locale namespace (`en:`, `pl:`, etc.), replaces `_` and `-` with spaces, collapses whitespace, and title-cases only when the source text is absent. Container parents are never emitted when they have displayable children; a parent is emitted only when it is itself a leaf. Recognized items carry returned ancestry. Do not deduplicate leaves. If no displayable leaf exists, preserve unparseable; otherwise use available/complete only when every leaf is recognized and available/partial for any uncertainty or missing catalogue.

#### 3. Mapper and controller regressions

Files: OpenFoodFactsProductMapperTests.java and ProductLookupControllerTests.java.

Intent: Protect nested order, duplicate retention, underscore cleanup, unknown text/ID fallback, catalogue outage, and all-unrecognized behavior.

Contract: Tests cover mixed recognized/unrecognized leaves, repeated node IDs with distinct source text, no active release, raw-only text, missing evidence, and a deterministic Majonez-shaped payload.

### Success Criteria

#### Automated Verification

- API mapper, controller, fixture, and full Maven tests pass offline.
- Tests prove unresolved leaves never acquire fabricated taxonomy ancestry or node IDs.

#### Manual Verification

- Inspect representative serialized 3.0 responses and confirm order, duplicates, and display fallback are understandable.

## Phase 3: Mobile Boundary and Rule Evaluation

### Overview

Decode contract 3.0 strictly and keep evaluator behavior intentional for taxonomy and custom rules.

### Changes Required

#### 1. Types and decoder

Files: mobile product-lookup types.ts, decoder.ts, goodgut-api.ts, and related tests.

Intent: Accept only the new explicit wire shape and keep malformed responses as client errors.

Contract: Decoder accepts only contractVersion 3.0, validates the item union, preserves order and duplicates, derives presentation names from all items, and exposes nullable catalogue version for available all-unrecognized lists.

#### 2. Personal rule evaluation

Files: personal-rules.ts, ingredient-warning-composition.ts, and domain/composition tests.

Intent: Ensure recognition status controls taxonomy evidence without disabling exact custom ingredients.

Contract: Taxonomy rules inspect only recognized items and ancestors. Custom rules use case-insensitive exact display-name comparison over all available items, including unrecognized ones. Partial unmatched rules remain unavailable; exact custom matches may trigger.

### Success Criteria

#### Automated Verification

- Decoder tests cover 3.0 strictness, union validation, order, duplicates, nullable catalogue version, and unknown-version rejection.
- Rule tests prove recognized taxonomy matches, unrecognized taxonomy non-matches, exact custom matches for both statuses, partial unavailable rules, and no fuzzy or substring matches.
- Mobile lint, typecheck, and all tests pass.

#### Manual Verification

- Review accessibility labels and debug output to confirm unrecognized items never appear as taxonomy evidence.

## Phase 4: Yellow/Red Presentation

### Overview

Show all available ingredient items while communicating uncertainty and retaining existing red warning semantics.

### Changes Required

#### 1. Presentation model

Files: presentation.ts and presentation tests.

Intent: Replace the boolean-only item state with ordered visual semantics.

Contract: Each displayed item has text plus a visual state where red matched warning takes precedence over yellow unrecognized uncertainty; normal recognized items remain neutral. Matching is by normalized display text, so duplicate occurrences with identical text intentionally share the warning state. Partial evidence produces a concise Polish summary above the list.

#### 2. Product result and theme

Files: product-result.tsx and theme.ts.

Intent: Render the yellow state and communicate it beyond color alone.

Contract: Yellow styling uses semantic light/dark theme tokens and a textual or icon cue such as Nierozpoznany składnik; accessibility labels announce the state. Existing red warning styling and counts remain unchanged and win when a custom rule matches an unrecognized item.

### Success Criteria

#### Automated Verification

- Presentation tests prove source order, duplicate retention, neutral recognized items, yellow unresolved items, red precedence, and partial summary text.
- Existing product lookup, warning, decoder, and scan tests remain passing.

#### Manual Verification

- On Android, scan a mixed product and verify every item remains visible, unresolved items are yellow, exact custom matches are red, and the partial-data explanation is clear.
- TalkBack announces recognized, unrecognized, and red-warning states; light/dark themes retain readable contrast.

## Phase 5: Cross-Boundary Acceptance and Documentation

### Overview

Prove the complete API-to-mobile behavior with deterministic fixtures, the Majonez regression, and privacy/scope checks.

### Changes Required

#### 1. Integration evidence and docs

Files: goodgut-api-test.ts, a product-lookup integration test if needed, context/foundation/test-plan.md, and apps/mobile/README.md.

Intent: Document the new contract and make the exact behavior repeatable.

Contract: Evidence covers producer to decoder to evaluator to presentation for mixed, all-unrecognized, raw-only, and missing lists, including barcode 5900242001610 when fixture provenance is available. Documentation states profile data stays local and unrecognized source text is informational unless an exact custom rule matches it.

#### 2. Scope and regression gates

Files: no additional production files unless a scoped defect appears.

Intent: Close the change without nutrition/S-05 behavior or server profile data.

Contract: Run API offline tests, mobile lint/typecheck/tests, schema validation, and physical Android scan/privacy checks. Confirm existing complete lists, ingredient warnings, retry/rescan, and product facts remain usable.

### Success Criteria

#### Automated Verification

- All API and mobile automated gates pass offline.
- Every new test-plan reference resolves to a passing test.
- Scope checks find no profile transmission, medical claim, fuzzy matching, raw-prose parsing, nutrition warning, or combined-count change.

#### Manual Verification

- Physical Android checks pass for Majonez, mixed/all-unrecognized states, exact custom match red precedence, TalkBack, light/dark themes, and existing scan regression.

## Testing Strategy

### Unit Tests

- Strict 3.0 union validation.
- Mapper leaf retention, order, duplicates, fallback names, and partial/unparseable boundaries.
- Taxonomy versus custom evaluator behavior for recognized and unrecognized items.
- Presentation precedence, Polish copy, accessibility labels, and theme tokens.

### Integration Tests

- Offline API response through mobile decoder, rule evaluation, and presentation.
- Majonez-shaped mixed fixture and existing complete, partial, raw-only, and missing fixtures.

### Manual Testing Steps

1. Scan 5900242001610 and confirm the complete available ordered list is shown.
2. Confirm unresolved items use yellow text and the partial-list explanation appears.
3. Configure an exact custom ingredient matching an unresolved item and confirm red warning precedence.
4. Confirm taxonomy rules do not match unresolved items and fuzzy or substring matches do not trigger.
5. Check complete, all-unrecognized, raw-only, and missing ingredient states.
6. Verify TalkBack, light/dark contrast, retry/rescan, and no profile data in network requests.

## Performance Considerations

Structured ingredient lists are bounded by the source payload. Classify unique IDs in one batch, but do not deduplicate the emitted presentation list. No new remote requests are required.

## Migration Notes

This is a coordinated wire-contract 3.0 release. Mobile rejects 2.0 and other versions explicitly; API and mobile deploy together. No persisted profile migration is needed. Rollback uses the previous API/mobile pair; mixed versions are not silently accepted.

## References

- docs/reference/product-data-contract.md
- docs/reference/schemas/product-lookup.schema.json
- docs/reference/schemas/normalized-product.schema.json
- services/api/src/main/java/com/example/goodgut_server/product/source/openfoodfacts/OpenFoodFactsProductMapper.java
- apps/mobile/src/domain/product-lookup/decoder.ts
- apps/mobile/src/domain/personal-rules.ts
- apps/mobile/src/components/product-facts/product-result.tsx
- context/foundation/prd-v3.md

## Progress

> Convention: [ ] pending, [x] done. Append commit SHA when a step lands. Do not rename step titles.

### Phase 1: Contract 3.0 and Fixture Model

#### Automated

- [x] 1.1 Canonical schemas validate recognized, unrecognized, mixed, duplicate, all-unrecognized, raw-only, and missing examples. — 2f73c7f
- [x] 1.2 Contract fixture and boundary tests pass offline and reject malformed union members or unknown contract versions. — 2f73c7f

#### Manual

- [ ] 1.3 Human review approves 3.0 examples, recognition semantics, and absence of raw source leakage.

### Phase 2: Backend Preservation and Mapping

#### Automated

- [x] 2.1 API mapper, controller, fixture, and full Maven tests pass offline.
- [x] 2.2 Tests prove unresolved leaves never acquire fabricated taxonomy ancestry or node IDs.

#### Manual

- [x] 2.3 Representative serialized 3.0 responses preserve source order, duplicates, and understandable display fallback. — 8a09bc4

### Phase 3: Mobile Boundary and Rule Evaluation

#### Automated

- [x] 3.1 Decoder tests cover 3.0 strictness, union validation, order, duplicates, nullable catalogue version, and unknown-version rejection. — a1ca56e
- [x] 3.2 Rule tests prove recognized taxonomy matches, unrecognized taxonomy non-matches, exact custom matches for both statuses, partial unavailable rules, and no fuzzy or substring matches. — a1ca56e
- [x] 3.3 Mobile lint, typecheck, and all tests pass. — a1ca56e

#### Manual

- [x] 3.4 Review accessibility labels and debug output for recognition boundaries. — a1ca56e

### Phase 4: Yellow/Red Presentation

#### Automated

- [x] 4.1 Presentation tests prove source order, duplicate retention, neutral recognized items, yellow unresolved items, red precedence, and partial summary text. — 59289c9
- [x] 4.2 Existing product lookup, warning, decoder, and scan tests remain passing. — 59289c9

#### Manual

- [x] 4.3 Android mixed-product scan shows every item, yellow uncertainty, red custom match precedence, and clear explanation. — 59289c9
- [x] 4.4 TalkBack and light/dark acceptance passes for all ingredient states. — 59289c9

### Phase 5: Cross-Boundary Acceptance and Documentation

#### Automated

- [x] 5.1 All API and mobile automated gates pass offline. — 5e431d7
- [x] 5.2 Every new test-plan reference resolves to a passing test. — 5e431d7
- [x] 5.3 Scope checks exclude profile transmission, medical claims, fuzzy matching, raw-prose parsing, nutrition warnings, and combined-count changes. — 5e431d7

#### Manual

- [x] 5.4 Physical Android Majonez, mixed/all-unrecognized, custom-match, privacy, and existing-scan acceptance passes. — 5e431d7
