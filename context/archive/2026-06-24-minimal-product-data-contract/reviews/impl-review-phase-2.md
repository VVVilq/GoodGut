<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Minimal Product Data Contract Implementation Plan

- **Plan**: `context/changes/minimal-product-data-contract/plan.md`
- **Scope**: Phase 2 of 3
- **Date**: 2026-08-17
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Unsafe ambiguity in negative gluten evidence

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `docs/reference/product-data-contract.md:129`
- **Detail**: The contract permits `glutenEvidence: absent` when source evidence is "explicit enough," but it does not define an acceptable affirmative signal of absence. Lines 154 and 165 then allow that value to make celiac analysis ready without requiring the fixture to exercise the boundary between explicit absence and missing or incomplete source data. An implementation could therefore interpret absent tags or silence in ingredient text as evidence that gluten is absent.
- **Fix**: Define `absent` narrowly from an explicit, authoritative negative signal (for example, a verified gluten-free claim or certification); map silence, incomplete tags, and lack of mention to `unknown`; and make the fixture's polarity and expected normalized outcome explicit.
  - Strength: Prevents incomplete Open Food Facts data from becoming an affirmative health-related absence claim while preserving the existing three-state contract.
  - Tradeoff: More products will remain `unknown` until the source supplies an explicit negative signal, reducing celiac-analysis availability.
  - Confidence: HIGH — the current wording provides no implementable threshold and the plan explicitly requires no judgment when evidence is insufficient.
  - Blind spot: The exact Open Food Facts fields accepted as authoritative must be validated when the adapter is implemented.
- **Decision**: FIXED — defined the evidence threshold for `absent`, required unsafe silence to map to `unknown`, and clarified the fixture's expected output.

### F2 — Manual Phase 2 confirmation has no recorded evidence

- **Severity**: 👁️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `context/changes/minimal-product-data-contract/plan.md:263`
- **Detail**: Progress marks the human confirmation that the six fixtures unblock the later slices as complete, but neither the plan nor the associated change metadata records who confirmed it or what evidence supported the confirmation. The implementation commit alone cannot establish that a human review occurred.
- **Fix**: Add a short confirmation note beside the progress item or in the change record identifying the confirmation and its basis.
- **Decision**: FIXED — recorded the confirmation basis in the Phase 2 progress item.

## Verification Evidence

- Phase 2.1: PASS — the recorded-fixture section contains exactly six numbered scenarios.
- Phase 2.2: PASS — both `services/api/src/test/resources/fixtures/openfoodfacts/raw/` and `services/api/src/test/resources/fixtures/openfoodfacts/normalized/` are defined.
- Phase 2.3: PASS — automated tests are required to use recorded fixtures and live API checks are restricted to manual smoke checks.
- Phase 2.4: WARNING — checked complete, but no observable confirmation evidence is recorded.
