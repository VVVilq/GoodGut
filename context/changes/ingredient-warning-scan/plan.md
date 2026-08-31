# Ingredient Warning Scan Implementation Plan

## Overview

Deliver roadmap slice S-03, GoodGut's north-star flow: evaluate the last successfully saved avoided-ingredient profile against a found product, show the personalized result before general product facts, highlight every matching ingredient name in red with non-color warning cues, and display one accurate count of triggered rules. Preserve the complete S-01 scan/result experience and the S-02 profile lifecycle without changing the API contract.

## Current State Analysis

The mobile app already has the two required inputs but does not compose them. `ProductLookupProvider` exposes a strict found/not-found/source-error lookup state, while `PersonalProfileProvider` exposes evaluator-ready active ingredient rules derived from the durable profile. Both providers wrap the result route in `apps/mobile/src/app/_layout.tsx`, so S-03 is a mobile result-composition change rather than a backend or navigation redesign.

`apps/mobile/src/domain/personal-rules.ts` already owns deterministic NFKC, trim, and case-insensitive exact matching. Predefined rules consider reviewed aliases, custom rules consider only their exact configured names, missing or unparseable ingredients make configured rules unavailable, and the total counts triggered rules rather than occurrences. However, the evaluator returns rule IDs and totals only; it does not identify which displayed product ingredient names matched each rule.

`apps/mobile/src/features/product-lookup/presentation.ts` currently converts available ingredients into one comma-joined string. `apps/mobile/src/components/product-facts/product-result.tsx` renders identity first and has no personalized summary or per-ingredient rendering metadata. Profile hydration or load failure is also not represented in the result presentation, so simply treating absent rules as an empty array would create a false zero-warning state.

## Desired End State

For a found product, the result begins with a personalized warning area. It shows evaluation progress while the saved profile hydrates; shows an explicit, recoverable evaluation failure if the profile cannot load; shows a prominent unavailable warning when configured rules cannot be checked because ingredients are missing or unparseable; shows a neutral `0 ostrzeżeń` summary when available ingredients trigger no configured rule; or shows the trigger count and one warning row per triggered rule.

Each triggered row names the shopper's rule and every exact product ingredient name that matched it. Every matching name in the complete ingredient list is highlighted in red and bold, with warning text/icon semantics so meaning does not rely on color. A rule contributes once to the total even when several product names or aliases match it. All existing identity, image, Nutri-Score, ingredient availability, eight nutrition rows, source attribution, retry, and rescan behavior remains below the personalized area.

### Key Discoveries

- `apps/mobile/src/app/_layout.tsx:13` already nests the profile and lookup providers above the result route; no provider relocation is required.
- `apps/mobile/src/features/personal-profile/profile-store.ts:84` distinguishes unavailable profile state (`undefined` rules) from an intentionally empty active profile (`[]`) and keeps the previous active profile during saving or save failure.
- `apps/mobile/src/domain/personal-rules.ts:80` is the sole matching boundary and must also own match evidence so highlights cannot drift from trigger counts.
- `apps/mobile/src/features/product-lookup/presentation.ts:93` currently loses ingredient boundaries by joining names into one string; S-03 requires structured ingredient rows or segments.
- `apps/mobile/src/components/product-facts/product-result.tsx:50` renders found-product identity before facts; the personalized section must move ahead of that content while preserving the existing facts sequence below it.
- `docs/reference/product-data-contract.md` already exposes all S-03 inputs and explicitly assigns warning evaluation to mobile; no API, schema, fixture, or mapper change is needed.

## What We're NOT Doing

- Nutrition-threshold configuration or nutrition warnings; those remain S-04 and S-05.
- API endpoints, source mapping, product-contract/schema changes, backend profile storage, or database work.
- Fuzzy, substring, stemming, diacritic folding, translation, inferred synonyms, ingredient-family expansion, or automatic alias discovery.
- Positive/green rules, safety claims, allergen certification, disease analysis, medical scoring, or medical advice.
- Multiple profiles, authentication, synchronization, sharing, scan history, recommendations, iOS, web, or desktop behavior.
- Listing every configured rule as a non-match; the zero state is a compact neutral summary.
- Introducing a React Native component-test framework solely for this slice; framework-independent domain and presentation tests remain the primary automated UI contract.

