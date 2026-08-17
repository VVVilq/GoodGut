# GoodGut Product Data Contract

Status: draft for MVP implementation

This document defines GoodGut's normalized product lookup contract. GoodGut uses Open Food Facts as the live MVP lookup source, but the mobile app and disease-analysis code must depend on this GoodGut contract, not on raw Open Food Facts JSON.

## Scope

This contract supports the first barcode-based product lookup flow:

- Find a product by scanned barcode.
- Show Nutri-Score when it is available.
- Expose enough normalized nutrition and ingredient evidence for later profile-specific analysis.
- Represent missing or insufficient data explicitly.
- Avoid any disease-profile suitability judgment when required inputs are missing.

This contract does not define a full product database import, cache, schema migration, background refresh job, manual search, product browsing, or Open Food Facts write/contribution flow. A future import or cache may reuse this normalized contract as its stable API boundary.

## Source

Open Food Facts is the live MVP lookup source.

- Source docs: `https://openfoodfacts.github.io/openfoodfacts-server/api/`
- Lookup mode: read-only barcode product lookup.
- GoodGut API ownership: the Spring API calls Open Food Facts and normalizes the response before returning data to mobile.
- Client identity: every Open Food Facts request from GoodGut must use a custom `User-Agent` that identifies GoodGut and provides a contact path.
- Attribution and license: GoodGut must preserve attribution requirements from Open Food Facts before production rollout.
- Rate limits and source errors: GoodGut must treat rate limits, network failures, malformed responses, and source downtime as explicit source-error states, not as product judgments.

## Lookup Outcomes

Every product lookup returns exactly one of these top-level outcomes.

| Outcome | Meaning | User-facing implication |
| --- | --- | --- |
| `found` | The barcode resolved to a product from Open Food Facts and GoodGut could normalize the product identity. | The app may show the recognized product and any available Nutri-Score or readiness states. |
| `not_found` | The barcode did not resolve to a product in the live MVP source. | The app should show a clear product-not-found state. |
| `source_error` | GoodGut could not complete lookup because the source request failed or returned unusable data. | The app should show a temporary lookup problem, not a product or health judgment. |

`not_found` and `source_error` are distinct. A product that is found but lacks analysis inputs remains `found`; the missing data is represented inside `analysisReadiness`.

## Normalized Product Shape

The future API response should follow this conceptual shape. Field names are contract-level names; implementation may use Java records/classes and JSON serialization that preserve these names.

```json
{
  "outcome": "found",
  "barcode": "string",
  "source": {
    "provider": "open_food_facts",
    "providerProductUrl": "string | null",
    "fetchedAt": "ISO-8601 timestamp"
  },
  "product": {
    "displayName": "string",
    "brands": ["string"],
    "quantity": "string | null",
    "imageUrl": "string | null"
  },
  "nutriScore": {
    "status": "available | missing",
    "grade": "a | b | c | d | e | null"
  },
  "nutritionPer100": {
    "basis": "100g_or_100ml",
    "carbohydratesG": "number | null",
    "sugarsG": "number | null",
    "fiberG": "number | null"
  },
  "ingredientEvidence": {
    "ingredientsText": "string | null",
    "allergenTags": ["string"],
    "glutenEvidence": "present | absent | unknown"
  },
  "analysisReadiness": {
    "diabetes": {
      "status": "ready | insufficient_data",
      "missingFields": ["string"],
      "reason": "string | null"
    },
    "celiac": {
      "status": "ready | insufficient_data",
      "missingFields": ["string"],
      "reason": "string | null"
    },
    "wzjg": {
      "status": "ready | insufficient_data",
      "missingFields": ["string"],
      "reason": "string | null"
    }
  }
}
```

For `not_found`, GoodGut should return `outcome`, `barcode`, `source.provider`, and a machine-readable reason. It should not fabricate a product object.

For `source_error`, GoodGut should return `outcome`, `barcode`, `source.provider`, and a machine-readable error category such as `rate_limited`, `network_error`, `invalid_source_response`, or `source_unavailable`.

## Required Normalized Fields

| Field group | Required for `found` | Notes |
| --- | --- | --- |
| Barcode | Yes | The scanned code and normalized lookup key. |
| Product identity | Yes | At minimum `displayName`; brand and quantity may be absent. |
| Source metadata | Yes | Provider and fetch metadata are needed for debugging and attribution. |
| Nutri-Score | Yes as a status | `grade` may be null when `status` is `missing`. |
| Nutrition per 100 | Yes as a group | Individual nutrient values may be null; readiness captures consequences. |
| Ingredient evidence | Yes as a group | Raw text/tags may be absent; gluten evidence can be `unknown`. |
| Analysis readiness | Yes | Each supported condition gets an independent readiness state. |

## Open Food Facts Mapping

GoodGut maps source data into its own fields. Raw Open Food Facts fields should not be passed through to mobile as the public API contract.

