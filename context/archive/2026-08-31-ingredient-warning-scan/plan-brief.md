# Ingredient Warning Scan — Revised Plan Brief

## Outcome

GoodGut uses a server-owned, versioned Open Food Facts ingredient catalogue. Users start with promoted ingredients, can search the full Polish/English catalogue, and choose one taxonomy node or its descendant branch.

## Architecture

- Railway PostgreSQL stores immutable OFF releases, labels, synonyms, and parent edges.
- Imports are manual, pinned, validated, atomically activated, and reversible.
- The API classifies product ingredients and returns stable taxonomy evidence plus complete/partial status.
- The anonymous profile stays on the phone; selections and custom text never leave it.
- Mobile applies `node`/`subtree` selections and retains exact custom-text fallback.
- OFF ancestry is the only family authority; GoodGut adds no derived family edges.

## UX and Migration

- Show promoted choices first, then server search across Polish/English names and synonyms.
- Show breadcrumbs and make `tylko składnik` versus `cała gałąź` explicit.
- Remove redundant descendants under a selected subtree.
- Show certain warnings for partial products but never a trustworthy zero.
- Keep saved selections usable during catalogue outages.
- Intentionally reset profile v1 on upgrade and explain it once instead of reporting corruption.

## Delivery

1. Preserve the existing warning presentation.
2. Add PostgreSQL, Flyway, and safe OFF import.
3. Add catalogue APIs, mobile cache, profile v2, and hierarchical editor.
4. Introduce product contract 2.0 and server classification.
5. Integrate personalized warnings and complete Android/Railway acceptance.

Full plan: `context/changes/ingredient-warning-scan/plan.md`
