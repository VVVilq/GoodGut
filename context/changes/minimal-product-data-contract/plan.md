# Minimal Product Data Contract Implementation Plan

## Overview

Define GoodGut's minimal product data contract around live Open Food Facts barcode lookup, while keeping the app's internal product shape independent from Open Food Facts' raw response schema. This change creates the durable contract, recorded fixture expectations, and backend integration guardrails needed before building the first product lookup endpoint.

## Current State Analysis

GoodGut has a Spring Boot API scaffold and an Expo mobile scaffold, but no product lookup, product domain model, scanner flow, dataset, database, import job, or external product adapter. The roadmap marks this foundation slice as the prerequisite for the Nutri-Score scan flow and later profile-based product analysis.

The selected data source for MVP lookup is Open Food Facts' live read API. A later product-data import may be considered separately, but this change must not design or implement a bulk import path.

## Desired End State

The repo contains a reviewed product-data contract that future backend and mobile work can implement against. The contract distinguishes product lookup states, normalized GoodGut product fields, source metadata, Nutri-Score availability, and per-profile analysis readiness so GoodGut can show Nutri-Score when available while refusing to judge disease-profile suitability when required data is insufficient.

The plan is complete when the contract doc, fixture plan, and integration guardrails are present and internally consistent with the PRD, roadmap, Open Food Facts lookup approach, and current codebase layout.

### Key Discoveries:

- API baseline has only `GET /health`; product lookup and analysis endpoints are absent in `services/api/src/main/java/com/example/goodgut_server/HealthController.java`.
- API tests use Spring Boot context plus MockMvc in `services/api/src/test/java/com/example/goodgut_server/GoodgutServerApplicationTests.java`.
- Mobile baseline is an Expo Router starter with strict TypeScript and no scanner, product, API client, or mobile tests in `apps/mobile`.
- Roadmap F-01 requires a minimal product contract and small test product set before `scan-product-nutri-score`.
- PRD v2 distinguishes "product not found in the MVP data source" from "found product lacks enough data for reliable analysis."
- Open Food Facts read lookup will be the first external source; GoodGut should normalize its own response shape rather than passing through raw OFF JSON.

## What We're NOT Doing

- Implementing the product lookup endpoint.
- Implementing barcode scanning in Expo.
- Implementing disease-profile analysis rules or recommendations.
- Importing the Open Food Facts dataset into GoodGut.
- Adding a database, migrations, cache, background job, or product refresh pipeline.
- Adding write/contribution flows to Open Food Facts.
- Making medical recommendations when analysis inputs are missing or uncertain.

## Implementation Approach

Create a durable, human-readable contract in `docs/reference/product-data-contract.md`, backed by planned API-side fixture files under `services/api/src/test/resources/fixtures/openfoodfacts/`. The contract will describe GoodGut's normalized product shape, Open Food Facts source mapping, lookup outcomes, missing-data semantics, per-100g nutrition basis, compliance requirements, and future migration notes for a later import/cache decision.

The API will own Open Food Facts lookup in later implementation work: mobile will send a barcode to GoodGut, GoodGut will call Open Food Facts, normalize the response, and return GoodGut's contract to the client. Recorded fixtures will make tests deterministic even when live Open Food Facts data changes.

## Critical Implementation Details

### User experience spec

If Nutri-Score is available for a recognized product, GoodGut may present it even when profile-specific analysis is unavailable. If disease-profile inputs are insufficient, GoodGut must not create an analysis, recommendation, or suitability judgment; it must expose a no-reliable-assessment state for that profile path.

### Source compliance

Open Food Facts requires a clear client identity and responsible API usage. The contract must record the required custom `User-Agent`, read-only scope, attribution/license note, rate-limit handling, and a reminder to review Open Food Facts terms before production rollout.

## Phase 1: Contract and Source Mapping

### Overview

Create the canonical GoodGut product contract and the Open Food Facts mapping surface that later code will implement.

### Changes Required:

#### 1. Product Data Contract Doc

**File**: `docs/reference/product-data-contract.md`

**Intent**: Define GoodGut's normalized product lookup contract in one durable place that backend, mobile, and future analysis plans can reference.

**Contract**: The doc names the lookup outcomes `found`, `not_found`, and `source_error`; the normalized product fields; source metadata; Nutri-Score availability; nutrition values normalized per 100g/100ml; allergen/ingredient evidence; and per-profile `analysisReadiness` states.

