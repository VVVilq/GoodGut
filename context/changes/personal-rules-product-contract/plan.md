# Personal Rules Product Contract Implementation Plan

## Overview

Replace the obsolete disease-oriented product-data draft with a versioned GoodGut contract for personal ingredient exclusions and nutrition thresholds. Prove it against stable Open Food Facts snapshots, publish machine-readable JSON Schemas, and verify compatibility with the mobile rule evaluator before product lookup work begins.

## Current State Analysis

GoodGut already documents a normalization boundary between Open Food Facts and mobile, but the live contract models diabetes, celiac, and WZJG readiness rather than PRD v3 personal rules. It collapses nutrition basis into `100g_or_100ml`, exposes ingredient text instead of matchable ingredient names, and omits several nutrition facts required by the replacement roadmap.

The Spring API currently has only a health endpoint and no external client, mapper, product DTO, fixture resources, or product tests. Mobile has framework-independent evaluation with exact ingredient matching, strict nutrition comparisons, unavailable handling, and trigger counting, but its `ProductFacts` uses a product-wide nutrition basis and arbitrary nutrient keys. No production users or persisted profiles require migration.

## Desired End State

The repository has one authoritative personal-rules product contract: explanatory Markdown plus versioned JSON Schemas for `found`, `not_found`, and `source_error`. A `found` result carries product identity, source metadata, independent Nutri-Score availability, conservatively normalized ingredient names with explicit availability, and a finite eight-nutrient catalogue whose available values each declare `per_100g` or `per_100ml`.

Recorded raw and normalized fixtures prove representative Open Food Facts shapes without live network calls. Automated checks validate normalized fixtures against the schemas, enforce raw/normalized pairing and capability coverage, and exercise representative normalized facts through the mobile evaluator. Later S-01, S-03, and S-05 work can consume the result without inventing source, basis, or missing-data behavior.

### Key Discoveries:

- Current `analysisReadiness` and disease fixtures conflict with PRD v3 and must be replaced (`docs/reference/product-data-contract.md:76`, `context/foundation/prd-v3.md:87`).
- The current combined basis cannot enforce exact threshold-basis matching (`docs/reference/product-data-contract.md:65`, `apps/mobile/src/domain/personal-rules.ts:1`).
- Mobile matching consumes separated names and rejects substring matching (`apps/mobile/src/domain/personal-rules.ts:34`, `apps/mobile/src/domain/__tests__/personal-rules-test.ts:27`).
- Missing source ingredients cannot become an empty list without creating a false non-match (`context/foundation/prd-v3.md:47`, `apps/mobile/src/domain/personal-rules.ts:51`).
- The API has no product integration or fixture resources (`services/api/src/main/java/com/example/goodgut_server/HealthController.java:6`, `services/api/src/test/java/com/example/goodgut_server/GoodgutServerApplicationTests.java:13`).
- Open Food Facts exposes nested ingredients, tags, raw text, language, and known/unknown parse counts, but completeness is not guaranteed; normalization needs a conservative trust order.

## What We're NOT Doing

- Implementing `GET /products/{barcode}`, a production Open Food Facts client, or a production mapper.
- Implementing scanning, product screens, profiles, persistence, warnings, or trigger-summary UI.
- Retaining disease profiles, readiness, scores, gluten suitability, or WZJG fields and fixtures.
- Adding a database, cache, import, refresh job, or Open Food Facts write flow.
- Inferring basis from category, converting serving values, or heuristically splitting arbitrary ingredient prose.
- Calling Open Food Facts from automated tests or refreshing snapshots automatically.

## Implementation Approach

Treat Markdown as the semantic explanation and JSON Schema as the executable response boundary. Replace the contract in place while Git and archived plans retain superseded history. Preserve the GoodGut-owned normalization boundary, lookup outcomes, source metadata, Nutri-Score independence, conservative missing-data behavior, fixture layout, and source-compliance notes.

Use a discriminated lookup union. For `found`, ingredients have `available | missing | unparseable` and normalized name strings; absent or incomplete structured parsing never becomes an available empty list. The fixed nutrients are `energy_kcal`, `carbohydrates`, `sugars`, `fat`, `saturated_fat`, `fiber`, `protein`, and `salt`; each independently reports availability and, when available, numeric value, display unit, and exact basis.

Capture immutable real Open Food Facts responses with provenance and pair each with an expected normalized result. A capability manifest makes the compact matrix auditable. Contract tests validate schemas and inventory; mobile tests align the evaluator with per-value bases and preserve exact-match, missing-value, and count behavior.

## Critical Implementation Details

### Ingredient trust boundary

Open Food Facts structured ingredients are derived from community label text and can be partial. Populate names only from a sufficiently complete structured result under a documented trust order; use parsing metadata to reject incomplete results as `unparseable` rather than silently dropping unknown ingredients.

### Contract authority

Schemas have one canonical location and must be consumed by tests without divergent copies. New source fields are ignored; changes to GoodGut-selected fields require a contract-version increment and fixture review.

