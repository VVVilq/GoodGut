# Nutrition warning scan implementation plan

## Overview

Deliver roadmap slice S-05 by applying the complete saved personal profile to a scanned product. Show one summary message with the total triggered-rule count, highlight corresponding ingredient text and nutrition facts, and explain unavailable evaluations without presenting them as non-matches.

The user approved three phases on 2026-09-05: combined evaluation, result presentation, and Android verification. Their explicit single-summary design replaces the earlier separate triggered-rule list for this slice; specific triggers are shown in the product facts. The PRD's comparison, privacy, and missing-data requirements remain authoritative.

## Current State Analysis

The mobile app already persists eight supported nutrition thresholds, one per nutrient, with stable IDs, explicit direction, and per-100-g or per-100-ml basis. The domain evaluator handles mixed rules, strict comparisons, equality, and unavailable facts. The result presentation currently calls only the ingredient composer, so a nutrition-only profile produces no personalized result.

The existing result contains an ingredient summary with individual warning rows and a nutrition table without warning state. Ingredient display preserves source order and duplicates, highlights certain matches, and marks unresolved leaves separately. The existing result route subscribes to both lookup and saved-profile state.

### Key discoveries

- `apps/mobile/src/domain/personal-rules.ts:151`: `evaluatePersonalRules` already returns triggered and unavailable rule IDs and a total. Reuse its comparison semantics.
- `apps/mobile/src/domain/personal-rules.ts:86`: `productFactsFromContract` strips unavailable reasons; retain original normalized facts for explanations.
- `apps/mobile/src/domain/personal-profile.ts:159`: `profileToPersonalRules` already projects the complete validated profile; nutrition IDs are `nutrition:<nutrient>`.
- `apps/mobile/src/features/product-lookup/ingredient-warning-composition.ts:35`: existing lifecycle and ingredient evidence handling are reusable, but missing ingredients must not short-circuit nutrition evaluation.
- `apps/mobile/src/features/product-lookup/presentation.ts:102`: current integration point evaluates only ingredient rules.
- `apps/mobile/src/features/personal-profile/profile-store.ts:42`: the active saved profile remains available during saving and save failure. Candidate edits must never affect results.
- `apps/mobile/src/app/result.tsx:10`: presentation already recomputes from both stores; no additional product request is needed after saving a profile.
- `apps/mobile/src/domain/product-lookup/__tests__/decoder-test.ts:1`: mobile tests already consume shared wire fixtures from API test resources and `docs/reference/examples/`.

## Desired End State

A shopper with ingredient and/or nutrition rules sees a single count summary above product facts. Each triggered ingredient remains highlighted in place. Triggered nutrition names and values are red, accompanied by a warning icon and a discoverable tap affordance. Tapping a triggered nutrition row expands its saved condition directly below it; tapping again collapses it.

Unavailable configured rules make the summary explicitly incomplete. Tapping that summary expands their reasons. No separate list of triggered rules appears. Non-triggering and equal nutrition values retain ordinary styling and have no threshold disclosure.

### Approved behavior contract

| Situation | Required behavior |
| --- | --- |
| No saved rules | Product facts remain visible; no personalized summary or highlights. |
| Profile loading or load failure | Preserve loading/error presentation and retry/profile actions; never imply zero. |
| Complete evaluation, zero triggers | Show `0 ostrzeżeń`, with ordinary facts styling. |
| Complete evaluation, triggers | One correctly pluralized Polish count message; specific triggers appear only as highlighted facts. |
| Incomplete evaluation, zero triggers | Lead with `Ocena niepełna — 0 potwierdzonych ostrzeżeń`; allow expansion of reasons. |
| Incomplete evaluation, triggers | One message such as `2 ostrzeżenia — ocena niepełna`; retain all certain highlights and allow expansion of reasons. |
| Matching basis, strict above/below crossing | Trigger exactly once per saved rule; compare unrounded values. |
| Equality | Does not trigger; ordinary nutrition row. |
| Missing, invalid, unsupported-unit, unknown-basis fact | Configured rule is unavailable; name it in expanded reasons. |
| Available fact with mismatched rule basis | Rule is unavailable; explain both bases without conversion. The valid product fact stays visible in ordinary styling. |
| Missing ingredients, available nutrition | Continue nutrition evaluation; ingredient rules remain unavailable. |
| Partial ingredient evidence | Preserve certain matches and the source notice in ingredient facts. Affect summary completeness only when at least one ingredient rule is configured, including when all such rules already matched. |
| Unrelated absent facts | Remain in ordinary product details, without adding summary reasons. |

