# Scan Complete Product Facts Implementation Plan

## Overview

Deliver roadmap slice S-01 as the first complete Android scan-to-product flow. GoodGut's Spring API will call Open Food Facts, normalize the response into contract `1.0`, and return one discriminated lookup outcome. The Expo client will scan or accept a barcode, call only GoodGut, and display every supported fact or its explicit unavailable state without personalization.

## Current State Analysis

F-01 already defines the normative contract, canonical JSON Schemas, and nine paired raw/normalized Open Food Facts fixtures. Its invariant tests cover provenance, requested-barcode preservation, explicit nutrition-basis evidence, schema validity, and the three lookup branches.

The API runtime still contains only `GET /health`; it has no product domain, source client, mapper, configuration, or product endpoint. The mobile app is an Expo SDK 56 starter with two demo tabs. It has no camera dependency, product API client, runtime contract decoder, scan state, or product UI. The existing `personal-rules.ts` adapter is deliberately lossy and cannot serve as the display model because it drops identity, units, unavailable reasons, and lookup outcomes.

### Key Discoveries

- Mobile must consume the GoodGut contract, never raw Open Food Facts (`docs/reference/product-data-contract.md`).
- The contract requires all eight nutrient entries and preserves leading zeros in the requested barcode.
- Nutrition basis can be derived only from explicit `product_quantity_unit`; uncertainty remains `unknown_basis`.
- Expo SDK 56 recommends `expo-camera` `CameraView`; only one preview may be active, so the scanner must unmount or deactivate when unfocused or after capture.
- Spring Boot 4 provides the synchronous `RestClient`, matching the request-response lookup without adding a reactive stack.
- No cache, database, automatic retry, component-test library, or production deployment wiring exists or is required by S-01.

## Desired End State

An Android shopper opens GoodGut, starts a scan, grants camera permission, and scans a supported GTIN barcode. The app locks the first valid detection, shows loading, and presents a dedicated result screen. Manual barcode entry provides the same path for damaged labels, emulators, and deterministic checks.

For a found product, the result displays identity, optional image and source link, Nutri-Score, ingredient state, and all eight nutrients in stable order with values, units, bases, or explicit unavailability. Not-found, upstream failure, client-network failure, invalid input, and camera-permission states have honest, actionable screens. Retry reuses the barcode; scan another returns to a fresh camera session.

## What We're NOT Doing

- Personal profiles, ingredient matches, nutrition thresholds, highlights, trigger counts, or any medical judgment.
- Direct Open Food Facts calls or source normalization in mobile.
- Caching, persistence, scan history, bulk import, source writes, or background refresh.
- Automatic network retries, fuzzy ingredient parsing, basis inference, or value conversion.
- iOS, web, desktop, production deployment, CI, monitoring, or analytics work.
- Copying canonical JSON Schemas into runtime modules or adding Ajv to mobile.

## Confirmed Product and Technical Decisions

| Area | Decision |
| --- | --- |
| Navigation | Home action, dedicated scanner, dedicated result screen. |
| Capture | First valid detection immediately locks scanning and begins lookup. |
| Fallback input | Manual entry is a secondary option and uses the identical lookup flow. |
| Endpoint semantics | `GET /products/{barcode}` returns HTTP 200 for every valid contract outcome. |
| Barcode validation | Preserve input exactly; accept 8–14 ASCII digits only. |
| Missing product name | Treat an otherwise successful upstream record as `invalid_source_response`. |
| Error UI | Friendly copy varies by source-error category and offers manual retry. |
| Mobile validation | A small hand-written decoder accepts only the complete contract `1.0` union. |
| Nutrition UI | Always show all eight nutrients in stable order; unavailable values say `Brak danych`. |
| Retry | No automatic retry; the user retries the same captured barcode explicitly. |
| API location | Mobile reads `EXPO_PUBLIC_API_BASE_URL`; absent configuration fails clearly in development. |
| Identity | Show name, brands, quantity, image/placeholder, attribution, and optional provider link. |

## Implementation Approach

