# Scan Complete Product Facts — Plan Brief

> Full plan: `context/changes/scan-complete-product-facts/plan.md`

## What & Why

Build GoodGut's first complete Android vertical slice: scan a packaged-food barcode and see all trustworthy product facts or an explicit unavailable/error state. This validates camera, mobile, GoodGut API, and Open Food Facts boundaries before later slices add personal rules and warnings.

## Starting Point

F-01 already supplies contract `1.0`, canonical schemas, and reviewed raw/normalized fixtures. Runtime code is still minimal: Spring exposes only health, while mobile remains an Expo starter with no camera, API client, scan lifecycle, or facts UI.

## Desired End State

The shopper starts from Home, scans or manually enters an 8–14 digit barcode, and reaches a dedicated result. Found products display identity, source, Nutri-Score, ingredients, and all eight nutrients; missing data, product absence, source failures, and client failures remain explicit and recoverable.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Navigation | Home → dedicated scanner → dedicated result | Keeps camera lifecycle clear and leaves the result extensible for later warning slices. |
| Capture | Lock first valid scan and start lookup immediately | Minimizes shopper effort and prevents duplicate requests. |
| Manual input | Secondary option using the same lookup path | Supports damaged labels, emulators, and deterministic checks. |
| Endpoint policy | HTTP 200 for every valid contract outcome | Mobile branches on one discriminated response contract. |
| Barcode input | Preserve exactly; require 8–14 digits | Covers common GTIN forms and keeps leading-zero correlation safe. |
| Invalid source identity | `invalid_source_response` | Avoids inventing a product name or conflating malformed data with absence. |
| Response validation | Hand-written complete contract `1.0` decoder | Runtime safety without schema-copy or Ajv bundle overhead. |
| Missing facts | Show all eight nutrient rows with explicit `Brak danych` | Missing never looks like zero or a favorable fact. |
| Retry | User-triggered retry of the same barcode | Avoids amplifying rate limits and keeps behavior predictable. |
| Configuration | `EXPO_PUBLIC_API_BASE_URL` | Supports local devices and deployments without hard-coded hosts. |
| Identity UI | Name, brands, quantity, image/placeholder, source/link | Uses the contract fully and preserves source attribution. |

## Scope

**In scope:**

- Open Food Facts client, conservative mapper, and `GET /products/{barcode}`
- Offline source, mapper, service, controller, decoder, and state tests
- Android camera permission and barcode scanning
- Manual barcode entry, duplicate suppression, loading, retry, and rescan
- Complete product identity, Nutri-Score, ingredients, and eight nutrient rows
- Explicit unavailable, not-found, source-error, and client-error states

**Out of scope:**

- Profiles, matching, thresholds, highlights, trigger counts, or medical judgments
- Cache, persistence, scan history, bulk import, automatic retry, and observability
- Direct Open Food Facts access from mobile
- iOS, web, CI, deployment, and production rollout

## Architecture / Approach

`Camera/manual input → mobile lookup state → GoodGut API → Open Food Facts client → conservative mapper → contract 1.0 → mobile decoder → result UI`. Source DTOs stay in the API; the full display DTO stays separate from the existing lossy personal-rule adapter. Automation uses recorded fixtures and local stubs only.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Domain and mapper | Production normalization proven against F-01 fixtures | Unsafe source data could be promoted to a fact. |
| 2. Client and endpoint | Offline-tested GoodGut lookup boundary | HTTP/source failures could be misclassified. |
| 3. Mobile contract and state | Safe decoder, API client, retry/rescan lifecycle | Late or duplicate responses could corrupt UI state. |
| 4. Scanner and navigation | Android camera flow plus manual fallback | Permissions and repeated detections vary by device. |
| 5. Facts and hardening | Complete result and all recoverable states | Dense missing-data presentation could become unclear. |

**Prerequisites:** Archived F-01 contract, a usable Open Food Facts application identity/contact for live configuration, and a physical Android device for Phases 4–5.

**Estimated effort:** About five focused implementation/review sessions, one per gated phase.

## Open Risks & Assumptions

- Open Food Facts v3 and its product schema evolve; selected fields and fixtures must remain the reviewed reference.
- Live product records are incomplete and mutable, so only manual checks use the network.
- The device must reach the configured API host; `localhost` on the development machine is not automatically reachable from a physical phone.
- Remote product images may fail independently and must fall back without changing product facts.
- No cache means repeated explicit scans call the source again; this is accepted for S-01 and should be revisited only with measured need.

## Success Criteria (Summary)

- One real Android scan causes one GoodGut lookup and shows a complete or explicitly unavailable result.
- Every contract outcome and nested missing-data state is deterministic, tested offline, and recoverable where appropriate.
- Mobile never consumes raw Open Food Facts data or applies personalization in S-01.