| GoodGut field | Open Food Facts source concept | Normalization rule |
| --- | --- | --- |
| `barcode` | Barcode path/input and source code value | Preserve the scanned barcode used for lookup. |
| `product.displayName` | Product name fields | Prefer the best localized or default product name available. |
| `product.brands` | Brand fields | Normalize to a list; empty list is allowed. |
| `product.quantity` | Quantity/serving package text | Optional display metadata only. |
| `product.imageUrl` | Product image URL | Optional display metadata only. |
| `nutriScore.grade` | Nutri-Score grade | Normalize to lowercase `a` through `e`; otherwise set status `missing`. |
| `nutritionPer100.carbohydratesG` | Carbohydrates per 100g/100ml | Numeric grams per 100g/100ml, null if unavailable. |
| `nutritionPer100.sugarsG` | Sugars per 100g/100ml | Numeric grams per 100g/100ml, null if unavailable. |
| `nutritionPer100.fiberG` | Fiber per 100g/100ml | Numeric grams per 100g/100ml, null if unavailable. |
| `ingredientEvidence.ingredientsText` | Ingredients text | Preserve for explanation and gluten-evidence mapping. |
| `ingredientEvidence.allergenTags` | Allergen/tag evidence | Normalize to a list of source tags. |
| `ingredientEvidence.glutenEvidence` | Allergen tags and ingredient text | `present` when source evidence indicates gluten; `absent` only when source evidence is explicit enough; otherwise `unknown`. |

## Nutrition Basis

GoodGut uses per-100g/per-100ml nutrition values for MVP analysis inputs. Serving-level values are out of scope for this contract version because serving sizes are inconsistent and often absent.

The `nutritionPer100.basis` value is always `100g_or_100ml`. If Open Food Facts provides values in another basis only, GoodGut should treat the specific nutrient as missing unless a later implementation explicitly adds safe conversion rules.

## Missing Data and No-Judgment Semantics

Missing data is not represented only by null values. Each analysis area must expose readiness so the UI and future analysis code can distinguish available data from insufficient evidence.

Rules:

- If the lookup outcome is `found` and Nutri-Score is available, GoodGut may display Nutri-Score even when disease-profile analysis is unavailable.
- If Nutri-Score is missing, the product can still be `found`; the Nutri-Score section reports `status: "missing"`.
- If disease-profile inputs are insufficient, GoodGut must not return a suitability score, recommendation, "safe", "avoid", or similar judgment for that disease profile.
- For insufficient disease-profile data, GoodGut returns `status: "insufficient_data"` with `missingFields` and a reason suitable for mapping to `brak_wiarygodnej_oceny`.
- A missing-data state is a reliability guardrail, not an error.

Initial readiness requirements:

| Profile | Ready when | Insufficient when |
| --- | --- | --- |
| Diabetes | `sugarsG`, `carbohydratesG`, and `fiberG` are available per 100g/100ml. | Any of those fields is missing. |
| Celiac | Gluten evidence is `present` or `absent` based on explicit allergen or ingredient evidence. | Gluten evidence is `unknown`. |
| WZJG | Future guardrail rules can identify the needed input fields. | Until those fields are defined, WZJG readiness may be `insufficient_data` with a reason that rules are not yet established. |

## Recorded Fixture Contract

Future API mapping and contract tests must use a fixed initial inventory of exactly six scenarios:

1. `found-with-nutri-score`: a recognized product with an available Nutri-Score grade.
2. `not-found`: a valid barcode that Open Food Facts reports as not found.
3. `found-without-nutri-score`: a recognized product whose Nutri-Score is missing.
4. `diabetes-inputs`: a recognized product with carbohydrates, sugars, and fiber per 100g/100ml so diabetes readiness can be evaluated.
5. `gluten-evidence`: a recognized product with explicit allergen or ingredient evidence for gluten mapping.
6. `wzjg-partial-data`: a recognized product with partial or missing WZJG-relevant inputs, producing `insufficient_data` without a suitability judgment.

Each scenario has two recorded JSON files with the same scenario basename:

- Raw Open Food Facts responses belong in `services/api/src/test/resources/fixtures/openfoodfacts/raw/`.
- Expected GoodGut-normalized outputs belong in `services/api/src/test/resources/fixtures/openfoodfacts/normalized/`.

Automated tests must read these recorded fixtures and must not call the live Open Food Facts API. Live API checks are manual smoke checks only, because source availability, rate limits, and product records can change independently of GoodGut.

## Compliance Notes

Before production use, implementation must confirm current Open Food Facts requirements. At minimum:

- Send a custom GoodGut `User-Agent`.
- Keep lookup read-only for this MVP path.
- Attribute Open Food Facts according to its current license and terms.
- Respect rate limits and avoid automated bulk download through the live lookup API.
- Treat a future import/cache as a separate change with its own license, storage, backup, and rollback review.

## References

- GoodGut roadmap: `context/foundation/roadmap.md`
- GoodGut PRD v2: `context/foundation/prd-v2.md`
- Open Food Facts API docs: `https://openfoodfacts.github.io/openfoodfacts-server/api/`
