# Minimal Product Data Contract - Plan Brief

> Full plan: `context/changes/minimal-product-data-contract/plan.md`

## What & Why

Define GoodGut's minimal product-data contract around live Open Food Facts barcode lookup. This foundation slice lets later scan and analysis work rely on a stable GoodGut shape instead of coupling mobile or backend behavior directly to raw Open Food Facts responses.

## Starting Point

The Spring Boot API currently exposes only `/health`, and the Expo app is still a starter with no scanner or product API client. No dataset, database, import, product schema, or external adapter exists.

## Desired End State

The repo has a canonical product-data contract, fixture strategy, and backend integration handoff. GoodGut can show Nutri-Score when available, but disease-profile analysis remains unavailable rather than judgmental when required inputs are missing.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Product source | Open Food Facts live lookup first | It enables barcode lookup now while postponing full import complexity. |
| Import scope | No bulk import in this change | Import/cache design belongs after the first lookup path is validated. |
| Contract ownership | GoodGut-normalized contract in docs plus API mapping | This decouples GoodGut UX and analysis from raw OFF schema changes. |
| Lookup ownership | Spring API calls Open Food Facts | Backend can centralize User-Agent, compliance, mapping, rate-limit handling, and future cache/import migration. |
| Fixtures | Six recorded fixture scenarios | Deterministic tests need stable raw and normalized examples despite mutable live source data. |
| Missing data | Show Nutri-Score when available; do not judge disease suitability without sufficient inputs | This matches the MVP safety guardrail and avoids fake precision. |
| Nutrition basis | Per 100g/100ml | It is consistent across products and matches common source data. |
| Compliance | Document read-only client identity and usage rules | Enough for MVP lookup without adding write/contribution flows. |

## Scope

**In scope:**

- Canonical contract doc at `docs/reference/product-data-contract.md`
- Open Food Facts field mapping notes
- Explicit lookup states: found, not found, source error
- Per-profile analysis readiness and missing-data semantics
- Six recorded fixture scenarios and file layout
- Backend ownership and future endpoint handoff
- Compliance and verification notes

**Out of scope:**

- Product lookup endpoint implementation
- Expo barcode scanner implementation
- Disease-profile analysis rules
- Database, cache, migrations, or import job
- Open Food Facts write/contribution flows

## Architecture / Approach

Mobile will eventually call GoodGut's API with a barcode. The API will call Open Food Facts, normalize source data into GoodGut's product contract, and return explicit lookup/readiness states. Recorded fixtures will drive future API tests so automated checks do not rely on live Open Food Facts behavior.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Contract and Source Mapping | Canonical GoodGut product contract plus OFF mapping and missing-data semantics | Contract may be too narrow for later analysis if readiness states are vague. |
| 2. Recorded Fixtures and Expected Normalized Outputs | Six fixture scenarios and raw/normalized fixture layout | Fixtures may not cover later rule needs if too few source cases are captured. |
| 3. API Integration Plan and Verification Gates | Backend ownership, future endpoint shape, compliance, and verification handoff | Accidentally expanding into endpoint/import work would blur this foundation slice. |

**Prerequisites:** Existing API/mobile scaffolds only; no DB or scanner required.
**Estimated effort:** One focused implementation session across three documentation/contract phases.

## Open Risks & Assumptions

- Open Food Facts response shape and data completeness may vary by barcode.
- A later import/cache design may need additional metadata, but should preserve the GoodGut-normalized contract.
- Exact WZJG analysis inputs are not fully defined yet; this plan records readiness/missing-data states rather than final scoring rules.

## Success Criteria (Summary)

- Future scan work can implement against GoodGut's contract without passing raw OFF data through to mobile.
- Nutri-Score display and disease-analysis readiness are represented independently.
- Recorded fixtures make future mapping tests deterministic and network-independent.
