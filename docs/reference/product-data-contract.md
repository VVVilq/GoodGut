# GoodGut Product Data Contract

Status: normative for MVP implementation
Contract version: `3.0`

This document defines the normalized product lookup boundary used by GoodGut's personal shopping rules. The machine-readable authority is split between `schemas/product-lookup.schema.json` and `schemas/normalized-product.schema.json`; this document defines their semantics and the Open Food Facts mapping policy.

PRD v3 supersedes the earlier disease-oriented design. This contract contains product facts and availability only. It never produces disease analysis, medical scores, suitability, advice, or a favorable inference from missing data.

## Scope and Ownership

The Spring API owns read-only Open Food Facts lookup and normalization. Mobile calls GoodGut and never consumes raw source JSON. A later cache or import may sit behind this boundary without changing mobile behavior.

This contract covers barcode lookup, product identity, source metadata, Nutri-Score, versioned ingredient taxonomy evidence, a finite nutrition catalogue, and explicit unavailable states. It does not implement the endpoint, source client, mapper, scanner, profile storage, warning evaluation, database, cache, bulk import, or source write flow.

## Versioning

Every response carries `contractVersion: "3.0"`. Adding an optional source mapping may be compatible, but changing lookup branches, normalized identifiers, units, bases, required fields, or availability meaning requires a reviewed contract-version change and corresponding schema and fixture updates.

Consumers ignore unknown raw Open Food Facts fields. They must not ignore unknown GoodGut contract versions.

## Lookup Outcomes

Every lookup returns exactly one branch selected by `outcome`.

| Outcome | Meaning | Required behavior |
| --- | --- | --- |
| `found` | Source resolved the barcode and GoodGut has the minimum product identity. | Return a normalized product; individual facts may be unavailable. |
| `not_found` | Source authoritatively reports no product for the barcode. | Return `reason: not_in_source`; never fabricate product data. |
| `source_error` | Lookup could not produce a trustworthy source result. | Return one error category; never treat it as not found. |

Supported source-error categories are `rate_limited`, `network_error`, `invalid_source_response`, and `source_unavailable`.

## Found Product

A found response contains:

- The scanned `barcode`.
- Source provider, product URL when known, and fetch timestamp.
- Product display name plus optional brand, quantity, and image metadata.
- An independent Nutri-Score state.
- Ingredient facts with explicit availability.
- All eight supported nutrients, each with independent availability.

Finding a product does not imply that ingredients, Nutri-Score, or nutrition values are complete.

## Nutri-Score

Nutri-Score is either:

- `available` with a lowercase grade `a` through `e`; or
- `missing` with no grade.

Nutri-Score availability is independent from every other fact group.

## Ingredient Facts

Ingredient status is one of:

- `available`: `items` contains one or more ordered ingredient items, with `completeness` equal to `complete` or `partial`. `catalogueVersion` is non-null when at least one item is recognized and may be null when every item is unrecognized.
- `missing`: the source supplies no ingredient evidence that GoodGut can normalize.
- `unparseable`: ingredient evidence exists, but no structured fragment can be classified safely.

Each available item is either `recognized` (with the understandable source `displayName`, canonical OFF `nodeId`, and all transitive `ancestorNodeIds`) or `unrecognized` (with `displayName` only). Item order follows trusted OFF leaf order and duplicate leaves are retained. OFF edges are the only ancestry authority.

For Open Food Facts, use this trust order:

1. Prefer the structured nested `ingredients` result and canonical ingredient tags returned by the selected v3 product schema.
2. Check parsing metadata, including known/unknown ingredient counts and ingredient language where supplied.
3. Emit `available/complete` when every structured leaf is trusted and resolved in one active catalogue release.
4. Emit `available/complete` when every displayable leaf is recognized; emit `available/partial` when any displayable leaf is unrecognized, including when the active catalogue is unavailable. Preserve every displayable leaf and never interpret uncertainty as a trustworthy zero.
5. Emit `unparseable` when raw ingredient text exists but no structured leaf can be classified safely.
6. Emit `missing` when ingredient evidence is absent.

Do not split arbitrary ingredient prose in GoodGut. Do not translate, fuzzy-match, or invent family relationships during source normalization. Custom rules use case-insensitive exact display names. An absent list must never normalize to `available` with an empty array.

## Nutrition Facts

The complete MVP catalogue is fixed:

| Identifier | Display unit |
| --- | --- |
| `energy_kcal` | `kcal` |
| `carbohydrates` | `g` |
| `sugars` | `g` |
| `fat` | `g` |
| `saturated_fat` | `g` |
| `fiber` | `g` |
| `protein` | `g` |
| `salt` | `g` |

Every identifier is present in a found response. Each value is independently:

- `available` with a finite non-negative `value`, its fixed `unit`, and exact `basis` of `per_100g` or `per_100ml`; or
- `unavailable` with `reason` equal to `missing_source`, `unknown_basis`, `invalid_value`, or `unsupported_unit`.

Do not infer solid/liquid basis from product category. Do not collapse the two bases, convert serving values, or copy a basis from one nutrient to another. A rule can compare only an available value with the same basis. Equality remains non-triggering in downstream rule evaluation.

