# Partial ingredient display — Plan Brief

> Full plan: context/changes/partial-ingredient-display/plan.md

## What & Why

GoodGut currently discards structured ingredients that the local taxonomy cannot classify and may show only “nie udało się wiarygodnie odczytać składników”. This change keeps those source positions visible, marks them as uncertain, and preserves the user's ability to create an exact custom-ingredient warning.

## Starting Point

The API mapper emits only classified ProductIngredientItem records, while contract 2.0 and mobile decoding require taxonomy IDs for every item. Mobile already has per-item red warning presentation and partial-evidence semantics, but no unrecognized-item state or yellow theme.

## Desired End State

Contract 3.0 returns an ordered union of recognized and unrecognized ingredient items. Mobile displays the full structured list, uses yellow text for unrecognized items, shows a concise partial-data explanation, and gives red precedence when an exact custom rule matches.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Item model | recognition: recognized or unrecognized | Prevents missing taxonomy evidence from being mistaken for a recognized item. |
| Ordering | Preserve every source leaf and duplicate | The result should reflect the source label faithfully. |
| No catalogue | Show displayable leaves as unrecognized partial data | Extraction and classification are separate concerns. |
| Custom rules | Exact custom names may match either status | User-entered ingredients are an explicit assertion; taxonomy rules remain evidence-bound. |
| Visual state | Yellow text plus accessible status; red wins | Keeps the UI readable while preserving warning priority. |
| Contract | Coordinated 3.0 release | Required-field and availability semantics change. |
| Regression | Deterministic fixture plus Android 5900242001610 scan | Combines repeatability with the real reported product. |

## Scope

**In scope:** API domain/mapper, contract schemas and fixtures, mobile decoder/evaluator/presentation, yellow theme/accessibility, offline and Android regression tests.

**Out of scope:** fuzzy matching, raw prose parsing, taxonomy imports, profile transmission, medical claims, nutrition/S-05 warnings, and combined warning counts.

## Architecture / Approach

    Open Food Facts structured leaves
             ↓ preserve order/text
    API mapper → recognized evidence OR unrecognized marker
             ↓ contract 3.0
    Mobile decoder → strict union
             ↓
    Rule evaluator (taxonomy evidence / exact custom text)
             ↓
    Presentation (neutral / yellow / red precedence)

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Contract 3.0 | Union schema, examples, fixtures | Version drift between API and mobile |
| 2. Backend mapping | Ordered preservation and safe fallback | Fabricated taxonomy evidence |
| 3. Mobile evaluation | Strict decode and rule boundaries | False taxonomy/custom matches |
| 4. Presentation | Yellow uncertainty and red precedence | Accessibility and visual ambiguity |
| 5. Acceptance | End-to-end and Majonez regression | Live source instability |

**Prerequisites:** Existing API/mobile contract tests and the local catalogue fixture setup.
**Estimated effort:** ~2–4 implementation sessions across 5 phases.

## Open Risks & Assumptions

- Contract 3.0 requires coordinated API/mobile deployment; mixed versions must fail explicitly.
- A real Majonez snapshot is added only when its provenance can be recorded; synthetic coverage remains mandatory.
- Exact custom matching against unrecognized text is intentional and remains case-insensitive but not fuzzy.

## Success Criteria (Summary)

- The reported barcode displays all structured ingredient positions, including unresolved ones, without the old blocking message.
- Yellow uncertainty is clear, red custom matches take precedence, and taxonomy rules never use unresolved evidence.
- API/mobile automated gates and physical Android accessibility/privacy regressions pass.