## Phase 1: Replace the Contract and Define Executable Schemas

### Overview

Remove the superseded disease model and establish the semantic and machine-readable personal-rules boundary.

### Changes Required:

#### 1. Normative Product Contract

**File**: `docs/reference/product-data-contract.md`

**Intent**: Make PRD v3 the sole live contract authority while preserving useful source-boundary decisions.

**Contract**: Define contract versioning; lookup union; product/source metadata; Nutri-Score states; ingredient availability and trust order; eight nutrients; per-value availability, units, and basis; missing-data invariants; Open Food Facts v3 ownership/compliance; and downstream ownership. Remove all disease, gluten-specific, and obsolete fixture language.

#### 2. Machine-Readable Schemas

**Files**: `docs/reference/schemas/product-lookup.schema.json`, `docs/reference/schemas/normalized-product.schema.json`

**Intent**: Make the response boundary automatically verifiable.

**Contract**: Use versioned JSON Schema with closed, discriminated lookup branches. Found requires the finite product structure with explicit field availability; error branches prohibit product data. Values are finite and non-negative; grades, nutrients, units, and bases are enumerated; available nutrients require exact basis.

#### 3. Mobile Contract Alignment

**File**: `apps/mobile/src/domain/personal-rules.ts`

**Intent**: Align evaluator inputs with the stable nutrients and per-value basis without adding networking or UI.

**Contract**: Replace arbitrary nutrient keys and product-wide basis with a finite nutrient type and independently available nutrient facts. Preserve personal-rule discrimination, exact ingredients, strict comparisons, unavailable semantics, rule order, and count-by-rule.

### Success Criteria:

#### Automated Verification:

