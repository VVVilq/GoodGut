# Avoided Ingredient Profile — Plan Brief

> Full plan: `context/changes/avoided-ingredient-profile/plan.md`

## What & Why

Build GoodGut’s one-device avoided-ingredient profile so a shopper can select reviewed ingredients and manage custom exact-name exclusions before S-03 adds scan warnings. The feature must provide durable persisted CRUD for the MVP while remaining personal preference tooling, not medical or allergen-safety analysis.

## Starting Point

Mobile already has an exact personal-rule evaluator, a completed scan/product flow, strict TypeScript, Jest, and an app-wide provider pattern. It has no profile route, catalogue, persistence dependency, profile state, or certification-oriented test plan.

## Desired End State

From Home, the shopper opens “Unikane składniki”, browses or searches a broad Polish-labelled catalogue, and adds, renames, or removes custom ingredients. The empty-by-default profile changes only after explicit Save succeeds, survives restarts, recovers the last valid stored version, and emits stable `IngredientRule[]` values for S-03.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| Default profile | Empty; nothing preselected | Avoids inventing shopper preferences. |
| Entry point | Visible Home action | Keeps configuration discoverable without blocking scanning. |
| Save model | Explicit Save over an isolated draft | Makes failed persistence honest and prevents partial active edits. |
| Catalogue | ~30 entries in five reviewed categories | Broad practical coverage without an unbounded ingredient database. |
| Display vs matching | Polish labels separate from canonical names/aliases | Friendly UX without translating matching semantics implicitly. |
| Custom matching | Trimmed, case-insensitive exact name only | Preserves the authoritative PRD/evaluator boundary. |
| Duplicates | Reject custom/custom and custom/predefined name/alias collisions | Prevents duplicate warnings and inflated counts. |
| Custom editing | Inline add, rename, and delete with stable IDs | Provides complete persisted CRUD with low navigation overhead. |
| Persistence | Versioned two-slot AsyncStorage document | Preserves the last valid profile across interrupted or corrupt writes. |
| Failure behavior | Keep active profile and retryable draft | Never claims an unsuccessful save or silently deletes preferences. |
| Authentication | Register-free, one installation = one shopper/profile | Matches the local single-user PRD and MVP-check allowance. |
| Test evidence | Foundation risk-to-test matrix | Connects tests to defined MVP risks for certification review. |

## Scope

**In scope:**

- Broad local predefined catalogue with Polish categories/labels and reviewed match aliases
- Selected predefined ingredients and stable custom exact-name ingredients
- Add, list, inline rename, delete, select, deselect, duplicate validation, and search
- Explicit Save, dirty-discard confirmation, retry/restore UX
- Versioned local persistence, strict decode, backup recovery, root profile provider
- Existing evaluator adapter, MVP test plan, documentation, and Android verification

**Out of scope:**

- S-03 warning highlights/counts and S-04 nutrition thresholds
- Backend/database storage, login, sync, sharing, or multiple profiles
- Fuzzy/inferred matching, exhaustive allergen detection, medical claims, or remote catalogue management
- Mandatory onboarding, scan history, recommendations, or analytics

## Architecture / Approach

`Catalogue + custom draft → pure validation/CRUD → explicit Save → two-slot AsyncStorage repository → active profile provider → IngredientRule[] adapter`. Catalogue labels remain UI metadata; only reviewed canonical names and aliases reach the evaluator. The active profile changes only after durable save succeeds.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Domain, catalogue, test plan | Stable profile rules, broad reviewed catalogue, CRUD validation, S-03 adapter, MVP evidence matrix | Incorrect aliases could create false matches. |
| 2. Persistence and state | Versioned crash-safe storage, strict recovery, root active-profile state | Interrupted writes could replace or erase valid preferences. |
| 3. Editor and navigation | Home entry, categorized search, predefined selection, custom CRUD, Save/error UX | Broad list and draft states could become confusing on mobile. |
| 4. Handoff and acceptance | Persisted evaluator integration, docs, full regression and Android proof | S-02 data could drift from S-03 matching expectations. |

**Prerequisites:** Completed S-01 scan flow, current `personal-rules.ts` evaluator, reviewed catalogue wording/aliases, and a physical Android device.

**Estimated effort:** Four focused implementation/review sessions, one per gated phase.

## Open Risks & Assumptions

- Exact aliases must be reviewed conservatively; Polish display text does not automatically become a match alias.
- “Common allergen-like ingredients” describes personal avoidance choices and is not exhaustive regulated allergen detection.
- AsyncStorage is appropriate because profile values are not credentials or secrets, but multi-key save ordering must be tested explicitly.
- Catalogue evolution relies on stable IDs and versioned decoding; unknown IDs are errors rather than silently dropped preferences.
- The approximately 30-entry catalogue should remain usable with categorized virtualization and local search without remote data.

## Success Criteria (Summary)

- A shopper completes persisted create/read/update/delete operations for avoided ingredients and sees the same profile after restart.
- Failed or corrupt persistence never silently replaces the last valid active profile, and recovery actions are explicit.
- Saved predefined/custom rules feed the existing evaluator with reviewed alias and exact-name semantics while S-01 scanning remains unchanged.
