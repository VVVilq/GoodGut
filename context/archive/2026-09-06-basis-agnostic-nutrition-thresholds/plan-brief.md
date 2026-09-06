# Basis-agnostic nutrition thresholds — Plan Brief

> Full plan: `context/changes/basis-agnostic-nutrition-thresholds/plan.md`

## What & Why

Nutrition rules currently require users to choose either per 100 g or per 100 ml. A gram rule therefore makes a liquid product appear incompletely analyzed, even when the product supplies a valid millilitre value. This change makes one saved numeric threshold apply to either product basis without pretending to convert between them.

## Starting Point

The mobile domain, persistence codec, editor, composer, and result presentation all carry and enforce a saved basis. Product facts already report their actual basis through the unchanged API contract.

## Desired End State

Users configure one threshold per nutrient. The app evaluates it against available per-100-g or per-100-ml facts, preserves strict comparisons and equality behavior, and displays the product’s actual basis in the warning detail. Existing profiles migrate without losing configured values.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Legacy migration | Drop basis in v3 → v4 | Preserves threshold values while removing obsolete semantics. |
| Editor | Remove basis selector | One threshold should not require a basis choice. |
| Editor explanation | Add a short scope note | Users should understand the threshold applies to either product basis. |
| Trigger detail | Show actual product basis | Explains exactly what source value was compared. |
| Unknown basis | Keep unavailable | Avoids comparing an unqualified value. |
| API contract | Keep product basis field | The result still needs the source basis for display. |
| Automated coverage | Full boundary matrix | Protects both bases, equality, unavailable facts, migration, and refresh behavior. |
| Android acceptance | Deterministic fixtures | Makes cross-basis outcomes reproducible. |

## Scope

**In scope:** domain rule semantics, schema-v3-to-v4 migration, editor controls/copy, result presentation, integration tests, deterministic fixtures, and verification docs.

**Out of scope:** density conversion, API changes, additional thresholds, barcode keyboard cosmetics, and unrelated scan behavior.

## Architecture / Approach

Product facts retain their source basis. Saved rules retain only nutrient, direction, and threshold. The evaluator compares raw values when facts are available; the composer and presentation retain actual-basis display context while removing basis mismatch from unavailable reasons.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Domain and persistence migration | Basis-free rule model and safe v3→v4 migration | Losing old threshold values or weakening validation |
| 2. Editor and result presentation | Basis-free configuration and clear actual-basis warnings | Ambiguous copy or stale mismatch UI |
| 3. Integration and fixture acceptance | End-to-end cross-basis tests and deterministic Android checks | Missing a basis/unavailable edge case |

**Prerequisites:** Existing nutrition-warning-scan implementation and fixture-server pattern.
**Estimated effort:** ~2–3 implementation sessions across 3 phases.

## Open Risks & Assumptions

- The same numeric threshold is intentionally applied to either basis without physical conversion.
- Unknown basis remains unavailable.
- Barcode keyboard behavior is tracked separately.

## Success Criteria (Summary)

- A single saved threshold triggers correctly for both gram and millilitre product facts.
- Existing schema-v3 profiles retain their configured values after migration.
- Android fixture checks show no incomplete status caused solely by basis difference.
