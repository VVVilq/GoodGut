<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Personal Rules Product Contract Implementation Plan

- **Plan**: `context/changes/personal-rules-product-contract/plan.md`
- **Scope**: Phases 1–3 of 3
- **Date**: 2026-08-19
- **Verdict**: APPROVED
- **Findings**: 0 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Verification Evidence

- API: `.\mvnw.cmd test` — PASS, 5 tests.
- Mobile: `npm.cmd run lint; npm.cmd run typecheck; npm.cmd test` — PASS, 13 tests.
- Canonical lookup schema accepts all three examples — PASS in review-time validation.
- Normative disease-field search — PASS.
- Production scope search — PASS; no endpoint, source client, scanner, persistence, or disease analysis added.
- All five manual items are checked in the canonical Progress section; the conversation records explicit human confirmation.

## Findings

### F1 — Fixture basis evidence contradicts the no-inference contract

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: `docs/reference/product-data-contract.md:96`, `services/api/src/test/resources/fixtures/openfoodfacts/raw/solid-nutella.json:1`, `services/api/src/test/resources/fixtures/openfoodfacts/raw/sparse-mamma-mia.json:1`, `services/api/src/test/resources/fixtures/openfoodfacts/raw/liquid-coca-cola.json:1`
- **Detail**: The normative rule requires explicit `product_quantity_unit` evidence before selecting `per_100g` or `per_100ml`. Nutella and Mamma Mia lack that evidence but their normalized nutrients are available as `per_100g`. Coca-Cola contains `product_quantity_unit`, but its recorded request's `fields=` list did not request that field and it was injected into the supposedly immutable snapshot in a later commit. The fixture proof therefore performs or obscures the exact basis inference the contract prohibits.
- **Fix A ⭐ Recommended**: Refresh the recorded found snapshots with `product_quantity` and `product_quantity_unit` explicitly requested, then retain available nutrients only where the returned response supplies trusted basis evidence.
  - Strength: Preserves representative available facts and makes provenance match the documented S-01 mapping rule.
  - Tradeoff: Requires manual source refresh and review; mutable Open Food Facts records may now differ.
  - Confidence: HIGH — it directly aligns request fields, raw evidence, normalized output, and the normative rule.
  - Blind spot: Open Food Facts may still omit or return ambiguous quantity units for some products.
- **Fix B**: Keep existing snapshots but mark affected nutrients `unavailable` with `unknown_basis` wherever explicit unit evidence is absent, and remove any unrequested raw fields.
  - Strength: Fully conservative and requires no new live-source dependency.
  - Tradeoff: Weakens representative nutrition coverage and may require replacement fixtures to retain the capability matrix.
  - Confidence: HIGH — it follows the current missing-data invariant exactly.
  - Blind spot: Does not prove that real source records can support available per-100g/per-100ml facts.
- **Decision**: FIXED via Fix A — refreshed request field selections, preserved available bases only with explicit returned units, and added a basis-evidence regression test.

### F2 — Normalized response replaces the scanned barcode

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff or non-trivial edit; think before deciding
- **Dimension**: Safety & Quality
- **Location**: `services/api/src/test/resources/fixtures/openfoodfacts/raw/sparse-mamma-mia.json:1`, `services/api/src/test/resources/fixtures/openfoodfacts/normalized/sparse-mamma-mia.json:1`
- **Detail**: The raw capture records requested barcode `0000000001008`, while Open Food Facts normalizes it to `00001008` and the GoodGut response exposes the shortened provider code. The contract says `barcode` is the scanned value; changing it can break response correlation, cache keys, and later scan flows.
- **Fix**: Preserve `0000000001008` as the normalized GoodGut `barcode`; keep the provider-normalized code only in raw provenance unless a separately versioned source field is intentionally added.
  - Strength: Restores the documented public meaning and stable request/response correlation.
  - Tradeoff: Requires updating the normalized fixture and manifest barcode, plus a regression assertion.
  - Confidence: HIGH — both requested and provider-normalized values are already present in the raw snapshot.
  - Blind spot: None significant.
- **Decision**: FIXED — preserved the requested barcode in normalized output and manifest while retaining the provider-normalized code in raw provenance; added regression assertions.

### F3 — Contract tests trust capability labels instead of fixture evidence

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff or non-trivial edit; think before deciding
- **Dimension**: Success Criteria
- **Location**: `services/api/src/test/java/com/example/goodgut_server/productcontract/ProductContractFixturesTests.java:57`
- **Detail**: Pairing tests compare basenames and capability tests only collect self-declared manifest strings. They do not verify raw capture metadata, barcode agreement, explicit basis evidence, provenance kind, or that manifest capabilities match normalized content. Consequently F1 and F2 pass the suite even though the plan says the inventory should prevent silent capability loss and invented facts.
- **Fix**: Add raw/normalized cross-fixture assertions for capture metadata, scanned barcode preservation, explicit basis evidence for available nutrients, and derived capability agreement.
  - Strength: Converts the plan's load-bearing semantic invariants into durable offline checks.
  - Tradeoff: Adds fixture-test complexity and requires carefully distinguishing recorded responses from deterministic transport scenarios.
  - Confidence: HIGH — the fixture envelope and discriminated normalized outcomes already provide the required inputs.
  - Blind spot: Raw-to-normalized mapper behavior remains deferred to S-01; tests should enforce invariants without duplicating the future mapper.
- **Decision**: FIXED — derive capabilities from normalized facts, require exact manifest agreement, and validate provenance shapes for recorded responses, 404 captures, and transport scenarios.

### F4 — Ingredient matching depends on device locale

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `apps/mobile/src/domain/personal-rules.ts:63`
- **Detail**: `toLocaleLowerCase()` uses the device's active locale, so identical ingredient names can normalize differently across devices, notably under Turkish casing rules. Exact personal-rule matching should be deterministic.
- **Fix**: Replace `toLocaleLowerCase()` with locale-independent `toLowerCase()` and add a casing regression test.
- **Decision**: SKIPPED — consciously accepted locale-dependent casing behavior for now.

### F5 — Canonical examples are not covered by the durable API schema suite

- **Severity**: 🔎 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: `services/api/src/test/java/com/example/goodgut_server/productcontract/ProductContractFixturesTests.java:35`
- **Detail**: The API suite validates normalized fixtures but not the three canonical examples under `docs/reference/examples/`, even though the contract states those examples must validate. They passed a review-time command, but future drift would not be caught by the standard repository test runner.
- **Fix**: Validate every JSON file in `docs/reference/examples/` with the same canonical lookup schema in `ProductContractFixturesTests`.
- **Decision**: FIXED — canonical examples now validate through the same canonical schema path in the standard API suite.

## Triage Summary

- **Fixed**: F1 (Fix A), F2, F3, F5.
- **Skipped**: F4 — locale-dependent casing consciously accepted for now.
- **Accepted as rule**: none.
- **Post-triage verdict**: APPROVED with one low-impact accepted warning.