Keep source transport, normalization, use-case orchestration, and HTTP presentation as separate backend boundaries. The Open Food Facts adapter returns source-shaped data or a typed source outcome; the mapper converts trusted 2xx source content into GoodGut records using an injected clock. The controller validates path input and serializes the use-case result without leaking source DTOs.

On mobile, keep the full contract DTO and decoder separate from personal-rule evaluation. A small API module converts transport and decoding failures into client states. A framework-independent scan/lookup state machine owns duplicate suppression, retry, rescan, and stale-response protection. Route files compose reusable scanner, status, and facts components.

The implementation remains fixture-driven and offline in automation. Production HTTP behavior is tested against a local stub server; mapper expectations are deep-compared with the existing normalized fixtures. The only live check is the final, manual Android verification.

## Critical Implementation Details

### Boundary between valid request and lookup outcome

Only syntactically valid 8–14 digit barcodes enter the lookup use case. Invalid path input is an HTTP request error and is not a contract lookup outcome. For valid barcodes, `found`, `not_found`, and `source_error` are all HTTP 200 bodies so mobile branches only on `outcome`.

### Source error classification

Open Food Facts 404 maps to `not_found`; 429 maps to `rate_limited`; 503 and other trustworthy upstream availability failures map to `source_unavailable`; timeouts and I/O failures map to `network_error`; malformed JSON, missing required identity, and semantically unsafe 2xx bodies map to `invalid_source_response`. Do not retry within the API.

### Scan lifecycle

The scanner accepts only supported product barcode formats that yield digit strings. Once a valid barcode is accepted, disable the callback and camera before navigation/lookup. A new explicit scan resets the lock. Every async response carries or is checked against the active request identity so a late response cannot replace a newer result.

## Phase 1: Backend Domain and Open Food Facts Normalization

### Overview

Create the GoodGut runtime response model and implement the raw-to-normalized mapping independently of HTTP transport.

### Changes Required

#### 1. Product lookup domain

**Files**: new records/enums under `services/api/src/main/java/com/example/goodgut_server/product/domain/`

**Intent**: Represent contract `1.0` as immutable GoodGut-owned runtime types with no Open Food Facts types crossing the boundary.

**Contract**: Model the three outcomes, source metadata, identity, Nutri-Score states, ingredient states, and the fixed eight-key nutrition object. Serialized names and shapes must match the canonical schemas exactly.

#### 2. Open Food Facts transport model and mapper

**Files**: new source DTOs and mapper under `services/api/src/main/java/com/example/goodgut_server/product/source/openfoodfacts/`

**Intent**: Convert selected v3 source fields conservatively while centralizing trust and missing-data rules.

**Contract**: Preserve the requested barcode; require a usable display name; use an injected `Clock`; apply the ingredient trust order; normalize only the eight contracted nutriments; emit fixed units; derive basis only from explicit quantity unit; distinguish missing, invalid, unsupported-unit, and unknown-basis reasons; never infer or convert.

#### 3. Mapper fixture tests

**Files**: new focused tests under `services/api/src/test/java/com/example/goodgut_server/product/source/openfoodfacts/`

**Intent**: Turn F-01 fixture expectations into executable production-mapper proof.

**Contract**: Load every recorded product/not-found raw fixture and deep-compare the mapper outcome to its paired normalized fixture. Add focused malformed, negative, unsupported/conflicting unit, missing identity, requested-barcode, Nutri-Score, and ingredient completeness cases.

### Success Criteria

#### Automated Verification

- API tests prove every recorded raw product/not-found fixture maps exactly to its paired contract response.
- Focused mapper tests cover all fact availability reasons, both bases, all ingredient states, Nutri-Score availability, and requested-barcode preservation.
- `cd services/api; .\mvnw.cmd test` passes without network access.

#### Manual Verification

- Human traces one solid, one liquid, and one basis-less fixture through the production mapper and confirms no source uncertainty becomes an available value.

**Implementation Note**: Pause for manual verification before Phase 2.

---

## Phase 2: Open Food Facts Client and GoodGut Product Endpoint

### Overview