## Implementation Approach

Keep matching in the domain and presentation in the product-lookup feature. Extend ingredient evaluation with structured per-rule evidence that includes stable rule identity and all matching source ingredient names while retaining the existing aggregate evaluator contract for future nutrition composition. Build a pure result-composition/presentation boundary that accepts lookup state plus the profile lifecycle and produces one exhaustive UI model.

The result route reads both contexts and passes only the derived presentation model to `ProductResult`. The UI renders the warning area first and the existing facts below it. Ingredient facts remain a structured list through presentation so the component can style exact matched entries without re-running matching logic.

## Critical Implementation Details

### State sequencing

`activeIngredientRules === undefined` means hydration or load failure, not an empty profile. The result must branch on the complete profile state: hydration produces a warning-area loading state; `load_error` produces an explicit evaluation failure; ready/recovered/saving/save-error evaluate the last active saved profile. An in-flight or failed profile candidate must never affect warnings.

### Count and evidence consistency

One rule may match multiple product ingredient names or multiple reviewed aliases. Preserve all matching displayed names for highlighting and evidence, but deduplicate the triggered rule ID and increment the total once. Derive warning rows, highlighted ingredient identities, and the total from one domain result rather than parallel UI calculations.

### Unavailable is not zero

When at least one ingredient rule exists and product ingredients are missing or unparseable, show prominent evaluation-unavailable treatment before facts and retain the original missing/unparseable fact message below. Never render `0 ostrzeżeń` for an evaluation that could not run.

## Phase 1: Match Evidence and Result Composition

### Overview

Extend the existing exact-match evaluator with deterministic match evidence and introduce a pure composition boundary that combines product lookup with the active saved-profile lifecycle.

### Changes Required

#### 1. Ingredient match evidence

**Files**: `apps/mobile/src/domain/personal-rules.ts`; `apps/mobile/src/domain/__tests__/personal-rules-test.ts`

**Intent**: Make the domain return enough evidence for warning rows and per-name highlighting without duplicating matching semantics in presentation code.

**Contract**: Add a structured ingredient-evaluation result keyed by stable rule ID, containing every source ingredient name that exactly matched that rule. Preserve existing `triggeredRuleIds`, `unavailableRuleIds`, and `triggerCount` behavior for the aggregate evaluator. Predefined canonical names and reviewed aliases share one rule result; custom rules use only their configured name; repeated/canonical/alias matches count once per rule.

#### 2. Rule display metadata adapter

**Files**: `apps/mobile/src/domain/avoided-ingredients/profile.ts`; focused tests under `apps/mobile/src/domain/avoided-ingredients/__tests__/`

**Intent**: Resolve stable evaluator rule IDs to shopper-facing labels without leaking catalogue lookup or profile persistence details into UI components.

**Contract**: Preserve Polish catalogue labels for predefined rules and the saved display name for custom rules alongside evaluator-ready identity and aliases. Unknown IDs remain invalid profile data rather than silently disappearing.

#### 3. Personalized result composition

**Files**: new module under `apps/mobile/src/features/product-lookup/`; `apps/mobile/src/features/product-lookup/__tests__/`

**Intent**: Combine `ProductLookupState` and `PersonalProfileState` into an exhaustive, framework-independent personalization state before ordinary product presentation.

**Contract**: For found products, model `profile_loading`, `profile_error`, `no_rules`, `ingredients_unavailable`, `no_triggers`, and `triggered` branches. Only ready/recovered/saving/save-error states evaluate active saved rules. Non-found lookup branches retain their current actions and copy without profile evaluation.

### Success Criteria

#### Automated Verification

- Domain tests prove exact custom matches, reviewed predefined aliases, Unicode/case normalization, no substring matches, and all matched source names per rule.
- Tests prove one rule matching several canonical/alias names contributes one warning row and one count while exposing every matching displayed name.
- Composition tests distinguish profile hydration, load failure, empty profile, ingredient missing/unparseable, zero-trigger, and triggered states without false reassurance.
- Composition tests prove saving and save-error candidates never replace the active saved rules used for evaluation.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- Human reviews representative match evidence for predefined aliases and custom exact names and confirms the displayed rule label and source ingredient text are understandable.