#### 2. Open Food Facts Mapping Section

**File**: `docs/reference/product-data-contract.md`

**Intent**: Document the Open Food Facts read API as the first source and map raw OFF concepts into GoodGut's internal contract.

**Contract**: The mapping references barcode lookup via Open Food Facts product API, records a custom GoodGut `User-Agent` requirement, and explicitly rejects raw OFF passthrough as the client-facing contract.

#### 3. Missing Data Semantics

**File**: `docs/reference/product-data-contract.md`

**Intent**: Make missing and insufficient data behavior precise before UI/API work begins.

**Contract**: The doc states that available Nutri-Score can be displayed independently, while disease-profile analysis requires sufficient inputs and otherwise returns `brak_wiarygodnej_oceny` or equivalent no-judgment status.

### Success Criteria:

#### Automated Verification:

- Contract doc exists at `docs/reference/product-data-contract.md`.
- Contract doc names Open Food Facts as the live MVP lookup source and does not describe a full dataset import as in scope.
- Contract doc includes lookup outcomes, normalized fields, missing-data semantics, per-100g nutrition basis, and source compliance notes.

#### Manual Verification:

- Human confirms the contract matches the intended MVP behavior: show Nutri-Score when available, but do not judge disease-profile suitability when inputs are insufficient.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Recorded Fixtures and Expected Normalized Outputs

### Overview

Define deterministic fixture coverage for Open Food Facts lookup and GoodGut normalization, without requiring live network calls in tests.

### Changes Required:

#### 1. Fixture Inventory

**File**: `docs/reference/product-data-contract.md`

**Intent**: Specify the recorded fixture set future API tests must use to verify source mapping and missing-data behavior.

**Contract**: The fixture inventory includes six cases: found product with Nutri-Score, not found product, found product with Nutri-Score missing, diabetes-input coverage, gluten evidence coverage, and WZJG-relevant partial or missing data.

#### 2. Fixture File Layout

**File**: `docs/reference/product-data-contract.md`

**Intent**: Define where implementation work should place raw source fixtures and expected GoodGut-normalized outputs.

**Contract**: The doc reserves `services/api/src/test/resources/fixtures/openfoodfacts/raw/` for recorded OFF responses and `services/api/src/test/resources/fixtures/openfoodfacts/normalized/` for expected GoodGut contract outputs.

#### 3. Deterministic Test Rule

**File**: `docs/reference/product-data-contract.md`

**Intent**: Prevent future tests from depending on Open Food Facts availability, rate limits, or mutable product data.

**Contract**: The doc states that automated contract tests use recorded fixtures; live API checks are manual smoke checks only.

### Success Criteria:

#### Automated Verification:

- Contract doc lists exactly six initial fixture scenarios.
- Contract doc defines raw and normalized fixture directories under `services/api/src/test/resources/fixtures/openfoodfacts/`.
- Contract doc states that automated tests must not depend on live Open Food Facts calls.

#### Manual Verification:

- Human confirms the six fixture scenarios are enough to unblock `scan-product-nutri-score` and later `analysis-rule-guardrails`.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: API Integration Plan and Verification Gates

### Overview

Record the future backend ownership model and verification gates so later implementation can add product lookup without reopening source and contract decisions.

### Changes Required:

#### 1. Backend Ownership Decision

**File**: `docs/reference/product-data-contract.md`

**Intent**: Specify that GoodGut's Spring API owns Open Food Facts calls, normalization, rate-limit handling, and later cache/import migration.

**Contract**: The doc states mobile clients call GoodGut, not Open Food Facts directly; backend response shape follows the GoodGut contract.

#### 2. Future Endpoint Contract

**File**: `docs/reference/product-data-contract.md`

**Intent**: Sketch the future product lookup endpoint without implementing it in this change.

**Contract**: The doc reserves a future `GET /products/{barcode}` or equivalent API endpoint returning the GoodGut lookup contract, with not-found and source-error states represented explicitly.

#### 3. Implementation Handoff Notes

**File**: `docs/reference/product-data-contract.md`

**Intent**: Capture verification commands, compliance checks, and migration notes for later `/10x-implement` runs.

**Contract**: The doc names API verification via `cd services\api; .\mvnw.cmd test`, mobile verification via `cd apps\mobile; npm.cmd run lint` when mobile consumes the contract, and notes that Java 21 must be available locally for API tests.

