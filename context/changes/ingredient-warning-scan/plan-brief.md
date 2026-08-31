# Ingredient Warning Scan — Plan Brief

> Full plan: `context/changes/ingredient-warning-scan/plan.md`

## What & Why

GoodGut will connect the shopper's saved avoided-ingredient profile to scanned product results. Triggered rules will appear first with an accurate rule count and every matching product ingredient highlighted, delivering the first complete proof of the app's personalized shopping value.

## Starting Point

The app already scans products, displays complete normalized facts, persists one local profile, and exposes deterministic evaluator-ready ingredient rules. The missing link is structured match evidence and a result presentation that composes lookup data with the saved-profile lifecycle.

## Desired End State

A found-product result begins with an honest personalized state: evaluation loading/failure, configured-rule unavailability, neutral zero matches, or triggered warnings. Triggered rows identify the configured rule and every matching source name; the complete ingredient list highlights those names in red with accessible non-color cues, and all existing product facts remain below.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Zero matches | Show compact neutral `0 ostrzeżeń` | Confirms evaluation occurred without listing every non-match or implying safety. |
| Warning evidence | Show rule label and exact matched product text | Lets shoppers understand why each warning triggered. |
| Multiple matches | Highlight all names but count the rule once | Preserves complete evidence and evaluator count semantics. |
| Missing ingredients | Prominent unavailable warning plus existing facts message | Avoids false reassurance while retaining the complete-facts structure. |
| Profile hydration | Show facts with warning-area loading state | Keeps available facts usable without a temporary false zero. |
| Profile failure | Explicit recoverable evaluation failure | Makes personalization failure honest without blocking product data. |
| Placement | Warning summary before identity and image | Implements the roadmap's warning-first speed goal literally. |
| Accessibility | Red plus bold, warning label/icon, and semantics | Ensures warnings do not depend on color perception. |
| Architecture | Domain-owned match evidence | Prevents drift between warning rows, highlights, and counts. |

## Scope

**In scope:**

- Structured per-rule ingredient match evidence
- Saved-profile and lookup result composition
- Loading, profile-error, unavailable, zero, and triggered warning states
- Warning rows with all matching names and one count per rule
- Accessible red highlighting in the complete ingredient list
- Offline domain, presentation, and integration tests
- Android light/dark and TalkBack acceptance

**Out of scope:**

- Nutrition rules or threshold warnings
- Backend/API/schema/profile persistence changes
- Fuzzy, substring, translated, or inferred matching
- Medical/allergen safety claims or positive rules
- Authentication, sync, history, recommendations, or non-Android clients

## Architecture / Approach

The domain evaluator becomes the single source of match evidence. A pure composition layer combines `ProductLookupState` with `PersonalProfileState`, preserving the distinction between an empty active profile and an unavailable profile. The result route reads both existing providers, and presentation components render the warning model before unchanged complete product facts.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Match evidence and composition | One deterministic model for rule IDs, labels, matched names, counts, and lifecycle states | UI/evaluator drift or false zero states |
| 2. Warning-first presentation | Accessible warning summary and exact ingredient highlighting before product facts | Dark/light contrast, long text, and color-only meaning |
| 3. Integration hardening | Durable-profile-to-scan proof, risk evidence, and Android acceptance | Cross-boundary regressions and incomplete manual coverage |

**Prerequisites:** Completed S-01 scan/product-facts flow and S-02 durable avoided-ingredient profile.

**Estimated effort:** Approximately 3 implementation sessions across 3 phases, with a physical Android checkpoint after phases 2 and 3.

## Open Risks & Assumptions

- Open Food Facts may omit, merge, translate, or spell ingredient names inconsistently; uncertain inputs deliberately remain non-triggering.
- Long or numerous source ingredient names must wrap without making warning rows or the complete list unreadable.
- Profile load failure recovery must integrate with existing store actions without introducing a second profile lifecycle.
- The bounded local profile and ingredient list are assumed small enough for synchronous on-device evaluation.

## Success Criteria (Summary)

- Every triggered avoided-ingredient rule appears first, contributes exactly once to the total, and exposes all matching displayed ingredient names.
- Empty, zero-match, profile-unavailable, and ingredient-unavailable states remain visibly distinct and never turn uncertainty into reassurance.
- Complete product facts, lookup errors, retry/rescan, camera behavior, saved-profile isolation, light/dark contrast, and TalkBack semantics continue working on Android.
