# GoodGut Product Data Contract

Status: normative for MVP implementation
Contract version: `1.0`

This document defines the normalized product lookup boundary used by GoodGut's personal shopping rules. The machine-readable authority is split between `schemas/product-lookup.schema.json` and `schemas/normalized-product.schema.json`; this document defines their semantics and the Open Food Facts mapping policy.

PRD v3 supersedes the earlier disease-oriented design. This contract contains product facts and availability only. It never produces disease analysis, medical scores, suitability, advice, or a favorable inference from missing data.

## Scope and Ownership

The Spring API owns read-only Open Food Facts lookup and normalization. Mobile calls GoodGut and never consumes raw source JSON. A later cache or import may sit behind this boundary without changing mobile behavior.

This contract covers barcode lookup, product identity, source metadata, Nutri-Score, normalized ingredient names, a finite nutrition catalogue, and explicit unavailable states. It does not implement the endpoint, source client, mapper, scanner, profile storage, warning evaluation, database, cache, bulk import, or source write flow.

## Versioning

Every response carries `contractVersion: "1.0"`. Adding an optional source mapping may be compatible, but changing lookup branches, normalized identifiers, units, bases, required fields, or availability meaning requires a reviewed contract-version change and corresponding schema and fixture updates.

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

- `available`: `names` contains zero or more normalized ingredient-name strings.
- `missing`: the source supplies no ingredient evidence that GoodGut can normalize.
- `unparseable`: ingredient evidence exists, but structured parsing is incomplete, inconsistent, or otherwise unsafe for exact matching.

For Open Food Facts, use this trust order:

1. Prefer the structured nested `ingredients` result and canonical ingredient tags returned by the selected v3 product schema.
2. Check parsing metadata, including known/unknown ingredient counts and ingredient language where supplied.
3. Emit `available` only when the structured result is sufficiently complete to represent the label evidence without silently dropping unknown entries.
4. Emit `unparseable` when raw ingredient text exists but structured parsing is absent or incomplete.
5. Emit `missing` when ingredient evidence is absent.

Do not split arbitrary ingredient prose in GoodGut. Do not translate, fuzzy-match, or infer synonyms during source normalization. Downstream predefined rules own reviewed aliases; custom rules use case-insensitive exact names. An absent list must never normalize to `available` with an empty array.

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
| Nutrition | As-sold per-100g/per-100ml nutriment values and units for the fixed catalogue |

Raw source fields never become the public mobile contract. Production mapping belongs to roadmap slice S-01.

## Source Compliance

- Use a custom `User-Agent` in the documented `AppName/Version (ContactEmail)` form.
- Keep this MVP path read-only and complete the Open Food Facts API usage declaration before production use.
- Preserve required database and image attribution/licensing.
- Respect current read limits and map throttling or HTTP 503 to `source_error`, never `not_found`.
- Recheck current API version, terms, licenses, and rate limits before production rollout.

## Fixtures and Automated Tests

Recorded raw source snapshots live under `services/api/src/test/resources/fixtures/openfoodfacts/raw/`; paired expected GoodGut results live under `normalized/`. Automated tests must be offline. Live checks and snapshot refreshes are manual, attributable, reviewed operations.

The canonical schemas remain in `docs/reference/schemas/`. Do not maintain copied schema variants in API or mobile modules.
Minimal examples for all lookup branches live in `docs/reference/examples/` and must validate against the lookup schema.

## Downstream Handoff

- S-01 implements source lookup and normalization against this contract.
- S-03 consumes ingredient availability and normalized names for avoided-ingredient warnings.
- S-05 consumes independently based nutrition facts for threshold warnings.
- Profile configuration and warning presentation do not change this source contract.

## References

- `context/foundation/prd-v3.md`
- `context/foundation/roadmap.md`
- Open Food Facts API: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/`
- Ingredient schema: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_ingredients/`
- Schema change log: `https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ref-api-and-product-schema-change-log/`
