<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Nutrition warning scan

- **Plan**: context/changes/nutrition-warning-scan/plan.md
- **Scope**: Phases 1–3 of 3 (all completed phases)
- **Date**: 2026-09-06
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | FAIL |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | FAIL |

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test -- --runInBand`: passed (20 suites, 206 tests).
- Focused Phase 3 integration test: passed (1 suite, 1 test).
- `.\mvnw.cmd test -q` from `services/api/`: passed (exit code 0).
- Fixture server startup, found response, not-found fallback, and shutdown were verified.

## Findings

### F1 — Required component interaction test is missing

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: apps/mobile/src/components/product-facts/__tests__/product-result-test.tsx (missing)
- **Detail**: Phase 2 requires rendered interaction coverage for press-to-expand/collapse, ordinary-row behavior, accessibility state, summary disclosure, and stale reset. The named test file and directory are absent; the passing tests cover only the pure presentation model.
- **Fix**: Add the planned renderer-based component tests and run the Phase 2 focused command.
  - Strength: Proves the user-visible contract at the component boundary.
  - Tradeoff: Requires test harness setup and several interaction cases.
  - Confidence: HIGH — the plan explicitly names the file and behaviors.
  - Blind spot: None significant.
- **Decision**: FIXED — added renderer-based expand/collapse, ordinary-row, and product-identity reset tests; focused test passes.

### F2 — Fixture scenario matrix is incomplete

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence
- **Location**: scripts/nutrition-warning-fixture-server.mjs:7-9
- **Detail**: The plan requires dedicated deterministic fixtures for solid/liquid, partial and missing ingredients, unavailable nutrition, mixed bases, equality, mismatch, and mixed counts under scripts/fixtures/nutrition-warning-scan/. The server serves only two existing API fixtures (one complete liquid and one partial product), and that directory is absent.
- **Fix**: Add the planned fixture matrix and map every documented scenario through the fixture server.
  - Strength: Makes the Android acceptance cases reproducible and validates the contract end to end.
  - Tradeoff: Adds fixture maintenance and a broader integration test matrix.
  - Confidence: HIGH — the missing scenarios are explicit plan requirements.
  - Blind spot: Existing API fixtures may cover some values but do not provide the documented barcode matrix.
- **Decision**: FIXED — added five deterministic fixture files, mapped all served barcodes, and expanded decoder coverage to every fixture plus not-found fallback; focused test passes.

### F3 — Phase 3 integration coverage is too narrow

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: apps/mobile/src/features/product-lookup/__tests__/personal-warning-integration-test.ts:8-19
- **Detail**: The integration test decodes one shared Coca-Cola fixture and checks one per-100-ml sugar trigger. It does not exercise presentation, saved-profile refresh, candidate/save-error isolation, equality, both bases, mismatch, empty profiles, unavailable facts, or every served scenario as required.
- **Fix**: Expand the integration suite to cover the complete saved-profile-to-presentation and fixture matrix contract.
  - Strength: Closes the gap between passing unit tests and the planned boundary behavior.
  - Tradeoff: More fixtures and test setup to maintain.
  - Confidence: HIGH — coverage omissions are directly enumerated in the plan.
  - Blind spot: Some cases are covered by Phase 1 unit tests but not through the requested boundary.
- **Decision**: FIXED — expanded the integration suite to cover presentation trigger/equality/mismatch behavior, active-profile isolation during save errors, all served fixtures, and not-found decoding; focused test passes.

### F4 — Manual acceptance is unsupported by observable evidence

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/nutrition-warning-scan/plan.md:279-282; context/changes/nutrition-warning-scan/verification.md:16
- **Detail**: Progress marks Android checks 3.5–3.8 complete, while verification.md says device, barcode, and observed-value details were not supplied. The plan requires those details and says unperformed checks remain pending.
- **Fix**: Re-run or document each Android check with device, barcode, observed values, and outcome; otherwise return 3.5–3.8 to pending.
  - Strength: Keeps acceptance evidence auditable and aligned with the plan.
  - Tradeoff: Requires physical-device time or leaves the change explicitly incomplete.
  - Confidence: HIGH — the discrepancy is explicit in the artifacts.
  - Blind spot: The user’s acceptance may reflect an external run not captured in this workspace.
- **Decision**: FIXED — returned manual checks 3.5–3.8 to pending and documented that physical Android evidence is still required.

### F5 — Disclosure state can remain stale after an equivalent profile edit

- **Severity**: 🔎 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: apps/mobile/src/components/product-facts/product-result.tsx:24
- **Detail**: The remount key includes barcode, warning kind, and summary title. A saved threshold edit that preserves the same count/title can keep an expanded disclosure open even though evaluated rules changed, contrary to the reset requirement.
- **Fix**: Include a stable evaluated-profile/rule signature in the component identity or reset disclosure state when that signature changes.
- **Decision**: FIXED — component identity now includes evaluated warning details, with a regression test proving a same-title threshold edit resets disclosure; focused tests, lint, and typecheck pass.

## Triage Summary

All five findings were fixed. Physical Android checks remain pending by design until device-level evidence is recorded; the change should not be treated as fully accepted until those checks are completed.