Count triggered rules, not highlighted positions, ingredient occurrences, or expanded rows. Multiple ingredient rules can legitimately trigger on the same product text. Preserve matching by taxonomy evidence and exact custom names, including red precedence over unresolved/yellow display and the accepted duplicate-display-name behavior.

## What We're NOT Doing

- API contract changes, server-side personalization, database changes, or profile migrations.
- New nutrients, multiple thresholds per nutrient, serving conversions, tolerance bands, or rounded comparisons.
- Profile editor redesign or changes to its approved sliders.
- Separate triggered-rule cards, positive/green rule states, or explanations for ordinary non-triggering nutrition rows.
- Medical judgments, login, scan history, deployment automation, or new production debug screens.

## Implementation Approach

Add a framework-independent combined composer beside the current ingredient composer. Evaluate the complete saved rule set through the existing domain evaluator. Reuse ingredient evidence for highlighting and partial-source status; enrich nutrition results from saved thresholds and original normalized facts. Keep one authoritative total from mixed evaluation rather than adding independently displayed counts.

Presentation transforms the composition into one summary, optional unavailable-reason details, ingredient states, and nutrition row states with optional threshold explanation. The React Native component owns only expansion state. Keep all comparisons and count decisions outside routes and visual components.

For deterministic Android checks, provide a small development-only HTTP fixture server outside the mobile app. The normal API client and decoder consume its contract-v3 responses through the existing `EXPO_PUBLIC_API_BASE_URL` setting. Real scanning is checked separately against the normal API.

## Critical Implementation Details

### State sequencing

Evaluate `activeProfile`, including during `saving` and `save_error`; never evaluate `candidate`. Successful saves must refresh the displayed result without another lookup. Disclosure state must reset when the lookup result or evaluated saved rules change, so an explanation from one product/profile cannot appear on another.

### User experience spec

Threshold disclosure is inline beneath the tapped nutrition row; multiple rows may expand independently. The summary disclosure is initially collapsed and lists unavailable configured rules in ingredient-then-nutrient order, with nutrients in catalogue order. Ingredient-source incompleteness affects the summary only when at least one ingredient rule is configured. If ingredient evidence is partial and all configured ingredient rules matched, include the source-completeness explanation without falsely classifying a triggered rule as unavailable. For nutrition-only profiles, partial, missing, or unparseable ingredients do not affect summary completeness; preserve their source notices in ingredient facts. Preserve full facts order and content.

Both disclosure controls need button semantics, expanded state, a meaningful Polish label, and visible tap cues. Threshold text includes direction, saved value, unit, and basis. Warning styling includes an icon and accessible text, not colour alone. Long values and explanations must wrap without horizontal clipping.

## Phase 1: Combined evaluation

### Overview

Create a tested combined evaluation boundary while leaving the current screen integration for Phase 2.

### Changes Required

#### 1. Combined composition

**File:** `apps/mobile/src/features/product-lookup/personal-warning-composition.ts` (new)

**Intent:** Compose lookup state and the saved profile into one reliable result covering both rule types.

**Contract:** Preserve not-applicable/profile-loading/profile-error/no-rules states. For evaluated results expose configured-rule count, triggered IDs/count, ingredient match evidence, triggered nutrition metadata, unavailable configured-rule reasons, and ingredient-source incompleteness. Represent a basis mismatch separately from unavailable-source reasons. A triggered ID must not also be classified as unavailable.

#### 2. Reuse existing domain and ingredient boundaries

**Files:** `apps/mobile/src/domain/personal-rules.ts`, `apps/mobile/src/domain/personal-profile.ts`, `apps/mobile/src/features/product-lookup/ingredient-warning-composition.ts`

**Intent:** Reuse full-profile projection, strict evaluator behavior, and ingredient evidence without duplicating nutrition comparison logic.

