---
project: GoodGut
version: 1
status: draft
created: 2026-08-18
updated: 2026-08-19
prd_version: 3
main_goal: speed
top_blocker: external
---

# Roadmap: GoodGut

> Derived from `context/foundation/prd-v3.md` (v3) + auto-researched codebase baseline.
> Edit in place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

GoodGut reduces time spent reading food labels by applying one shopper's personal ingredient exclusions and nutrition thresholds to scanned product data. It is an Android-only, one-profile application: it presents complete available product facts, highlights negative-rule warnings in red, counts triggered rules, and never produces disease analysis or medical judgments. Missing or uncertain data remains explicitly unavailable rather than becoming a false non-match.

## North star

**S-03: Shopper scans a product and sees an avoided ingredient highlighted with the triggered-rule count** — this is the first complete flow that demonstrates GoodGut's distinguishing value under the speed-first sequence.

> North star means the smallest end-to-end slice whose successful delivery proves the central product idea; it is placed as early as its prerequisites allow.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | personal-rules-product-contract | (foundation) the external product-data contract and representative fixtures support personal ingredient and nutrition rules | — | FR-004, FR-005, FR-009, FR-010 | done |
| S-01 | scan-complete-product-facts | scan a barcode and see complete available product facts or explicit unavailable states without personalization | F-01 | US-01, FR-004, FR-005, FR-009, FR-010 | in-progress |
| S-02 | avoided-ingredient-profile | configure and edit one on-device profile containing predefined and custom avoided ingredients | — | US-01, FR-001, FR-002 | ready |
| S-03 | ingredient-warning-scan | scan a product and see avoided ingredients highlighted with the total triggered-rule count | S-01, S-02 | US-01, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010 | proposed |
| S-04 | nutrition-threshold-profile | configure and edit above-or-below nutrition thresholds with an explicit per-100-g or per-100-ml basis | — | US-01, FR-001, FR-003 | ready |
| S-05 | nutrition-warning-scan | scan a product and see matching nutrition warnings combined with ingredient warnings and an accurate total | S-03, S-04 | US-01, FR-003, FR-004, FR-005, FR-007, FR-008, FR-009, FR-010 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Product lookup and warnings | `F-01` → `S-01` → `S-03` → `S-05` | Speed-first path; `S-02` joins at `S-03` and `S-04` joins at `S-05`. |
| B | Avoided-ingredient profile | `S-02` | Runs independently, then supplies the first personalized scan. |
| C | Nutrition-threshold profile | `S-04` | Runs independently without delaying the ingredient-warning proof. |

## Baseline

What's already in place in the codebase as of `2026-08-18` (auto-researched + user-confirmed).
Foundations below assume these are present and do not re-scaffold them.

- **Frontend:** partial — the mobile shell, routing, strict checks, and tested framework-independent personal-rule evaluator exist; product screens, scanning, profile setup, highlighting, and count presentation are absent.
- **Backend / API:** partial — the service scaffold and health endpoint exist; product lookup and normalization are absent.
- **Data:** absent — there is no runtime external-product adapter, product store, or on-device profile persistence.
- **Auth:** absent intentionally — PRD v3 requires one on-device profile without login, synchronization, sharing, or roles.
- **Deploy / infra:** partial — the API hosting target is documented, but reproducible deployment and CI configuration are absent.
- **Observability:** absent — no metrics, tracing, or error tracking is configured.

## Foundations

### F-01: Personal-rules product contract and external-data proof

- **Outcome:** (foundation) the normalized product contract and representative recorded fixtures expose complete ingredient names, Nutri-Score, kcal, sugars, fats, other supported nutrition values, exact per-100-g or per-100-ml basis, and explicit lookup and missing-data states suitable for personal rules.
- **Change ID:** personal-rules-product-contract
- **PRD refs:** FR-004, FR-005, FR-009, FR-010
- **Unlocks:** S-01, S-03, S-05; resolves whether the chosen external source provides the fields and basis required by the first scan flows without relying on live data in automated tests.
- **Prerequisites:** —
- **Parallel with:** S-02, S-04
- **Blockers:** —
- **Unknowns:**
  - Do representative source records reliably distinguish per-100-g from per-100-ml nutrition and provide ingredient arrays suitable for exact matching? — Owner: team. Block: no.
- **Risk:** External records are incomplete and mutable; proving and recording representative mappings first prevents every later slice from inventing incompatible fallback behavior.
- **Status:** done

## Slices

### S-01: Scan and view complete product facts

- **Outcome:** shopper can scan a barcode and see complete available ingredients, Nutri-Score, kcal, sugars, fats, and other available nutrition values, with explicit not-found, source-error, and unavailable states and no personalized highlights when no rules exist.
- **Change ID:** scan-complete-product-facts
- **PRD refs:** US-01, FR-004, FR-005, FR-009, FR-010
- **Prerequisites:** F-01
- **Parallel with:** S-02, S-04
- **Blockers:** availability and response quality of the external product source during live use
- **Unknowns:**
  - Which representative Android test device and physical product barcodes will be used for the manual scan check? — Owner: user. Block: no.
- **Risk:** This slice validates the full scan and lookup boundary before personalization, making external-data failures visible without mixing them with matching defects.
- **Status:** in-progress

### S-02: Configure avoided ingredients