**Implementation Note**: Pause after domain/composition verification; warning UI must consume this single evidence model rather than derive matches independently.

---

## Phase 2: Warning-First Result Presentation

### Overview

Wire the profile lifecycle into the result route and render accessible personalized states before the complete S-01 product facts.

### Changes Required

#### 1. Result route integration

**Files**: `apps/mobile/src/app/result.tsx`; `apps/mobile/src/features/product-lookup/presentation.ts`

**Intent**: Feed lookup state and saved-profile state into one pure presentation model while keeping the route focused on context composition and navigation actions.

**Contract**: `ResultScreen` reads `useProductLookup()` and `usePersonalProfile()`, composes the personalized result, and retains existing retry and scan-another behavior. Presentation preserves structured ingredient items and marks which exact displayed names are warning matches.

#### 2. Personalized warning summary

**Files**: `apps/mobile/src/components/product-facts/product-result.tsx`; reusable warning components under `apps/mobile/src/components/product-facts/` as warranted

**Intent**: Put the shopper's evaluation outcome at the top of every found-product result without blocking access to general facts.

**Contract**: Render before identity/image: a loading state during profile hydration; an explicit profile-evaluation failure with retry and profile-navigation recovery; a prominent configured-rule unavailable state for missing/unparseable ingredients; a compact neutral `0 ostrzeżeń` state after a trustworthy zero-trigger evaluation; or a trigger total plus one row per triggered rule with every matched source name.

#### 3. Accessible ingredient highlighting

**Files**: `apps/mobile/src/components/product-facts/product-result.tsx`; `apps/mobile/src/constants/theme.ts` if reusable warning tokens are needed

**Intent**: Make every matching name clear in the complete ingredient list across light/dark themes and for users who cannot rely on color.

**Contract**: Render ingredient names individually with separators, applying red warning color, bold weight, and explicit warning label/icon/accessibility description to matched entries. Non-matching ingredients retain ordinary styling and original order. Missing/unparseable fact copy remains unchanged below the personalized unavailable warning.

#### 4. Pure presentation regression coverage

**Files**: `apps/mobile/src/features/product-lookup/__tests__/presentation-test.ts`; focused new presentation/composition tests

**Intent**: Lock warning order, copy, actions, match metadata, and preservation of all S-01 states without requiring a new native renderer test dependency.

**Contract**: Cover zero, one, and multiple triggered rules; multiple matched names for one rule; no rules; profile loading/error; both ingredient unavailable reasons; warning-first ordering; and all existing found/not-found/source/client-error action sets.

### Success Criteria

#### Automated Verification