Add the runtime source adapter, orchestration, configuration, and the stable HTTP endpoint consumed by mobile.

### Changes Required

#### 1. Source configuration and client

**Files**: `services/api/src/main/resources/application.properties`; new configuration/properties and client classes under `product/source/openfoodfacts/`

**Intent**: Make the upstream request explicit, attributable, bounded, and deploy-configurable.

**Contract**: Use Spring `RestClient`; configure base URL, selected v3 API/product schema behavior, custom `User-Agent`, and finite connect/read timeouts through environment-backed properties. Request only contract-required identity, quantity-unit, image, Nutri-Score, ingredient evidence/parsing metadata, and nutriment fields. Do not log bodies or add retries.

#### 2. Lookup orchestration

**Files**: new service/port classes under `services/api/src/main/java/com/example/goodgut_server/product/`

**Intent**: Keep source status classification and normalization outside the controller.

**Contract**: Accept the already validated requested barcode, invoke the source once, map transport/source states to the agreed contract outcomes, and delegate trustworthy product bodies to the mapper.

#### 3. REST endpoint and input validation

**Files**: new `ProductLookupController` and exception handling under the product package

**Intent**: Publish one stable mobile-facing lookup boundary.

**Contract**: Expose `GET /products/{barcode}`. Preserve leading zeros and accept exactly 8–14 ASCII digits. Return HTTP 200 with the canonical body for every valid lookup outcome; return a deterministic HTTP 400 response for invalid path input outside the product contract.

#### 4. Client, service, and controller tests

**Files**: new tests under `services/api/src/test/java/com/example/goodgut_server/product/`

**Intent**: Verify the complete backend without live source calls.

**Contract**: Use a local stub HTTP server or injected fake. Assert selected path/query fields, `User-Agent`, timeouts/config, status classification, malformed JSON, no retry, leading-zero preservation, endpoint response shape, HTTP policy, and schema validity.

### Success Criteria

#### Automated Verification

- Local-stub tests prove the source request selects required fields and sends the configured `User-Agent` without calling the internet.
- Tests prove 404, 429, 503/5xx, timeout/I/O, malformed 2xx, and valid 2xx responses map to the agreed outcomes exactly once.
- MockMvc tests prove barcode validation, leading-zero preservation, HTTP 200 outcome policy, and canonical response serialization.
- `cd services/api; .\mvnw.cmd test` passes offline.

#### Manual Verification

- With local configuration, a human calls the endpoint for representative found, not-found, and unavailable/error cases and confirms the body remains contract `1.0`.

**Implementation Note**: Pause for manual verification before Phase 3.

---

## Phase 3: Mobile Contract Decoder and Lookup State

### Overview

Build a lossless mobile boundary and deterministic lookup lifecycle before adding camera or presentation code.

### Changes Required

#### 1. Full mobile lookup contract

**Files**: new framework-independent types/decoder under `apps/mobile/src/domain/product-lookup/`

**Intent**: Preserve all information needed for display and reject responses the app cannot interpret safely.

**Contract**: Decode the complete discriminated union for contract version `1.0`; verify required identity, source, Nutri-Score, ingredient, and all eight nutrient shapes; preserve zero values, units, bases, nullable metadata, unavailable reasons, and requested barcode. Reject unknown versions, extra/missing required branches, invalid enums, and non-finite/negative values.

#### 2. GoodGut API client and configuration

**Files**: new API module under `apps/mobile/src/data/`; documented environment example or README update

**Intent**: Centralize URL construction, transport behavior, and decoding without calling Open Food Facts.

**Contract**: Read and normalize `EXPO_PUBLIC_API_BASE_URL`, safely encode the barcode path, require a successful GoodGut HTTP response, then decode contract `1.0`. Represent missing configuration, transport failure, non-success status, and invalid response distinctly from contract `source_error`.

#### 3. Lookup state machine/controller

**Files**: new framework-independent state module and thin hook under `apps/mobile/src/features/product-lookup/`

**Intent**: Make scan, manual entry, loading, outcome, retry, and rescan transitions deterministic and testable.