For Open Food Facts fields normalized with the `_100g` suffix, determine the GoodGut basis only from explicit source quantity units: `g` or `kg` selects `per_100g`, while `ml`, `cl`, or `l` selects `per_100ml`. Product category, name, and packaging appearance are not evidence. If the explicit unit is absent, unsupported, or conflicts with other source basis evidence, emit `unavailable` with `reason: unknown_basis` for the affected nutrients. Profile work may store separate thresholds for `per_100g` and `per_100ml`; evaluation uses only the threshold whose basis exactly matches the normalized fact.

## Missing-Data Invariants

- Missing, malformed, partial, uncertain, or basis-less source data never becomes an available fact.
- An unavailable fact is neither a trigger nor a non-match.
- A found product remains found when some or all optional facts are unavailable.
- `not_found` and `source_error` contain no product object.
- Only missing facts relevant to configured rules need prominent warning treatment in later UI work; the contract still exposes availability for every supported fact.

## Open Food Facts Mapping Boundary

GoodGut targets the current Open Food Facts v3 read-product API. The implementation must select only required fields and record the requested API/product schema version because v3 evolves.

| GoodGut field | Source concept |
| --- | --- |
| Barcode and identity | Barcode input/code, localized product name, brands, quantity, selected image |
| Source metadata | Provider URL and GoodGut fetch time |
| Nutri-Score | Current Nutri-Score grade field |
| Ingredients | Structured `ingredients`, canonical ingredient tags, raw text, language, and parsing counts |
| Nutrition | As-sold `_100g` nutriment values and units for the fixed catalogue; explicit product quantity unit selects GoodGut `per_100g` or `per_100ml` |

Raw source fields never become the public mobile contract. Production mapping belongs to roadmap slice S-01.

## Source Compliance

- Use a custom `User-Agent` in the documented `AppName/Version (ContactEmail)` form.
- Keep this MVP path read-only and complete the Open Food Facts API usage declaration before production use.
- Preserve required database and image attribution/licensing.
- Respect current read limits and map throttling or HTTP 503 to `source_error`, never `not_found`.
- Recheck current API version, terms, licenses, and rate limits before production rollout.

## Fixtures and Automated Tests

Recorded raw source snapshots live under `services/api/src/test/resources/fixtures/openfoodfacts/raw/`; paired expected GoodGut results live under `normalized/`. Automated tests must be offline. Live checks and snapshot refreshes are manual, attributable, reviewed operations.

`manifest.json` is the fixture inventory and capability index. Every basename has exactly one raw file and one normalized file. Recorded API entries preserve the request URL, requested fields, API version, returned product-schema version, retrieval time, and Open Food Facts attribution. Error entries are explicit deterministic transport scenarios because a timeout or unavailable response has no trustworthy source product body; they must never be presented as recorded product data.

Fixture refresh is manual only:

1. Recheck the current v3 endpoint and product-schema change log, then fetch only the selected fields with a custom `User-Agent` in the documented `AppName/Version (URL or ContactEmail)` form.
2. Remove credentials and contact-bearing request headers. Preserve the request URL, versions, timestamp, status, selected response fields, and attribution in the raw snapshot.
3. Review each normalized value against the raw response and the ingredient trust boundary. Never refresh expected values mechanically or infer missing facts.
4. Update the paired raw and normalized files and the manifest capability entry together. A GoodGut field or semantic change also requires contract-version and canonical-schema review.
5. Run the offline contract suite. Commit the reviewed set together; use Git history to inspect or roll back a source refresh.

Open Food Facts is credited as the source. Its database is available under ODbL, and product images may carry CC BY-SA terms; production UI and distribution must preserve the required attribution and licensing.

The canonical schemas remain in `docs/reference/schemas/`. Do not maintain copied schema variants in API or mobile modules.
Minimal examples for all lookup branches live in `docs/reference/examples/` and must validate against the lookup schema.

## Downstream Handoff

- S-01 implements source lookup and normalization against this contract.
- S-03 consumes ingredient availability, display names, identities, and ancestry for avoided-ingredient warnings.
- S-05 consumes independently based nutrition facts for threshold warnings.
- Profile configuration and warning presentation do not change this source contract.

Artifact locations and rules:

- Semantic contract: `docs/reference/product-data-contract.md`.
- Canonical schemas: `docs/reference/schemas/product-lookup.schema.json` and `normalized-product.schema.json`.
- Recorded source proof and normalized expectations: `services/api/src/test/resources/fixtures/openfoodfacts/`.
- Mobile adapter and evaluation: `apps/mobile/src/domain/personal-rules.ts`.
- Consumers branch first on `outcome`, then on each fact's `status`; they never derive a favorable result from an unavailable value.
- The only nutrient keys are `energy_kcal`, `carbohydrates`, `sugars`, `fat`, `saturated_fat`, `fiber`, `protein`, and `salt`.
- New raw Open Food Facts fields may be ignored. Changing selected fields, identifiers, required structure, basis, or availability semantics requires a contract-version increment plus schema and fixture review.
- API v3 and its product schema evolve independently; S-01 must pin or record both versions and keep raw-to-normalized mapping out of mobile.

Verification commands:

```powershell
cd services/api; .\mvnw.cmd test
cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test
```

## References

- `context/foundation/prd-v3.md`
- `context/foundation/roadmap.md`
- Open Food Facts API: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/`
- Ingredient schema: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_ingredients/`
- Schema change log: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-api-and-product-schema-change-log/`
