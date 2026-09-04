<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Partial ingredient display

- **Plan**: context/changes/partial-ingredient-display/plan.md
- **Mode**: Deep
- **Date**: 2026-09-04
- **Verdict**: SOUND (after triage)
- **Findings**: 0 critical, 0 outstanding warnings, 0 outstanding observations

## Verdicts

| Dimension | Verdict |
|---|---|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS |
| Plan Completeness | PASS |

## Grounding

Grounding: 8/8 paths ✓, 3/3 symbols ✓, brief↔plan ✓. No `docs/reference/contract-surfaces.md` is present; the opt-in surface check was skipped.

## Findings

### F1 — Coordinated deployment is not a complete contract migration plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🔴 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Migration Notes
- **Detail**: Mobile explicitly rejects versions other than 3.0, while installed clients may still be on the 2.0 decoder when an API 3.0 response is served. “Deploy together” does not prevent old app binaries from receiving the new response, so rollout can produce client errors during the upgrade window.
- **Fix A ⭐ Recommended**: Add a compatibility window: API can negotiate or serve 2.0 and 3.0 representations until the minimum mobile version is established, then remove 2.0.
  - Strength: Supports normal staged mobile adoption without breaking installed clients.
  - Tradeoff: Temporary dual-contract code and explicit retirement criteria.
  - Confidence: HIGH — mobile clients are not upgraded atomically with the API.
  - Blind spot: Exact negotiation mechanism still needs selection.
- **Fix B**: Gate API rollout on a mandatory mobile minimum-version release.
  - Strength: Keeps one wire shape and simplifies server code.
  - Tradeoff: Requires reliable version enforcement and delays API rollout.
  - Confidence: MED — feasibility of app-store/version gating is unverified.
  - Blind spot: Users who do not update remain a compatibility risk.
- **Decision**: DISMISSED — aplikacja nie ma obecnie użytkowników, więc migracja może być skoordynowana bez okresu kompatybilności.

### F2 — Display fallback algorithm is underspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🟡 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Phase 2, Open Food Facts mapper
- **Detail**: `collectTrustedLeaves` currently rejects non-`en:` IDs and uncertain parents before retaining children (`OpenFoodFactsProductMapper.java:139-156`). “Usable text or readable ID fallback” does not define whether text-only leaves qualify, how locale prefixes/underscores/hyphens are normalized, or when a parent is displayable versus only a container. Different implementations could expose different source data.
- **Fix**: Specify a deterministic fallback algorithm (text precedence, accepted ID formats, locale-prefix stripping, normalization, and parent/child rule) and make it the contract tested by the mapper regressions.
- **Decision**: FIXED — dopisano deterministyczny fallback tekstu/ID, normalizację locale/separatorów oraz regułę emisji rodziców i dzieci.

### F3 — Migrating every fixture to 3.0 may erase legacy rejection coverage

- **Severity**: ⚠️ WARNING
- **Impact**: 🟡 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1, Fixtures and contract tests
- **Detail**: The plan says every fixture and manifest entry declares 3.0, but current fixtures and decoder tests use 2.0 as the valid historical contract (`decoder.ts:27-55`, `ProductContractFixturesTests.java:62-72`). Replacing them all removes a useful regression proving that stale 2.0 responses are rejected.
- **Fix**: Retain a clearly named legacy 2.0 fixture/test solely for rejection, while converting active examples to 3.0.
- **Decision**: DISMISSED — nie utrzymujemy dodatkowej ścieżki kompatybilności ani historycznego fixture’u 2.0; aktywny kontrakt przechodzi na 3.0.

### F4 — Phase 5 contains conditional acceptance requirements

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🟢 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 5, Integration evidence and docs
- **Detail**: “a product-lookup integration test if needed” and “barcode … when fixture provenance is available” leave required coverage ambiguous. The deterministic Majonez-shaped fixture should be mandatory; a real attributed snapshot can remain optional supplementary evidence.
- **Fix**: Name the exact mandatory test/fixture path and mark the live snapshot explicitly optional.
- **Decision**: DISMISSED — nie dodajemy specjalnego testu ani fixture’u Majonezu; wystarczą ogólne testy kontraktu i mappera.