**Contract**: Validate 8–14 digits before lookup; lock duplicate capture; retry the same barcode only on explicit action; reset on scan another; ignore stale async completion; expose UI-ready states without applying personal rules.

#### 4. Domain and state tests

**Files**: new Jest tests outside `src/app/`

**Intent**: Verify hostile network data and lifecycle edges without a React Native renderer.

**Contract**: Cover all lookup outcomes, every unavailable reason, both bases, zero values, unknown version, malformed payloads, configuration/transport failure, duplicate suppression, stale response, retry, rescan, and invalid manual input.

### Success Criteria

#### Automated Verification

- Decoder tests accept canonical examples and representative normalized fixtures and reject malformed or unknown-version responses.
- State tests prove one request per accepted scan, manual retry only, stale-response protection, and clean rescan reset.
- Mobile code contains no Open Food Facts URL or raw source DTO.
- `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test` passes.

#### Manual Verification

- Human configures a device-reachable `EXPO_PUBLIC_API_BASE_URL` and confirms a manual barcode reaches each backend lookup branch without camera use.

**Implementation Note**: Pause for manual verification before Phase 4.

---

## Phase 4: Android Scanner and Navigation Flow

### Overview

Replace the starter entry experience with the approved home-to-scanner-to-result route flow.

### Changes Required

#### 1. Camera dependency and Android configuration

**Files**: `apps/mobile/package.json`, `apps/mobile/package-lock.json`, `apps/mobile/app.json`

**Intent**: Add the SDK-matched camera capability with barcode scanning and no unused audio permission.

**Contract**: Install the Expo SDK 56-compatible `expo-camera` package using Expo's installer. Configure its plugin for barcode scanning, camera permission copy, and `recordAudioAndroid: false`.

#### 2. Route structure and starter cleanup

**Files**: `apps/mobile/src/app/_layout.tsx`, `index.tsx`, and new scan/result routes; supporting navigation component changes

**Intent**: Give scanning and results a task-focused stack rather than permanent tabs.

**Contract**: Home exposes a primary scan action. Scanner and result are dedicated routes; route files stay composition-only. Remove or demote Expo demo content and prevent scanner/result from becoming tab destinations.

#### 3. Scanner and manual-entry components

**Files**: new reusable components under `apps/mobile/src/components/product-scan/`

**Intent**: Handle camera availability and capture safely across Android lifecycle states.

**Contract**: Render loading, requestable permission, denied/permanently denied guidance, mount failure, and granted preview states. Scan supported product barcode types, accept only validated digit data, deactivate after first accepted capture, and provide secondary manual entry with inline validation.

#### 4. Scan-flow tests

**Files**: focused Jest tests for extracted scan policy/state

**Intent**: Keep native camera callbacks thin and verify behavioral invariants without device automation.

**Contract**: Test permission-state mapping, accepted/rejected barcode types/data, first-detection lock, manual validation, camera reset, and lookup handoff.

### Success Criteria

#### Automated Verification

- Expo config resolves with the SDK-compatible camera plugin and Android barcode scanning enabled without audio recording permission.
- Tests prove invalid/duplicate detections never start extra lookups and a new scan re-enables capture.
- `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test` passes.

#### Manual Verification

- On a physical Android device, first-run permission allow reaches a working scanner and denial shows actionable recovery.
- A real barcode and manual entry each start exactly one lookup and navigate to the dedicated result flow.

**Implementation Note**: Pause for physical-device verification before Phase 5.

---

## Phase 5: Complete Product Facts Presentation and End-to-End Hardening

### Overview

Render every contract branch and finish the user-visible S-01 experience.

### Changes Required

#### 1. Found-product presentation

**Files**: new reusable components under `apps/mobile/src/components/product-facts/`; result route composition

**Intent**: Present complete facts clearly without personalization or invented values.

**Contract**: Show display name, brands, quantity, image or stable placeholder, Open Food Facts attribution, and provider link when present. Show Nutri-Score or unavailable, ingredient names or distinct missing/unparseable copy, and all eight nutrients in contract order. Available nutrients show value, fixed unit, and localized `100 g`/`100 ml` basis; unavailable entries show `Brak danych` without treating them as zero.