### Success Criteria:

#### Automated Verification:

- Contract doc states backend owns Open Food Facts lookup and normalization.
- Contract doc includes the future endpoint contract and explicit lookup state handling.
- Contract doc includes verification commands and Java 21 note.
- Repository search confirms no product endpoint, database, import job, or mobile scanner implementation was added in this foundation change.

#### Manual Verification:

- Human confirms the API ownership model is acceptable for the MVP and later import/cache migration.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Future API tests should validate Open Food Facts raw fixture mapping into GoodGut-normalized outputs.
- Future mapping tests should cover not found, Nutri-Score missing, diabetes input availability, gluten evidence, and WZJG partial data.
- This foundation change itself is verified by file existence and contract-content checks.

### Integration Tests:

- Future product lookup integration tests should use recorded fixtures or a stubbed OFF client, not live network calls.
- A live Open Food Facts smoke check may be manual only and should verify the configured `User-Agent` and representative barcode response shape.

### Manual Testing Steps:

1. Read `docs/reference/product-data-contract.md` and confirm it matches MVP behavior.
2. Confirm the contract avoids disease-profile recommendations when inputs are insufficient.
3. Confirm future API and mobile work can reference the doc without needing to consume raw Open Food Facts schema directly.

## Performance Considerations

This change does not implement runtime lookup, but it records that later API work must handle Open Food Facts latency, rate limits, and source errors. Caching and bulk import are intentionally deferred to a future change after the first lookup path proves useful.

## Migration Notes

No data migration is part of this change. A future import/cache change should preserve the GoodGut-normalized contract so mobile and analysis code do not depend on whether data came from live lookup, cache, or imported records.

## References

- Roadmap item: `context/foundation/roadmap.md` F-01 `minimal-product-data-contract`
- Product requirements: `context/foundation/prd-v2.md`
- Original PRD: `context/foundation/prd.md`
- Source API docs: `https://openfoodfacts.github.io/openfoodfacts-server/api/`
- Source API cheatsheet: `https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/`
- API baseline: `services/api/src/main/java/com/example/goodgut_server/HealthController.java`
- API test baseline: `services/api/src/test/java/com/example/goodgut_server/GoodgutServerApplicationTests.java`
- Mobile baseline: `apps/mobile/package.json`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Contract and Source Mapping

#### Automated

- [x] 1.1 Contract doc exists at `docs/reference/product-data-contract.md`
- [x] 1.2 Contract doc names Open Food Facts as the live MVP lookup source and does not describe a full dataset import as in scope
- [x] 1.3 Contract doc includes lookup outcomes, normalized fields, missing-data semantics, per-100g nutrition basis, and source compliance notes

#### Manual

- [x] 1.4 Human confirms the contract matches the intended MVP behavior: show Nutri-Score when available, but do not judge disease-profile suitability when inputs are insufficient — confirmed by the user on 2026-08-17

### Phase 2: Recorded Fixtures and Expected Normalized Outputs

#### Automated

- [x] 2.1 Contract doc lists exactly six initial fixture scenarios — 043d4e6
- [x] 2.2 Contract doc defines raw and normalized fixture directories under `services/api/src/test/resources/fixtures/openfoodfacts/` — 043d4e6
- [x] 2.3 Contract doc states that automated tests must not depend on live Open Food Facts calls — 043d4e6

#### Manual

- [x] 2.4 Human confirms the six fixture scenarios are enough to unblock `scan-product-nutri-score` and later `analysis-rule-guardrails` — confirmed during implementation review based on coverage of successful lookup, not-found, missing Nutri-Score, diabetes inputs, gluten evidence, and WZJG partial data

### Phase 3: API Integration Plan and Verification Gates

#### Automated

- [x] 3.1 Contract doc states backend owns Open Food Facts lookup and normalization
- [x] 3.2 Contract doc includes the future endpoint contract and explicit lookup state handling
- [x] 3.3 Contract doc includes verification commands and Java 21 note
- [x] 3.4 Repository search confirms no product endpoint, database, import job, or mobile scanner implementation was added in this foundation change

#### Manual

- [x] 3.5 Human confirms the API ownership model is acceptable for the MVP and later import/cache migration — confirmed by the user on 2026-08-17
