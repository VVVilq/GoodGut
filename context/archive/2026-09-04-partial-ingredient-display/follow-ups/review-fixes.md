# Implementation review follow-ups

- F1 fixed in `OpenFoodFactsProductMapper`: source text keeps internal content while allergen markers are normalized; ID fallback applies deterministic readable formatting.
- F2 fixed via Fix B: identical display-name duplicates intentionally share warning presentation; rule documented in the plan.
- F3 fixed in the mobile decoder: empty available ingredient lists are rejected and covered by a regression test.
- F4 fixed in the API domain model: recognized node and ancestor IDs must use canonical `ll:value` syntax.