**Contract:** Existing rule IDs, ordering, taxonomy/custom matching, and partial evidence semantics remain stable. Modify these modules only if a small shared extraction is necessary; do not introduce an alternate threshold evaluator.

#### 3. Composition coverage

**Files:** `apps/mobile/src/features/product-lookup/__tests__/personal-warning-composition-test.ts` (new), existing ingredient composition and domain evaluator tests

**Intent:** Prove mixed counts, independent evaluation availability, and saved-profile lifecycle handling.

**Contract:** Cover nutrition-only, ingredient-only, mixed, no-rule, equality, both directions/bases, both mismatch directions, zero/decimal values, all unavailable reasons, unrelated missing fields, partial ingredients, unavailable ingredients with nutrition triggers, and saving/save-error candidate isolation. Preserve existing ingredient regressions. Use complete `PersonalProfile` fixtures rather than helpers that force nutrition thresholds to empty.

Explicitly test nutrition-only profiles with partial, missing, and unparseable ingredients, for both triggering and non-triggering available nutrition facts. Their summaries remain complete with the exact nutrition count and no ingredient-related unavailable reasons. Presentation coverage must also prove ingredient-source notices remain in product details. Retain the counterpart case with configured ingredient rules, where partial evidence still makes the summary incomplete even when all ingredient rules match.

### Success Criteria

#### Automated Verification

- Combined composition matrix passes, including exact counts and incomplete-source preservation: `npm.cmd test -- --runTestsByPath src/features/product-lookup/__tests__/personal-warning-composition-test.ts` from `apps/mobile/`.
- Mobile lint, types, and regression tests pass: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` from `apps/mobile/`.

**Implementation Note:** No manual gate applies to this pure composition phase; proceed after automated verification passes.

## Phase 2: Result presentation

### Overview

Wire combined evaluation into the scan result and implement the approved single-summary interactions.

### Changes Required

#### 1. Presentation contract and copy

**File:** `apps/mobile/src/features/product-lookup/presentation.ts`

**Intent:** Replace ingredient-only summary presentation with the combined summary and nutrition row metadata.

**Contract:** The summary exposes one message, incomplete state, optional unavailable details, and existing profile actions. Remove its separate triggered-rule list. Nutrient rows expose warning state, accessible text, and a threshold explanation only when triggered. Format threshold values consistently with existing Polish nutrition formatting; use correct Polish count inflection beyond four warnings. Unavailable reasons identify the saved rule and distinguish missing data, unknown basis, invalid value, unsupported unit, and basis mismatch.

#### 2. Result UI and disclosures

**File:** `apps/mobile/src/components/product-facts/product-result.tsx`

**Intent:** Show the single summary, preserve ingredient highlights, and make triggered nutrition values explainable in place.

**Contract:** Both nutrient name and value use the existing warning theme with an icon and tap cue. Tapping toggles an explanation below the row. Tapping an incomplete summary toggles unavailable details below its message. Ordinary rows remain noninteractive. Reset expansion on evaluated product/profile changes. Retain loading, retry, profile navigation, source attribution, and full product facts.

#### 3. Route and interaction verification

**Files:** `apps/mobile/src/app/result.tsx`, `apps/mobile/src/features/product-lookup/__tests__/presentation-test.ts`, `apps/mobile/src/components/product-facts/__tests__/product-result-test.tsx` (new)

**Intent:** Keep route composition thin and verify the rendered behavior as well as the pure presentation model.

**Contract:** Route changes are limited to any required presentation reset identity; do not add network work or evaluation logic. Test press-to-expand/collapse, one summary without triggered-rule list, inaccessible data disclosures, ordinary-row behavior, and stale-disclosure reset with the existing Jest setup. Use available React test facilities; no new application dependency is required.

### Success Criteria

#### Automated Verification

- Presentation and component interaction tests pass for the approved summary, highlights, disclosures, and reset behavior: `npm.cmd test -- --runTestsByPath src/features/product-lookup/__tests__/presentation-test.ts src/components/product-facts/__tests__/product-result-test.tsx` from `apps/mobile/`.
- Mobile lint, types, and regression tests pass: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` from `apps/mobile/`.

**Implementation Note:** Physical acceptance is consolidated into Phase 3, after its repeatable fixture setup exists. Automated completion here does not claim Android acceptance.