- Presentation tests prove warning states precede product facts and preserve exact triggered-rule counts, labels, and matched ingredient names.
- Tests prove empty profiles show ordinary facts without personalized highlights, while configured zero matches show the compact neutral zero summary.
- Tests prove profile loading/failure and missing/unparseable ingredients never render a zero-warning conclusion.
- Existing decoder, client, lookup-state, scan-policy, and complete-product presentation tests remain passing.
- Mobile lint, type checking, tests, and public Expo config pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test; npx.cmd expo config --type public`.

#### Manual Verification

- On Android in light and dark themes, triggered warnings appear before identity, every matched ingredient is visibly red/bold with a non-color warning cue, and long ingredient lists wrap and scroll correctly.
- TalkBack or equivalent accessibility inspection announces the warning total, rule labels, matching ingredient names, loading/failure states, and recovery actions meaningfully.
- Profile loading and failure leave complete product facts usable, and the retry/profile recovery actions behave correctly.

**Implementation Note**: Pause for physical Android visual and accessibility acceptance before final hardening.

---

## Phase 3: Integration Hardening and Android Acceptance

### Overview

Prove the complete saved-profile-to-scan flow, update risk evidence, and close S-03 without regressing S-01 or S-02.

### Changes Required

#### 1. Cross-boundary saved-profile integration

**Files**: focused integration tests under `apps/mobile/src/data/__tests__/` or `apps/mobile/src/features/product-lookup/__tests__/`

**Intent**: Verify that a persisted profile, provider/store lifecycle, normalized found product, evaluator evidence, and result presentation retain the same semantics across boundaries.

**Contract**: Round-trip predefined and custom rules through the repository, hydrate active rules, evaluate representative available/missing/unparseable products, and assert warning labels, all matched names, highlights, unavailable states, and count-by-rule behavior. Deselect/delete and failed-save cases must remove or preserve warnings according to the last durable profile.

#### 2. MVP evidence and local verification documentation

**Files**: `context/foundation/test-plan.md`; `apps/mobile/README.md`

**Intent**: Make the new personalized scan risks and Android acceptance steps reproducible.

**Contract**: Add evidence for warning/evidence drift, false zero during profile or ingredient unavailability, count inflation, warning-first ordering, accessible non-color highlighting, and scan/profile regressions. Document representative local testing with saved predefined/custom rules and incomplete product data.

#### 3. Final regression and scope checks

**Files**: no production additions unless verification reveals a scoped defect

**Intent**: Close the north-star ingredient-warning slice only after all automated and physical-device behavior is proven.

**Contract**: Run the complete mobile and API suites; manually exercise no rules, zero matches, aliases, custom exact matches, multiple matches per rule, multiple triggered rules, missing/unparseable ingredients, hydration/load failure, retry, rescan, and profile save/failure isolation. Confirm no S-04/S-05 nutrition rules or out-of-scope medical behavior entered S-03.

### Success Criteria

#### Automated Verification

- Cross-boundary tests prove durable predefined/custom profiles produce deterministic warning rows, highlighted names, unavailable states, and one count per triggered rule.
- The test-plan matrix maps every S-03 high-risk behavior to an existing passing automated or manual check.
- Mobile quality gates pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- API regression tests pass offline: `cd services/api; .\mvnw.cmd test`.
- Scope search confirms no product-contract/API changes, nutrition-threshold UI/evaluation, fuzzy/inferred matching, medical claims, auth/sync, history, or recommendations entered the slice.

#### Manual Verification

- On a physical Android device, predefined aliases and custom exact names produce warning-first results, all matching ingredient names are highlighted, and the displayed total equals triggered rules rather than occurrences.
- Empty profiles preserve ordinary S-01 results; configured non-matches show a neutral zero summary; missing/unparseable ingredients and profile failures show prominent unavailable treatment without hiding facts.
- Light/dark visual contrast, TalkBack semantics, long-list wrapping, retry, scan-another, camera release, and last-saved-profile isolation pass the updated MVP test plan.

**Implementation Note**: Pause for final S-03 acceptance before implementation review and archive.

---

## Testing Strategy

### Unit Tests

- Exact normalization, predefined aliases, custom-only names, no substring/fuzzy behavior, and every matched source ingredient name.
- One triggered rule despite multiple canonical/alias occurrences; stable ordering for warning rows and matched names.
- Rule display metadata for Polish predefined labels and saved custom labels.
- Exhaustive composition states for lookup outcome, profile lifecycle, active-rule emptiness, ingredient availability, and triggered count.
- Presentation ordering, warning copy/actions, structured ingredient highlighting metadata, and complete-facts preservation.

### Integration Tests

- Persist profile → hydrate store → derive active rules → evaluate normalized found product → present warning result.
- Saving/save-error candidates continue evaluating the old active profile; successful promotion changes subsequent warnings.
- Deselect/delete removes warnings after durable save; recovered backup profiles remain evaluable.
- Existing lookup, decoder, API-client, scanner, and S-01 presentation suites remain regression gates.

### Manual Testing Steps

1. Launch with an empty saved profile, scan a found product, and confirm ordinary complete facts with no personalized highlights.
2. Save a rule that does not match, scan again, and confirm a neutral `0 ostrzeżeń` summary without safety claims.
3. Save a predefined rule such as sucralose and test canonical plus reviewed alias evidence; confirm all matching names are highlighted but the rule counts once.
4. Save a custom exact name and confirm case/whitespace normalization matches while a longer substring-containing ingredient does not.
5. Configure multiple rules and confirm every triggered row appears first and the total equals the number of rules.
6. Test products with missing and unparseable ingredients; confirm prominent evaluation unavailability plus the original facts message.
7. Exercise profile hydration and load failure; confirm product facts remain visible and zero is never shown before trustworthy evaluation.
8. Verify retry, scan another, duplicate capture suppression, camera release, light/dark contrast, long text wrapping, and TalkBack announcements.

## Performance Considerations

- Profiles and ingredient arrays are small and evaluated locally once per relevant lookup/profile state change; no cache, index, pagination, or backend processing is needed.
- Derive matching evidence in one pass over normalized ingredient keys and avoid re-running evaluation independently during rendering.
- Preserve structured ingredient items rather than splitting a rendered string, preventing repeated parsing and incorrect separator/highlight boundaries.

## Security and Privacy Considerations

- Evaluation remains entirely on device; profile rules are not added to API requests, logs, analytics, or source queries.
- Product data and profile storage boundaries remain unchanged.
- Warning copy describes the shopper's configured avoidance rules, not medical danger, allergy safety, or product suitability.

## Migration and Rollback

No stored-profile or API migration is required. S-03 consumes the existing profile schema and contract `1.0`. The presentation additions are additive; rollback restores the prior result composition while leaving profile data and lookup behavior intact. Any future evaluator-result extension should retain the aggregate contract needed by S-05 nutrition warnings.

## References

- `context/foundation/prd-v3.md` — US-01 and FR-004 through FR-010
- `context/foundation/roadmap.md` — S-03 north-star outcome and dependencies
- `context/foundation/test-plan.md` — S-02/S-03 matching and regression risks
- `context/archive/2026-08-19-scan-complete-product-facts/plan.md` — S-01 result and lifecycle contracts
- `context/archive/2026-08-26-avoided-ingredient-profile/plan.md` — active-profile and evaluator handoff contracts
- `docs/reference/product-data-contract.md` — ingredient availability and downstream ownership
- `apps/mobile/src/domain/personal-rules.ts` — deterministic evaluator
- `apps/mobile/src/domain/avoided-ingredients/profile.ts` — saved-profile adapter
- `apps/mobile/src/features/personal-profile/profile-store.ts` — active saved-profile lifecycle
- `apps/mobile/src/features/product-lookup/presentation.ts` — current result model
- `apps/mobile/src/components/product-facts/product-result.tsx` — current facts UI

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Match Evidence and Result Composition

#### Automated

- [x] 1.1 Domain tests prove exact/alias matching and expose every matched source name per rule.
- [x] 1.2 Multiple names for one rule produce one warning row and one count.
- [x] 1.3 Composition tests cover every profile and ingredient availability state without false zero conclusions.
- [x] 1.4 Saving and failed-save candidates never replace active saved rules during evaluation.
- [x] 1.5 Mobile lint, type checking, and tests pass.

#### Manual

- [x] 1.6 Human accepts representative rule labels and match evidence.

### Phase 2: Warning-First Result Presentation

#### Automated

- [ ] 2.1 Presentation tests prove warning-first order, counts, labels, and matched names.
- [ ] 2.2 Empty profiles and configured zero matches remain behaviorally distinct.
- [ ] 2.3 Loading, profile failure, and ingredient unavailability never render a false zero.
- [ ] 2.4 Existing lookup, decoder, client, scanner, and facts tests remain passing.
- [ ] 2.5 Mobile lint, type checking, tests, and Expo public config pass.

#### Manual

- [ ] 2.6 Android light/dark warning visuals and long ingredient wrapping are usable.
- [ ] 2.7 TalkBack communicates warning totals, evidence, state, and actions without color dependence.
- [ ] 2.8 Loading/failure recovery preserves usable product facts.

### Phase 3: Integration Hardening and Android Acceptance

#### Automated

- [ ] 3.1 Cross-boundary tests prove durable profiles produce deterministic warning presentation.
- [ ] 3.2 The MVP test plan maps every S-03 high-risk behavior to evidence.
- [ ] 3.3 Mobile lint, type checking, and tests pass.
- [ ] 3.4 API regression tests pass offline.
- [ ] 3.5 Scope checks find no contract, nutrition-rule, fuzzy-match, medical, auth/sync, history, or recommendation drift.

#### Manual

- [ ] 3.6 Physical Android aliases, custom names, multi-match highlights, and rule counts are correct.
- [ ] 3.7 Empty, zero, unavailable, and profile-failure states remain honest while preserving facts.
- [ ] 3.8 Visual, accessibility, scan lifecycle, and last-saved-profile acceptance passes.
