<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Partial ingredient display

- **Plan**: context/changes/partial-ingredient-display/plan.md
- **Scope**: All 5 phases
- **Date**: 2026-09-05
- **Verdict**: APPROVED (after triage)
- **Findings**: 0 critical, 0 outstanding warnings, 0 outstanding observations

## Verdicts

| Dimension | Verdict |
|---|---|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Grounding

Implementation commits reviewed: `2f73c7f..e0b1efe`. API full Maven tests, mobile typecheck, 18 mobile Jest suites (155 tests), mobile lint, and `git diff --check` pass. Planned files `OpenFoodFactsResponse.java` and `IngredientCatalogueRepository.java` were not changed; the implemented behavior did not require edits there.

## Findings

### F1 — Source text normalization drifts from the approved fallback contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: services/api/src/main/java/com/example/goodgut_server/product/source/openfoodfacts/OpenFoodFactsProductMapper.java:167-183
- **Detail**: The plan says nonblank source text is displayed trimmed as-is, but the mapper removes every underscore with `text.replace("_", "")`. The ID fallback normalizes separators but does not apply the planned title-casing rule. This can alter legitimate source text and leaves fallback output inconsistent.
- **Fix**: Separate source-text cleanup from ID fallback: trim source text and remove only the surrounding Open Food Facts allergen markers; apply locale stripping, separator normalization, whitespace collapsing, and title-casing only to ID-derived names. Add exact regression cases.
- **Decision**: FIXED — rozdzielono czyszczenie markerów allergenów od fallbacku ID i dodano regresję tekstu/ID.

### F2 — Name-based warning projection can mislabel duplicate items

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: apps/mobile/src/features/product-lookup/presentation.ts:142-170
- **Detail**: Presentation builds a `Set` of matched display names. If a recognized item matches a taxonomy rule and an unrecognized duplicate has the same text, both positions render red. That violates the intended recognition boundary for the unresolved duplicate.
- **Fix A ⭐ Recommended**: Carry matched item indexes (or stable source positions) from evaluation/composition into presentation and apply warning state per item occurrence.
  - Strength: Preserves duplicate source positions and the taxonomy/custom distinction exactly.
  - Tradeoff: Extends the internal warning presentation shape and its tests.
  - Confidence: HIGH — index/order is already preserved in the item list.
  - Blind spot: No stable source ID exists in the unrecognized wire member, so index is the practical identity.
- **Fix B**: Explicitly accept same-name duplicates as jointly warned and document this as a presentation rule.
  - Strength: Minimal code change.
  - Tradeoff: Unrecognized duplicates can look like confirmed taxonomy warnings.
  - Confidence: LOW — conflicts with the approved recognition semantics.
  - Blind spot: User interpretation of duplicate labels is unverified.
- **Decision**: FIXED via Fix B — zaakceptowano wspólne oznaczanie identycznych duplikatów i udokumentowano tę regułę w kontrakcie prezentacji.

### F3 — Decoder does not enforce the schema’s non-empty available list

- **Severity**: ⚠️ WARNING
- **Impact**: 🟡 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/mobile/src/domain/product-lookup/decoder.ts:127
- **Detail**: The 3.0 schema requires `items.minItems: 1`, but the decoder only validates that `items` is an array and accepts `[]`. The API currently never emits an empty list, yet the client boundary is not strict against malformed responses.
- **Fix**: Reject empty available ingredient arrays with a `minItems` check and add a decoder regression test.
- **Decision**: FIXED — decoder odrzuca puste listy i ma test regresyjny.

### F4 — Domain model accepts non-canonical taxonomy IDs

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🟢 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: services/api/src/main/java/com/example/goodgut_server/product/domain/ProductIngredientItem.java:18-24
- **Detail**: The domain invariant checks recognition/nullability but does not validate canonical `ll:value` taxonomy ID syntax for recognized items. The mapper/classifier and JSON schema currently provide that guarantee, so this is defense-in-depth rather than an observed defect.
- **Fix**: Add the same canonical ID validation to the recognized domain factory/constructor, or document that validation belongs exclusively at the mapper/schema boundary.
- **Decision**: FIXED — model domenowy waliduje canonical format `ll:value` dla node ID i ancestry.