## Phase 3: Android verification

### Overview

Make edge cases reproducible on a phone, exercise the full saved-profile-to-result flow, and record physical acceptance separately from automated results.

### Changes Required

#### 1. Fixture server and scenario data

**Files:** `scripts/nutrition-warning-fixture-server.mjs` (new), `scripts/fixtures/nutrition-warning-scan/` (new)

**Intent:** Serve a finite set of documented barcode responses for Android edge-case checks through the normal client request path.

**Contract:** Use Node built-ins and a documented LAN-reachable port, implementing only `GET /products/<fixture-barcode>` with contract-v3 fixtures. Support complete solid/liquid, partial ingredients, missing ingredients, unavailable nutrition reasons, and mixed-basis cases. Unknown barcodes return a contract not-found response. Start/stop is explicit; no product route or fixture switch ships in the mobile bundle. Fixture profiles are configured through normal editors, using custom ingredients so catalogue connectivity is unnecessary during fixture checks. Document exact profile values, barcode, and expected count per scenario.

#### 2. Boundary and saved-profile integration tests

**Files:** `apps/mobile/src/features/product-lookup/__tests__/personal-warning-integration-test.ts` (new), fixture data above, existing `apps/mobile/src/data/__tests__/personal-profile-integration-test.ts`

**Intent:** Exercise wire decoding, persisted profile projection, combined composition, and presentation together.

**Contract:** Include at least one unchanged shared API producer/consumer fixture, plus deterministic scenario fixtures. Prove equality, both bases, mismatch, mixed counts, empty profiles, partial and unavailable facts, and saved edits changing a displayed product without a lookup. Candidate edits and failed saves retain the prior result. Validate every served scenario through the mobile decoder. Keep API source fixtures unchanged unless a documented fixture defect requires correction.

#### 3. Verification instructions and evidence

**Files:** `context/changes/nutrition-warning-scan/verification.md` (new during implementation), `apps/mobile/README.md`, `context/foundation/test-plan.md`

**Intent:** Supply reproducible Android steps and link S-05 risks to their automated and manual evidence.

**Contract:** Document fixture server startup, temporary API URL, normal profile setup, exact cases/expected counts, and restoration of the normal API URL before the live scan. Record actual command results and device acceptance honestly; leave unperformed checks pending. Add S-05 test mappings without rewriting historical foundation entries.

### Success Criteria

#### Automated Verification