- Both schemas parse and accept a minimal valid example for every lookup outcome.
- Repository search finds no disease-readiness, diabetes, celiac, WZJG, medical-score, or gluten-suitability fields in the normative contract or schemas.
- Mobile type checking and personal-rule tests pass: `cd apps/mobile; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification:

- Human confirms Markdown and schemas express identical lookup, ingredient, nutrient, basis, and missing-data semantics.
- Human confirms the eight-nutrient catalogue is sufficient for the first profile and scan slices.

**Implementation Note**: Pause after automated verification for human confirmation before Phase 2.

---

## Phase 2: Record Representative Open Food Facts Proof

### Overview

Create immutable, attributable source snapshots and expected normalized results covering every load-bearing capability.

### Changes Required:

#### 1. Raw Source Snapshots

**Directory**: `services/api/src/test/resources/fixtures/openfoodfacts/raw/`

**Intent**: Ground the contract in real v3 response shapes while keeping tests deterministic.

**Contract**: Commit read-only snapshots for representative solid/per-100g, liquid/per-100ml, and incomplete/unavailable cases. Record barcode, request URL/fields, returned API/schema version, retrieval timestamp, and attribution; exclude credentials and contact-bearing headers.

#### 2. Expected Normalized Fixtures

**Directory**: `services/api/src/test/resources/fixtures/openfoodfacts/normalized/`

**Intent**: Make every source case's GoodGut outcome explicit.

**Contract**: Pair files by basename. Across the compact matrix cover both bases, all eight nutrients where representative data permits, Nutri-Score available/missing, ingredients available/missing/unparseable, partial nutrition, `not_found`, and supported `source_error` categories without inventing values.

#### 3. Capability Manifest and Refresh Policy

**Files**: `services/api/src/test/resources/fixtures/openfoodfacts/manifest.json`, `docs/reference/product-data-contract.md`

**Intent**: Prevent multi-purpose fixtures from silently losing coverage and make maintenance deliberate.

**Contract**: Map basenames to provenance and capabilities. Define manual-only capture/refresh, schema-change review, immutable automated inputs, attribution, v3 endpoint selection, custom User-Agent expectations, and Git rollback.

### Success Criteria:

#### Automated Verification:

- Every manifest entry has exactly one raw and normalized fixture and every fixture is declared once.
- Manifest capabilities cover solid/per-100g, liquid/per-100ml, complete/partial nutrition, every ingredient state, both Nutri-Score states, `not_found`, and supported source errors.
- Every normalized fixture validates against the canonical schemas offline.

#### Manual Verification:

- Human compares normalized expectations to raw responses and confirms uncertainty never became an available fact.
- Human confirms provenance and attribution are sufficient for committed snapshots.

**Implementation Note**: Pause after automated verification for human confirmation before Phase 3.

---

## Phase 3: Enforce Contract and Evaluator Compatibility

### Overview

Add durable checks for schema drift, inventory gaps, and incompatibility with personal-rule evaluation.

### Changes Required:

#### 1. API Contract Test Support

**Files**: `services/api/pom.xml`, `services/api/src/test/java/com/example/goodgut_server/productcontract/ProductContractFixturesTests.java`

**Intent**: Validate canonical schemas and the recorded inventory with the standard API test runner before a mapper exists.

**Contract**: Add only test-scoped schema validation. Tests validate normalized fixtures, enforce manifest pairing/capabilities, reject undeclared files, and make no network requests.

#### 2. Mobile Compatibility Tests

**Files**: `apps/mobile/src/domain/__tests__/personal-rules-test.ts`, `apps/mobile/src/domain/personal-rules.ts`

**Intent**: Prove schema-shaped facts preserve agreed matching and unavailable behavior.

**Contract**: Cover available names, missing/unparseable ingredients, finite nutrient identifiers, per-value basis mismatch, absent nutrients, equality, and combined counts. Keep adaptation framework-independent and do not duplicate source normalization.

#### 3. Handoff Notes

**Files**: `docs/reference/product-data-contract.md`, `context/changes/personal-rules-product-contract/plan.md`

**Intent**: Give S-01, S-03, and S-05 an unambiguous boundary and verification path.

**Contract**: Document artifact locations, nutrient keys, branching rules, API/schema-version caveat, extension rules, and verification commands. Production mapping belongs to S-01; evaluation and presentation remain S-03/S-05.

### Success Criteria:

#### Automated Verification:

- API contract tests pass offline: `cd services/api; .\mvnw.cmd test`.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- Scope search finds no endpoint, production source client, scanner, persistence, or disease analysis.

#### Manual Verification:

- Human traces one solid, one liquid, and one incomplete fixture through normalized contract and evaluator availability.
- Human confirms downstream slices need not reopen nutrient identifiers, bases, ingredient trust, or lookup outcomes.

**Implementation Note**: Pause after automated verification for final human confirmation.

---

## Testing Strategy

### Unit Tests:

- Parse schemas and validate every lookup branch.
- Validate normalized fixtures, pairing, manifest uniqueness, and capability coverage.
- Preserve evaluator tests for aliases, exact names, strict comparisons, equality, basis mismatch, unavailable values, ordering, and count-by-rule.
- Add per-value basis and ingredient availability cases based on normalized facts.

### Integration Tests:

- Treat raw/normalized inventory plus schemas as the pre-mapper integration boundary.
- Run API and mobile suites offline; no test calls Open Food Facts.
- Defer raw-to-normalized mapper tests to S-01.

### Manual Testing Steps:

1. Compare schemas and Markdown for all lookup outcomes.
2. Inspect representative solid, liquid, incomplete, not-found, and error pairs.
3. Confirm incomplete ingredient parsing never becomes an available empty list.
4. Trace available and unavailable nutrients through exact-basis evaluation.
5. Confirm no disease-oriented contract path remains active.

## Performance Considerations

F-01 adds no runtime path. Keep schemas compact and fixture tests small enough for normal API and mobile test runs.

## Migration Notes

No production compatibility is required. Replace the draft in place and update the unconsumed evaluator input directly. Future changes increment the contract version and update schemas and fixtures together.

## References

- `context/foundation/prd-v3.md`
- `context/foundation/roadmap.md` F-01
- `docs/reference/product-data-contract.md`
- `context/archive/2026-06-24-minimal-product-data-contract/`
- `apps/mobile/src/domain/personal-rules.ts`
- `apps/mobile/src/domain/__tests__/personal-rules-test.ts`
- `services/api/src/test/java/com/example/goodgut_server/GoodgutServerApplicationTests.java`
- `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/`
- `https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_ingredients/`
- `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-api-and-product-schema-change-log/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Replace the Contract and Define Executable Schemas

#### Automated

- [x] 1.1 Both schemas parse and accept a minimal valid example for every lookup outcome
- [x] 1.2 Repository search finds no superseded disease-oriented fields in the normative contract or schemas
- [x] 1.3 Mobile type checking and personal-rule tests pass after per-value basis alignment

#### Manual

- [x] 1.4 Human confirms Markdown and schemas express identical contract semantics
- [x] 1.5 Human confirms the eight-nutrient catalogue is sufficient for the first profile and scan slices

### Phase 2: Record Representative Open Food Facts Proof

#### Automated

- [ ] 2.1 Every manifest entry has exactly one raw and normalized fixture and every fixture is declared once
- [ ] 2.2 Manifest capabilities cover every required source, basis, availability, Nutri-Score, and lookup boundary
- [ ] 2.3 Every normalized fixture validates against the canonical schemas offline

#### Manual

- [ ] 2.4 Human confirms normalized fixtures never promote absent or uncertain source values
- [ ] 2.5 Human confirms fixture provenance and attribution are sufficient

### Phase 3: Enforce Contract and Evaluator Compatibility

#### Automated

- [ ] 3.1 API contract tests pass offline
- [ ] 3.2 Mobile lint, type checking, and tests pass
- [ ] 3.3 Repository scope check finds no endpoint, production source client, scanner, persistence, or disease analysis

#### Manual

- [ ] 3.4 Human traces solid, liquid, and incomplete fixtures through contract and evaluator availability
- [ ] 3.5 Human confirms downstream slices can proceed without reopening F-01 contract decisions