- **Outcome:** shopper can configure and edit one on-device profile by selecting predefined avoided ingredients and adding case-insensitive exact-name custom ingredients.
- **Change ID:** avoided-ingredient-profile
- **PRD refs:** US-01, FR-001, FR-002
- **Prerequisites:** —
- **Parallel with:** F-01, S-01, S-04
- **Blockers:** —
- **Unknowns:**
  - What is the smallest predefined ingredient-and-alias set needed for the first usable release beyond the required sucralose example? — Owner: user. Block: no.
- **Risk:** An oversized catalogue would consume deadline capacity; a small editable list plus custom entry preserves usefulness without blocking the first warning flow.
- **Status:** ready

### S-03: Highlight avoided ingredients after scanning

- **Outcome:** shopper can scan a product, see every triggered avoided-ingredient rule first with matching ingredient text highlighted in red, see the total number of triggered rules, and still inspect complete product facts below.
- **Change ID:** ingredient-warning-scan
- **PRD refs:** US-01, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010
- **Prerequisites:** S-01, S-02
- **Parallel with:** S-04
- **Blockers:** external product records may omit, merge, translate, or inconsistently spell ingredient names
- **Unknowns:**
  - Are the predefined aliases sufficient for the representative product set without introducing uncertain fuzzy matches? — Owner: team. Block: no.
- **Risk:** This is the earliest complete proof of personal value; deterministic exact and known-alias matching must remain separate from uncertain source text.
- **Status:** proposed

### S-04: Configure nutrition thresholds

- **Outcome:** shopper can configure and edit above-or-below thresholds for selected nutrition values, with each rule explicitly using a per-100-g or per-100-ml basis.
- **Change ID:** nutrition-threshold-profile
- **PRD refs:** US-01, FR-001, FR-003
- **Prerequisites:** —
- **Parallel with:** F-01, S-01, S-02, S-03
- **Blockers:** —
- **Unknowns:**
  - Which nutrition fields from the normalized product contract should be selectable in the initial threshold list? — Owner: user. Block: no.
- **Risk:** Restricting choices to normalized fields with explicit units prevents the profile from creating rules that product data cannot evaluate reliably.
- **Status:** ready

### S-05: Combine nutrition and ingredient warnings

- **Outcome:** shopper can scan a product and see all ingredient and strictly crossed nutrition rules highlighted in red with one accurate total, while equality, basis mismatch, missing values, and uncertain inputs remain non-triggering and explicitly unavailable where relevant.
- **Change ID:** nutrition-warning-scan
- **PRD refs:** US-01, FR-003, FR-004, FR-005, FR-007, FR-008, FR-009, FR-010
- **Prerequisites:** S-03, S-04
- **Parallel with:** —
- **Blockers:** external product records may lack nutrition values or an exact comparison basis
- **Unknowns:**
  - Do the representative fixtures cover equality, both threshold directions, both bases, basis mismatch, and missing configured values? — Owner: team. Block: no.
- **Risk:** Combining rule types can corrupt counts or turn unavailable data into reassurance; this slice extends the already-proven ingredient flow while preserving deterministic boundaries.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | personal-rules-product-contract | Align the product contract with personal rules | yes | Run `/10x-plan personal-rules-product-contract` |
| S-01 | scan-complete-product-facts | Deliver barcode scan and complete product facts | no | Depends on F-01 |
| S-02 | avoided-ingredient-profile | Deliver the avoided-ingredient profile | yes | Can proceed alongside F-01 |
| S-03 | ingredient-warning-scan | Deliver ingredient warnings and trigger count | no | Depends on S-01 and S-02 |
| S-04 | nutrition-threshold-profile | Deliver nutrition-threshold configuration | yes | Can proceed independently without delaying S-03 |
| S-05 | nutrition-warning-scan | Deliver combined nutrition and ingredient warnings | no | Depends on S-03 and S-04 |

## Open Roadmap Questions

No roadmap-wide questions remain open. Non-blocking implementation questions are recorded on the slices that own them.

## Parked

- **Disease analysis, medical scoring, and medical advice** — Why parked: PRD v3 §Non-Goals removes them from the product concept.
- **Positive or green rules** — Why parked: PRD v3 §Non-Goals limits the MVP to negative red warnings.
- **Multiple profiles, login, synchronization, and sharing** — Why parked: PRD v3 §Non-Goals keeps one profile on one device.
- **iOS, web, and desktop clients** — Why parked: PRD v3 §Non-Goals requires Android only.
- **Scan history and product recommendations** — Why parked: PRD v3 §Non-Goals defers both until the scan-and-highlight flow works.
- **Bulk product-data import and periodic refresh** — Why parked: the speed-first sequence uses live lookup plus deterministic recorded fixtures; a bulk data platform is not required by PRD v3.
- **CI, deployment automation, and expanded observability** — Why parked: the confirmed baseline records these as later operational work, while the current sequence is constrained by external product data and the mandatory on-device flow.

## Done

- **F-01: (foundation) the normalized product contract and representative recorded fixtures expose complete ingredient names, Nutri-Score, kcal, sugars, fats, other supported nutrition values, exact per-100-g or per-100-ml basis, and explicit lookup and missing-data states suitable for personal rules.** — Archived 2026-08-19 → `context/archive/2026-08-19-personal-rules-product-contract/`. Lesson: —.