- All scenario fixtures and saved-profile-to-presentation integration cases pass: `npm.cmd test -- --runTestsByPath src/features/product-lookup/__tests__/personal-warning-integration-test.ts` from `apps/mobile/`.
- Mobile lint, types, and full tests pass: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` from `apps/mobile/`.
- API regression gate passes: `.\mvnw.cmd test` from `services/api/`.
- Fixture server returns the documented scenario responses and contract not-found fallback; startup, request, and shutdown evidence is recorded in `verification.md`.

#### Manual Verification

- Android fixture cases confirm mixed counts, equality, both bases, mismatch, missing nutrition, and partial/missing ingredient behavior against the documented expected results.
- Android confirms nutrition threshold and summary reason disclosures, light/dark warning visibility, long-text wrapping, and TalkBack labels/expanded states.
- Android confirms save/discard and relaunch behavior, updated warnings after returning from profile editing, no-rule facts, and retry/rescan navigation.
- A live physical barcode scan through the normal API displays current product facts and correct configured-rule results; device, barcode, observed values, and outcome are recorded.

**Implementation Note:** After automated checks pass, request human confirmation for these Android checks. Do not mark manual Progress entries complete from automated evidence or archive the change before acceptance and review triage are complete.

## Testing Strategy

Domain boundary tests already cover strict comparison mathematics; extend them only for uncovered semantics. New composition tests target the integration failure modes, particularly early returns suppressing the other rule type and unavailable inputs becoming a trustworthy zero. Presentation/component tests verify the agreed interaction rather than only snapshot structure.

The fixture matrix must include a solid with sugars 12 g/100 g against above 10 (trigger), above 12 (equality), and below 13 (trigger); a liquid with matching per-100-ml rules; both mismatch directions; zero against a positive below threshold; and explicit unavailable reasons. Mixed examples include a custom ingredient and a nutrition trigger for a count of two, plus a third unavailable configured rule whose presence changes completeness but not the count. Include partial evidence with both unmatched and fully matched configured ingredient rules.

Manual sequence: start fixture server, point Expo at its LAN URL, configure documented profiles, enter fixture barcodes through normal manual entry, verify UI/disclosures, edit/save and return to the result, relaunch to confirm persistence, then restore the real API and scan a physical barcode. Live data is mutable; record actual facts and evaluate expectations from those facts rather than asserting a fixed external-source response.

## Performance Considerations

All evaluation remains on-device against the existing saved profile and fetched product. Add no product requests when a disclosure toggles or a profile is saved. At most eight nutrition rules are evaluated. Keep input ordering stable; no new cache or performance framework is needed.

## Migration Notes

No persisted or wire schema changes. Reverting the mobile change restores the previous ingredient-only result flow without modifying stored nutrition rules. The fixture server is a development tool; restore the normal API environment setting after acceptance.

## Open Risks & Assumptions

- External source values may change or omit comparison bases; deterministic fixtures prove edge cases and the live scan proves connectivity and actual lookup behavior.
- Partial source completeness and configured-rule availability are distinct. Preserve source notices in product details; include ingredient incompleteness in the summary only when ingredient rules are configured, even if all those rules match.
- `apps/mobile/AGENTS.md` references Expo v56 docs while the installed project targets v57. Before writing code, read the required versioned guidance and verify any framework APIs used against the installed version; this slice does not change dependencies.
- Human Android access is required for final acceptance. Unavailable device access leaves manual checks pending, not implicitly passed.

## References

- Requirements: `context/foundation/prd-v3.md`, US-01 and FR-003 through FR-010.
- Roadmap: `context/foundation/roadmap.md`, S-05.
- Risk map: `context/foundation/test-plan.md`.
- Domain evaluation: `apps/mobile/src/domain/personal-rules.ts:151`.
- Saved profile projection: `apps/mobile/src/domain/personal-profile.ts:159`.
- Existing composition: `apps/mobile/src/features/product-lookup/ingredient-warning-composition.ts:35`.
- Existing result presentation: `apps/mobile/src/features/product-lookup/presentation.ts:102`.
- Saved state selection: `apps/mobile/src/features/personal-profile/profile-store.ts:42`.
- Shared fixture decoding: `apps/mobile/src/domain/product-lookup/__tests__/decoder-test.ts:1`.
- Approved planning decisions: 1C, 2A, 3B, 4A, 5A, 6A, 7A and three-phase outline, 2026-09-05.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append a commit SHA when a step lands. Do not rename step titles.

### Phase 1: Combined evaluation

#### Automated

- [x] 1.1 Combined composition matrix passes, including exact counts and incomplete-source preservation. — 0e48daa
- [x] 1.2 Mobile lint, types, and regression tests pass. — 0e48daa

### Phase 2: Result presentation

#### Automated

- [x] 2.1 Presentation and component interaction tests pass for the approved summary, highlights, disclosures, and reset behavior. — df508c7
- [x] 2.2 Mobile lint, types, and regression tests pass. — df508c7

### Phase 3: Android verification

#### Automated

- [x] 3.1 All scenario fixtures and saved-profile-to-presentation integration cases pass.
- [x] 3.2 Mobile lint, types, and full tests pass.
- [x] 3.3 API regression gate passes.
- [x] 3.4 Fixture server returns the documented scenario responses and contract not-found fallback; startup, request, and shutdown evidence is recorded in `verification.md`.

#### Manual

- [x] 3.5 Android fixture cases confirm mixed counts, equality, both bases, mismatch, missing nutrition, and partial/missing ingredient behavior against the documented expected results.
- [x] 3.6 Android confirms nutrition threshold and summary reason disclosures, light/dark warning visibility, long-text wrapping, and TalkBack labels/expanded states.
- [x] 3.7 Android confirms save/discard and relaunch behavior, updated warnings after returning from profile editing, no-rule facts, and retry/rescan navigation.
- [x] 3.8 A live physical barcode scan through the normal API displays current product facts and correct configured-rule results; device, barcode, observed values, and outcome are recorded.
