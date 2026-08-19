# Personal Rules Product Contract — Plan Brief

> Full plan: `context/changes/personal-rules-product-contract/plan.md`

## What & Why

Replace GoodGut's disease-oriented product-data draft with a personal-rules contract that supports exact avoided-ingredient matching and nutrition thresholds. Prove the boundary against stable Open Food Facts snapshots so later scan and warning slices do not invent incompatible basis, availability, or mapping behavior.

## Starting Point

The existing contract preserves useful lookup and normalization boundaries but models diabetes, celiac, and WZJG readiness, collapses 100g and 100ml, and lacks matchable ingredient names and complete nutrition facts. The API has no product mapper or fixtures; mobile already has a tested personal-rule evaluator with a narrow input shape.

## Desired End State

One authoritative Markdown contract and versioned JSON Schemas define all lookup outcomes and normalized product facts. Immutable real-source snapshots, normalized expectations, and offline checks prove both contract validity and compatibility with the mobile evaluator.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| F-01 scope | Contract, real fixtures, and automated validation; no production mapper | Proves the boundary without absorbing S-01 runtime work. |
| Ingredient shape | Normalized name strings plus explicit availability | Matches exact evaluation while preventing missing data from becoming an empty list. |
| Ingredient trust | Prefer sufficiently complete structured OFF ingredients; reject incomplete parsing | Maximizes useful coverage without heuristic false matches. |
| Nutrients | kcal, carbohydrates, sugars, fat, saturated fat, fibre, protein, salt | Finite identifiers keep profile options and source mappings stable. |
| Nutrition basis | Per available nutrient value: `per_100g` or `per_100ml` | Prevents invalid comparisons when source data is partial or conflicting. |
| Partial facts | Independent availability for every supported nutrient | Preserves complete available facts without treating omissions as values. |
| Lookup contract | Discriminated `found`, `not_found`, and `source_error` union | Keeps source failures distinct from product absence and sparse success. |
| Executable format | Versioned JSON Schema plus normative Markdown | Makes one cross-system boundary machine-verifiable. |
| Fixtures | Compact capability matrix of immutable real OFF snapshots | Covers source and missing-data boundaries without a brittle fixture per field. |
| Validation | Schema, pairing, capability, and mobile evaluator compatibility tests | Detects structural drift and downstream mismatch before S-01. |
| Compatibility | Replace the old draft in place | PRD v3 requires one unambiguous live contract; Git/archive preserves history. |

## Scope

**In scope:**

- Replacement personal-rules product contract and versioned JSON Schemas
- Explicit lookup, ingredient, Nutri-Score, nutrient, unit, basis, and availability states
- Eight stable nutrient identifiers
- Real recorded raw responses, normalized expectations, provenance, and capability manifest
- Offline API-side schema/inventory tests and mobile evaluator compatibility tests
- Open Food Facts v3 source mapping and maintenance rules

**Out of scope:**

- Production product endpoint, OFF client, or mapper
- Barcode scanner, product screens, profiles, persistence, and warning UI
- Disease analysis or medical judgments
- Database, cache, import, refresh job, or source write flow
- Heuristic parsing of arbitrary ingredient prose

## Architecture / Approach

Mobile will eventually call GoodGut's API, which owns the Open Food Facts boundary. F-01 defines that future response as canonical JSON Schemas explained by Markdown. Recorded raw responses pair with expected normalized results and a capability manifest; offline API tests validate the inventory, while mobile tests prove schema-shaped facts retain personal-rule semantics.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Contract and schemas | One disease-free semantic and executable personal-rules boundary | Markdown, schemas, and evaluator types could diverge. |
| 2. Source proof | Real solid, liquid, partial, missing, not-found, and error fixture coverage | Community source data may be incomplete or unstable. |
| 3. Enforcement | Offline schema/inventory gates and evaluator compatibility | Tests could duplicate normalization logic that belongs to S-01. |

**Prerequisites:** PRD v3, replacement roadmap, existing mobile evaluator, and archived predecessor contract plan.
**Estimated effort:** Three focused implementation/review sessions across three phases.

## Open Risks & Assumptions

- Open Food Facts structured ingredients are derived from community label data and may be absent or partially parsed; incomplete evidence remains unavailable.
- API v3 is current but evolving, so captured API/schema versions and explicit contract versioning are required.
- The compact fixture matrix must be reviewed for capability coverage rather than judged only by fixture count.
- Contract tests may need a small test-scoped JSON Schema dependency; no runtime dependency is justified.

## Success Criteria (Summary)

- Later slices consume one schema-defined contract with exact nutrient bases and conservative availability.
- Representative real source snapshots validate offline and never turn missing or uncertain data into a false fact.
- Mobile personal-rule behavior remains correct for exact ingredients, strict thresholds, basis mismatch, missing values, and trigger counts.