#### 2. Loading and outcome states

**Files**: result/status components under the product lookup feature

**Intent**: Make every failure honest and recoverable.

**Contract**: Provide loading, not-found, category-specific source-error, client-network/configuration/invalid-response, and unexpected state copy. Retry reuses the active barcode; scan another clears it and returns to a fresh scanner. Do not automatically retry.

#### 3. Presentation mapping tests

**Files**: framework-independent view-model tests and focused component tests only if existing tooling can support them without disproportionate setup

**Intent**: Lock stable ordering, labels, formatting, and missingness independently of device rendering.

**Contract**: Cover all eight nutrient labels/order, zero values, both bases, Nutri-Score missing, ingredient missing vs unparseable, nullable identity fields, error-category copy/actions, retry, and scan-another behavior.

#### 4. Documentation and final verification

**Files**: `apps/mobile/README.md` and targeted API configuration documentation as needed

**Intent**: Make the vertical slice reproducible for local development and Android verification.

**Contract**: Document API and mobile startup order, device-reachable base URL examples without secrets, Open Food Facts source attribution, representative manual checks, and the standard verification commands.

### Success Criteria

#### Automated Verification

- API tests pass offline: `cd services/api; .\mvnw.cmd test`.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- Tests prove every contract branch and every nested fact availability state has a deterministic display model and action set.
- Repository search confirms mobile has no raw Open Food Facts mapping and the result has no profile, warning, highlight, count, or disease-analysis behavior.

#### Manual Verification

- On a physical Android device, a representative complete product shows identity, source, Nutri-Score, ingredients, and all eight nutrient rows correctly.
- An incomplete product visibly distinguishes unavailable Nutri-Score, ingredient, and nutrient facts without implying zero or a favorable result.
- Not-found, source-error, offline/client-error, retry-same-barcode, and scan-another flows are understandable and recover correctly.
- Rapid repeated detections produce one lookup and leaving the scanner releases the camera.

**Implementation Note**: Pause for final acceptance of S-01.

---

## Testing Strategy

### Unit Tests

- Mapper tests use recorded source bodies plus focused edge cases for every contract invariant.
- Mobile decoder tests treat network JSON as untrusted and cover every union branch and nested state.
- Pure lifecycle tests cover barcode validation, duplicate locking, retry, rescan, and stale async responses.
- Presentation mapping tests preserve order, labels, bases, zero values, and unavailable reasons.

### Integration Tests

- Source-client tests use a local stub server and assert outbound URL, selected fields, headers, status mapping, timeout, and one-call behavior.
- MockMvc tests verify the controller boundary and canonical schema-shaped JSON.
- Mobile client tests fake `fetch` at the GoodGut boundary; no mobile test knows the source schema.
- All automated suites are offline and deterministic.

### Manual Testing Steps

1. Start API and Expo with a device-reachable `EXPO_PUBLIC_API_BASE_URL`.
2. Verify camera permission allow, deny, and recovery on the selected Android device.
3. Scan representative complete, incomplete, and basis-less products; compare display to API response.
4. Exercise manual entry, invalid code, not-found, offline, source-error, retry, and scan-another.
5. Hold a barcode in frame and confirm only one lookup; navigate away and confirm camera release.

## Performance and Reliability Considerations

- One scan produces at most one in-flight lookup; no client or server automatic retry is allowed.
- Explicit upstream connect/read timeouts bound loading duration and map to honest error states.
- Select only required Open Food Facts fields and do not add a cache before measured need.
- Remote images are optional presentation metadata; failure uses a placeholder and never changes the lookup outcome.
- Keep the camera inactive outside the focused scan route to avoid resource and privacy issues.

## Security and Privacy Considerations

- Validate and encode barcode input at both mobile and API boundaries; preserve leading zeros.
- Do not accept arbitrary upstream URLs for API requests; only configured GoodGut/Open Food Facts base URLs are used by their owning layers.
- Do not commit contact values or secrets. Configure production `User-Agent` identity/contact and mobile API URL through environment-backed properties.
- Do not log complete upstream bodies or device camera data. S-01 stores no scan history or profile data.

