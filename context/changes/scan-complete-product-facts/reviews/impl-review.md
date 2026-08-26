<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Scan Complete Product Facts Implementation Plan

- **Plan**: `context/changes/scan-complete-product-facts/plan.md`
- **Scope**: Phases 1–5 of 5
- **Date**: 2026-08-26
- **Verdict**: APPROVED AFTER TRIAGE
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Mobile lookup can remain loading indefinitely

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: `apps/mobile/src/data/goodgut-api.ts:30`
- **Detail**: The mobile request awaits `fetch` without an `AbortSignal` or deadline. Backend Open Food Facts timeouts bound only the upstream hop; a stalled phone-to-GoodGut connection can leave the result UI loading indefinitely. `rescan()` invalidates late state updates but does not cancel the underlying request.
- **Fix**: Add a finite mobile request deadline with `AbortController`, clear the timer in `finally`, map timeout/abort to `transport_failure`, and allow rescan or replacement to abort the active request.
  - Strength: Bounds the user-visible loading state and releases obsolete network work while preserving the existing error model.
  - Tradeoff: Requires threading cancellation ownership between the client and lookup lifecycle and adding timeout/cancellation tests.
  - Confidence: HIGH — the unbounded await and generation-only stale-response guard are directly observable.
  - Blind spot: The appropriate timeout duration has not been validated on slow mobile networks.
- **Decision**: FIXED — added a 15-second client deadline, caller-driven cancellation, rescan abort behavior, and focused timeout/cancellation tests. Mobile lint, typecheck, and all 67 tests pass.

### F2 — Planned HTTP schema validation and found serialization coverage are missing

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `services/api/src/test/java/com/example/goodgut_server/product/ProductLookupControllerTests.java:30`
- **Detail**: Phase 2 requires endpoint response-shape/schema-validity coverage and canonical serialization. Controller tests exercise `not_found`, `source_error`, and invalid input, but never serialize a `found` outcome or validate endpoint bodies against the canonical JSON Schema. The API suite passes, but this planned contract guard is absent.
- **Fix**: Add MockMvc coverage that serializes a representative `found` response and validates all three valid outcome bodies against the canonical product-lookup schema.
- **Decision**: FIXED — added representative `found` serialization and canonical JSON Schema validation for `found`, `not_found`, and `source_error` endpoint bodies. All 21 API tests pass.

### F3 — Broad runtime catch masks backend defects as provider data errors

- **Severity**: 🔎 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: `services/api/src/main/java/com/example/goodgut_server/product/source/openfoodfacts/OpenFoodFactsClient.java:43`
- **Detail**: After typed transport and HTTP catches, the client catches every remaining `RuntimeException` and returns `invalid_source_response`. Programming or configuration defects can therefore be mislabeled as malformed provider data without diagnostic evidence.
- **Fix**: Catch only the specific message-conversion exception expected for malformed successful responses; let unexpected runtime failures reach standard server handling, or log safe request context before deliberately mapping them.
- **Decision**: FIXED — replaced the blanket `RuntimeException` catch with `RestClientException`, preserving malformed-response mapping while allowing unrelated defects to surface. All 21 API tests pass.

## Verification Evidence

- `services/api/.\mvnw.cmd test`: PASS — 21 tests, 0 failures, 0 errors after triage.
- `apps/mobile/npm.cmd run lint`: PASS.
- `apps/mobile/npm.cmd run typecheck`: PASS.
- `apps/mobile/npm.cmd test`: PASS — 67 tests across 6 suites after triage.
- `npx.cmd expo config --type public`: PASS — camera permission present, barcode scanning enabled, and no Android audio permission.
- Scope search: PASS — no raw Open Food Facts transport mapping or S-01 personalization/warning/disease behavior was found in the mobile lookup UI.
- Manual criteria: all plan items are marked complete with phase commit references; this review did not repeat physical-device checks.