## Migration and Rollback

There is no production user data or API consumer migration. Changes are additive to the API and replace Expo starter screens. Each phase is independently revertible: domain/mapper, endpoint, mobile client, scanner, and presentation have separated boundaries. Rolling back the camera phase also removes its config plugin and dependency together; contract `1.0` remains unchanged.

## References

- `context/foundation/prd-v3.md`
- `context/foundation/roadmap.md` S-01
- `docs/reference/product-data-contract.md`
- `docs/reference/schemas/product-lookup.schema.json`
- `services/api/src/test/resources/fixtures/openfoodfacts/`
- `context/archive/2026-08-19-personal-rules-product-contract/`
- [Expo SDK 56 Camera](https://docs.expo.dev/versions/v56.0.0/sdk/camera/)
- [Spring REST Clients](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html)
- [Open Food Facts API](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/)
- [Open Food Facts schema change log](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-api-and-product-schema-change-log/)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Backend Domain and Open Food Facts Normalization

#### Automated

- [x] 1.1 Every recorded raw product/not-found fixture maps exactly to its paired contract response. — f10db8f
- [x] 1.2 Mapper tests cover all availability reasons, bases, ingredient states, Nutri-Score, and barcode preservation. — f10db8f
- [x] 1.3 The complete API test suite passes offline. — f10db8f

#### Manual

- [x] 1.4 Human confirms solid, liquid, and basis-less mapping never promotes uncertain facts. — f10db8f

### Phase 2: Open Food Facts Client and GoodGut Product Endpoint

#### Automated

- [x] 2.1 Local-stub tests prove selected fields and configured source identity. — 74659cd
- [x] 2.2 Source status, transport, malformed-response, and one-call mappings pass. — 74659cd
- [x] 2.3 MockMvc proves validation, barcode preservation, HTTP policy, and contract serialization. — 74659cd
- [x] 2.4 The complete API test suite passes offline. — 74659cd

#### Manual

- [x] 2.5 Human confirms representative live endpoint bodies remain contract `1.0`. — 74659cd

### Phase 3: Mobile Contract Decoder and Lookup State

#### Automated

- [x] 3.1 Decoder accepts canonical examples and fixtures and rejects unsafe responses. — ae45854
- [x] 3.2 Lookup state tests prove duplicate, retry, stale-response, and rescan behavior. — ae45854
- [x] 3.3 Mobile contains no Open Food Facts URL or raw source DTO. — ae45854
- [x] 3.4 Mobile lint, type checking, and tests pass. — ae45854

#### Manual

- [x] 3.5 Human confirms manual lookup reaches every backend outcome through the configured API URL.

### Phase 4: Android Scanner and Navigation Flow

#### Automated

- [x] 4.1 Expo config resolves with barcode scanning and no audio recording permission.
- [x] 4.2 Scan policy tests prevent invalid and duplicate lookups and permit explicit rescan.
- [x] 4.3 Mobile lint, type checking, and tests pass.

#### Manual

- [x] 4.4 Physical Android permission allow/deny/recovery behaves correctly.
- [x] 4.5 Real scan and manual entry each begin exactly one lookup and reach the result flow.

### Phase 5: Complete Product Facts Presentation and End-to-End Hardening

#### Automated

- [ ] 5.1 API tests pass offline.
- [ ] 5.2 Mobile lint, type checking, and tests pass.
- [ ] 5.3 Every lookup and fact-availability state has a deterministic display model and actions.
- [ ] 5.4 Scope checks find no raw source mapping, personalization, or disease analysis in S-01 UI.

#### Manual

- [ ] 5.5 A complete product displays all required identity and fact information on Android.
- [ ] 5.6 An incomplete product explicitly distinguishes every unavailable fact group.
- [ ] 5.7 Error, retry, and scan-another flows recover understandably.
- [ ] 5.8 Duplicate detections produce one lookup and scanner exit releases the camera.
