# Avoided Ingredient Profile Implementation Plan

## Overview

Deliver roadmap slice S-02: one shopper can configure and edit a durable, on-device profile of avoided ingredients. The profile starts empty, offers a broad reviewed predefined catalogue with Polish labels, supports exact-name custom entries, and exposes evaluator-compatible rules for the later S-03 warning flow.

## Current State Analysis

GoodGut already has a working Android scan-to-product flow and a framework-independent personal-rule evaluator. `apps/mobile/src/domain/personal-rules.ts` defines predefined and custom ingredient rules, applies aliases only to predefined rules, and uses trimmed case-insensitive exact equality. The mobile app has a root provider pattern for product lookup, thin Expo Router screens, controlled input components, Jest, strict TypeScript, and repeatable lint/typecheck/test commands.

No profile screen, profile provider, persisted profile schema, storage adapter, or local-storage dependency exists. The Home screen exposes scanning only. There is also no foundation test plan mapping defined MVP risks to concrete automated tests, which prevents the repository from satisfying that part of `.agents/prompts/mvp-check.md` despite existing tests.

## Desired End State

The shopper opens “Unikane składniki” from Home, browses or searches a categorized predefined catalogue, selects any number of entries, and adds, renames, or removes custom exact-name ingredients. Nothing is selected by default. Edits remain a draft until explicit Save succeeds; a failed save never replaces the active profile.

The saved profile survives process restarts, decodes through a versioned boundary, recovers the last valid slot after an interrupted or corrupt write, and is exposed through an app-level provider. Predefined selections resolve through the installed catalogue to existing `IngredientRule` objects; custom entries preserve stable IDs and exact matching semantics. S-02 does not yet alter scan results or display warnings.

### Key Discoveries

- `apps/mobile/src/domain/personal-rules.ts:13` already defines the S-03 `IngredientRule` handoff; profile work should adapt into it rather than create a second evaluator model.
- `apps/mobile/src/domain/personal-rules.ts:63` owns current trim/case normalization, but it is private and locale-dependent; duplicate validation and evaluation need one exported, deterministic normalization function.
- `apps/mobile/src/app/_layout.tsx:12` mounts app-wide providers above the stack, while `apps/mobile/AGENTS.md` requires route files to remain composition-only.
- `apps/mobile/src/components/product-scan/manual-barcode-entry.tsx:8` provides the established controlled-input, inline-error, and accessible-button pattern.
- `apps/mobile/package.json` has no persistence dependency. Expo supports `@react-native-async-storage/async-storage` as persistent, unencrypted key-value storage and recommends installation through Expo dependency resolution.
- The PRD requires one local profile with no login or synchronization; local persisted CRUD is sufficient for the register-free single-user model described by `mvp-check`.

## What We're NOT Doing

- Ingredient warnings, highlighted scan results, unavailable-rule summaries, or trigger counts; those belong to S-03.
- Nutrition-threshold profile fields or UI; those belong to S-04, though the storage/provider boundary must remain extensible.
- Backend profile endpoints, a database, authentication, accounts, synchronization, sharing, or multiple profiles.
- Mandatory onboarding or a first-launch gate; scanning remains usable with an empty profile.
- Fuzzy matching, substring matching, stemming, automatic translation, diacritic folding, inferred synonyms, ingredient-family expansion, or exhaustive allergen safety claims.
- Remote catalogue delivery, user-defined aliases, catalogue administration, or production analytics.
- A new React component test framework solely for this slice; pure domain, repository, and store behavior remains the automated focus.

## Implementation Approach

Keep three representations separate. The immutable catalogue owns Polish display labels plus reviewed canonical matching tokens. The persisted document owns only stable catalogue IDs and stable custom entries. An adapter resolves the last successfully saved profile into the existing `IngredientRule[]` contract for S-03.

Use a repository over an injected asynchronous key-value interface with AsyncStorage as the production adapter. Store a versioned profile in alternating slots and flip a small active-slot pointer only after the inactive slot has been written, read back, and decoded. Hydration first reads the active slot and may recover the other valid slot; it never overwrites corrupt data silently. A profile store owns hydration, active profile, saving, and error states. The editor owns a draft and promotes it only after repository success.

The broad catalogue is bounded to approximately 30 reviewed entries in five ordered categories: sweeteners, preservatives, colourants, flavour enhancers, and common allergen-like ingredients. A local search filters labels and reviewed tokens, while a virtualized categorized list keeps the screen usable. Catalogue copy must describe personal avoidance and must not imply regulated or exhaustive allergen detection.

## Critical Implementation Details

### Save ordering and recovery

AsyncStorage does not provide a multi-key transaction. To preserve the last valid profile, write and decode the inactive slot before flipping the active pointer, and promote the in-memory profile only after the pointer write succeeds. On load, corruption is distinct from a genuinely absent profile; recovery may use the other valid slot but must not rewrite either slot automatically.

### Identity and matching

Predefined rules persist catalogue IDs, and custom entries use stable generated IDs that survive rename. Polish display labels never become matching tokens implicitly. One shared normalization function governs evaluator equality and duplicate detection; catalogue tests must reject collisions between any canonical name or alias.

### Explicit-save UX

Selection, add, rename, and delete operations change only the draft. Dirty navigation asks for discard confirmation. A failed save preserves the draft for retry and leaves the active profile unchanged; “Przywróć zapisany profil” resets the draft explicitly.

## Phase 1: Profile Domain, Catalogue, and MVP Test Plan

### Overview

Establish stable profile semantics and the reviewed catalogue before storage or UI can depend on them.

### Changes Required

#### 1. Canonical ingredient normalization and evaluator compatibility

**Files**: `apps/mobile/src/domain/personal-rules.ts`; focused existing tests under `apps/mobile/src/domain/__tests__/`

**Intent**: Give evaluation and profile validation one deterministic equality boundary so device locale or duplicated normalization cannot change behavior.

**Contract**: Export a Unicode-normalizing, outer-trimming, locale-stable lowercase comparison-key function. Predefined evaluation continues to consider canonical name plus reviewed aliases; custom evaluation continues to consider its name only. Existing exact-match and no-substring behavior remains unchanged.

#### 2. Predefined ingredient catalogue

**Files**: new modules under `apps/mobile/src/domain/avoided-ingredients/`; catalogue tests under its `__tests__/`

**Intent**: Provide a broad but bounded local selection set with user-friendly Polish display metadata isolated from matching tokens.

**Contract**: Define stable category and item IDs, ordered Polish category/ingredient labels, one canonical matching name, and reviewed exact aliases. Target approximately 30 entries across sweeteners, preservatives, colourants, flavour enhancers, and common allergen-like ingredients. Include sucralose with `E955` and `E 955`; include only aliases reviewed as semantic equivalents. A catalogue-wide invariant rejects normalized token collisions.

#### 3. Profile model and pure CRUD validation

**Files**: new profile/validation modules under `apps/mobile/src/domain/avoided-ingredients/`; focused tests

**Intent**: Define one stable domain model for selection, custom CRUD, validation, and later evaluation.

**Contract**: Model selected predefined IDs plus ordered custom entries with stable IDs. Support add, read/list, rename, delete, select, and deselect operations without mutation. Reject blank names, names longer than 80 Unicode code points, custom/custom duplicates, and custom collisions with any predefined canonical name or alias. Rename preserves identity and the old valid value when validation fails.

#### 4. Evaluator adapter

**Files**: profile domain module and integration-focused tests

**Intent**: Make S-02 output directly consumable by S-03 without importing UI or persistence concerns into evaluation.

**Contract**: Resolve predefined IDs through the current catalogue into `IngredientRule` values with reviewed aliases; map custom entries to custom rules without aliases. Unknown catalogue IDs fail strict profile validation rather than disappearing silently. Adapter tests prove sucralose alias matching, custom exact matching, and one triggered count per rule.

#### 5. MVP risk-to-test plan

**File**: new `context/foundation/test-plan.md`

**Intent**: Connect repository tests to explicit product risks and satisfy the evidence contract in `.agents/prompts/mvp-check.md`.

**Contract**: Record quality-gate commands and a risk matrix covering catalogue false positives/collisions, duplicate trigger inflation, draft leakage, failed/corrupt persistence, evaluator handoff, broad-list usability, and scan regression. Name expected automated and manual evidence plus owning slices; explicitly defer fuzzy matching, exhaustive allergen detection, sync, and multiple profiles.

### Success Criteria

#### Automated Verification

- Catalogue tests prove unique IDs/tokens and reviewed canonical/alias behavior without fuzzy or substring matching.
- Profile tests prove persisted CRUD semantics, stable rename identity, validation limits, and duplicate rejection across all rule sources.
- Adapter tests produce valid existing `IngredientRule[]` values and preserve exact matching/count behavior.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- `context/foundation/test-plan.md` maps every S-02 high-risk behavior to concrete automated or manual evidence.

#### Manual Verification

- Human reviews all Polish labels, canonical names, aliases, and category wording and confirms they express personal avoidance rather than medical or exhaustive allergen safety.

**Implementation Note**: Pause after the catalogue review; storage and UI must not ship unreviewed matching aliases.

---

## Phase 2: Crash-Safe Local Persistence and Profile State

### Overview

Persist one versioned profile locally and expose honest hydration/save/recovery states without allowing failed writes to replace active rules.

### Changes Required

#### 1. AsyncStorage dependency and adapter

**Files**: `apps/mobile/package.json`, `apps/mobile/package-lock.json`; new adapter under `apps/mobile/src/data/`

**Intent**: Add Expo-compatible durable key-value storage for non-secret one-device profile data.

**Contract**: Install `@react-native-async-storage/async-storage` through Expo’s installer. Hide it behind an injected minimal async key-value interface so repository tests use deterministic fakes and domain/store modules do not import the native package.

#### 2. Versioned storage document and strict decoder

**Files**: new profile repository/codec modules and tests under `apps/mobile/src/data/`

**Intent**: Treat local JSON as untrusted and distinguish no profile from corrupt or unsupported data.

**Contract**: Persist schema version `1` with selected predefined IDs and stable custom `{id, name}` entries. Decode every nested field, enforce domain validation, reject unknown versions/catalogue IDs, and never cast parsed JSON. Reserve a discriminated rule/document boundary that can later add nutrition rules without replacing the repository/provider architecture.

#### 3. Two-slot repository

**Files**: profile repository and focused repository tests

**Intent**: Preserve the last valid durable profile across interrupted writes and single-slot corruption.

**Contract**: Use two document slots and an active pointer. Load returns explicit empty, loaded, recovered, corrupt, or storage-error outcomes. Save writes the inactive slot, reads and decodes it, then flips the pointer. Tests prove call ordering, recovery from either corrupt slot, no automatic overwrite during recovery, and preservation of the old active slot after failures before pointer completion.

#### 4. App-wide profile store and provider

**Files**: new modules under `apps/mobile/src/features/personal-profile/`; `apps/mobile/src/app/_layout.tsx`; focused store tests

**Intent**: Give screens and future warning evaluation one authoritative last-saved profile plus explicit lifecycle states.

**Contract**: Model hydrating, ready, saving, recovered/load-error, and save-error states. Hydrate once from the repository; promote a candidate only after save success; preserve active profile and candidate draft on failure; support retry, draft reset, storage reread, and confirmed empty-profile replacement after unrecoverable corruption. Mount the provider above the router stack and expose evaluator-ready active rules separately from editor drafts.

### Success Criteria

#### Automated Verification

- Repository tests prove v1 round-trip, strict rejection, empty/corrupt distinction, backup recovery, pointer-last ordering, and last-valid preservation on every injected failure point.
- Store tests prove hydration outcomes, successful promotion, failed-save isolation, retry, and active-profile exposure to consumers.
- Expo dependency/config resolution succeeds with the SDK-compatible AsyncStorage package.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- On Android, a saved profile survives app termination/relaunch, and a simulated save failure leaves the previously saved profile active while preserving the draft for retry.
- Human confirms corrupted storage is reported or recovered without silently resetting or overwriting the profile.

**Implementation Note**: Pause for restart and failure-path verification before building the editor on this repository contract.

---

## Phase 3: Profile Editor and Navigation

### Overview

Deliver the complete user-facing profile CRUD flow on top of the tested domain and persistence boundaries.

### Changes Required

#### 1. Home entry and profile route

**Files**: `apps/mobile/src/app/index.tsx`, `apps/mobile/src/app/_layout.tsx`, new `apps/mobile/src/app/profile.tsx`

**Intent**: Make profile configuration discoverable without blocking the existing scan flow.

**Contract**: Add a Home action labelled “Unikane składniki” and a dedicated stack route. Keep the route composition-only; scanning remains available when the profile is empty or while no rules are selected.

#### 2. Categorized predefined selection

**Files**: reusable components under `apps/mobile/src/components/personal-profile/`

**Intent**: Make the broad catalogue usable on a phone without changing matching semantics.

**Contract**: Render searchable, virtualized category sections with Polish labels, selected state, and accessible controls. Search may match reviewed display/canonical/alias tokens for discovery but must not create new matching aliases. No item is selected by default.

#### 3. Inline custom ingredient CRUD

**Files**: reusable profile editor/custom-entry components and pure presentation helpers

**Intent**: Let shoppers cover ingredients absent from the catalogue while keeping exact matching and duplicates understandable.

**Contract**: Add, list, inline rename, and delete custom entries in the draft. Show field-level errors for blank/long/duplicate/reserved names and identify the conflicting predefined or custom item. Preserve user display text except outer whitespace normalization on accepted save.

#### 4. Draft, Save, discard, and error UX

**Files**: profile editor feature/controller and profile route composition

**Intent**: Make explicit Save truthful and recoverable.

**Contract**: Initialize the editor draft from the active profile; keep all edits isolated until Save; disable duplicate submissions while saving; show success only after durable promotion. Failed saves retain draft with Retry and “Przywróć zapisany profil”. Dirty back navigation requires discard confirmation. Hydration blocks editing; recovered/corrupt states explain available retry/reset actions.

### Success Criteria

#### Automated Verification

- Pure editor/state tests prove select/deselect, add/read/rename/delete, dirty tracking, whole-draft validation, save isolation, retry, and reset-to-active behavior.
- Search/presentation tests preserve category order and never mutate catalogue matching tokens.
- Existing product lookup and scanner test suites continue to pass unchanged.
- Mobile lint, type checking, and tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.

#### Manual Verification

- On Android, Home opens the profile editor while the scan action remains immediately usable with an empty profile.
- Shopper can browse/search all categories, select and deselect entries, and add, rename, and delete custom entries with understandable duplicate errors.
- Save, retry, restore-saved, dirty-back confirmation, keyboard behavior, long-list scrolling, loading, recovery, and empty-profile states are understandable and responsive.

**Implementation Note**: Pause for full Android CRUD acceptance before final handoff hardening.

---

## Phase 4: Android Persistence and S-03 Handoff Verification

### Overview

Prove the completed profile behaves durably on-device, remains compatible with scan functionality, and provides a stable contract for ingredient warnings.

### Changes Required

#### 1. Cross-boundary integration tests

**Files**: focused integration tests under mobile domain/feature test directories

**Intent**: Verify that persisted CRUD state reaches the existing evaluator without semantic drift.

**Contract**: Round-trip a profile through the repository, hydrate the provider/store, adapt it to `IngredientRule[]`, and evaluate representative predefined-alias and custom exact-name products. Prove deleted/deselected rules no longer appear and renamed custom rules retain identity without duplicate counts.

#### 2. MVP evidence and local-development documentation

**Files**: `context/foundation/test-plan.md`; `apps/mobile/README.md`; targeted project documentation as needed

**Intent**: Make the single-user local model, verification workflow, and certification evidence reproducible.

**Contract**: Document profile data location/behavior, reinstall/clear-data loss, absence of login/sync/backend storage, standard commands, catalogue review boundary, and Android manual checks. Update the test-plan evidence references to the actual test files delivered by this slice.

#### 3. Final regression and physical-device acceptance

**Files**: no new production surface unless verification reveals a scoped defect

**Intent**: Close S-02 only when durable CRUD and the existing S-01 flow work together.

**Contract**: Run all mobile quality gates and API regression tests; manually exercise save/relaunch, edit/delete/relaunch, empty profile, recovery/error paths, and scanning from Home. Do not add S-03 warning presentation during hardening.

### Success Criteria

#### Automated Verification

- Integration tests prove persisted predefined/custom CRUD produces evaluator-compatible rules with stable identities and deterministic counts.
- Every automated evidence row in `context/foundation/test-plan.md` resolves to an existing passing test.
- Mobile lint, type checking, and all tests pass: `cd apps/mobile; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test`.
- API regression tests pass offline: `cd services/api; .\mvnw.cmd test`.
- Scope search confirms no backend profile storage, auth/sync, fuzzy matching, medical claims, nutrition rules, or S-03 warning UI entered this slice.

#### Manual Verification

- On a physical Android device, persisted predefined and custom CRUD survives repeated process restarts and only changes the active profile after successful Save.
- Corruption/failure recovery, dirty-discard, empty profile, broad-list navigation, and Home-to-scan regression checks pass against the MVP test plan.
- Human confirms the saved evaluator-rule output is ready for S-03 without exposing drafts or untranslated UI metadata.

**Implementation Note**: Pause for final S-02 acceptance before implementation review and archive.

---

## Testing Strategy

### Unit Tests

- Catalogue IDs and normalized canonical/alias tokens are globally unique.
- Shared normalization is Unicode-aware, locale-stable, trimmed, case-insensitive, and remains exact rather than substring/fuzzy.
- Profile CRUD preserves stable identities and rejects blank, oversized, duplicate, and reserved custom values.
- Strict document decoding covers valid v1, malformed JSON, wrong versions, missing/extra fields, unknown catalogue IDs, and invalid custom entries.
- Repository failure injection proves inactive-slot verification and pointer-last save ordering.
- Store tests prove active/draft separation across hydration, save, retry, restore, recovery, and error states.

### Integration Tests

- Saved profile round-trip into the provider/store and existing evaluator.
- Predefined sucralose aliases and custom case-insensitive exact matching after reload.
- Select/deselect/add/rename/delete effects on emitted rules and trigger count.
- Existing lookup/scanner suites as regression protection.

### Manual Testing Steps

1. Launch with no stored profile; confirm no selections and scanning remains available.
2. Browse and search all categories; select entries and add a custom ingredient.
3. Save, terminate the app, relaunch, and confirm the same profile.
4. Rename and delete custom entries, deselect predefined entries, save, and relaunch again.
5. Attempt blank, long, case/whitespace duplicate, predefined-name, and predefined-alias custom entries.
6. Leave with dirty changes and verify discard confirmation; simulate save failure and verify retry/restore behavior.
7. Exercise recoverable and unrecoverable corrupt storage without silent deletion.
8. Return Home and scan a product to confirm S-01 remains intact and no S-03 highlighting appears yet.

## Performance Considerations

- Keep the catalogue fixed and local; approximately 30 rows require no remote loading, pagination, or cache.
- Use a virtualized sectioned list and local normalized search index to avoid rendering the full editor hierarchy repeatedly.
- Persist only on explicit Save, not on every keystroke or toggle.
- Profile evaluation input remains small; no indexing beyond deterministic duplicate/catalogue maps is required.

## Security and Privacy Considerations

- The profile contains ingredient preferences, not credentials or secrets; unencrypted AsyncStorage is appropriate for this MVP.
- No profile data leaves the device or enters API requests in S-02.
- Do not log complete stored documents, custom ingredient values, or corrupt raw bytes.
- UI and docs describe personal avoidance choices, not allergies, medical suitability, or safety guarantees.

## Migration and Rollback

There are no existing profiles or production users to migrate. Missing storage initializes an empty v1 profile state. Unknown versions and corrupt documents remain explicit errors, not automatic resets. Rollback removes the provider/UI/storage dependency but may leave inert local keys; a future schema change must add a reviewed decoder/migration path rather than reinterpret v1 data.

## References

- `context/foundation/prd-v3.md` — FR-001 and FR-002
- `context/foundation/roadmap.md` — S-02 and S-03 handoff
- `context/foundation/shape-notes.md` — one-device and exact-match decisions
- `docs/reference/product-data-contract.md` — downstream alias/exact-match boundary
- `apps/mobile/src/domain/personal-rules.ts` — evaluator contract
- `apps/mobile/src/features/product-lookup/use-product-lookup.ts` — provider pattern
- `apps/mobile/src/components/product-scan/manual-barcode-entry.tsx` — form pattern
- `.agents/prompts/mvp-check.md` — certification evidence criteria
- Expo AsyncStorage: `https://docs.expo.dev/versions/latest/sdk/async-storage/`
- AsyncStorage API: `https://react-native-async-storage.github.io/3.0/api/usage/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Profile Domain, Catalogue, and MVP Test Plan

#### Automated

- [x] 1.1 Catalogue tests prove unique IDs/tokens and reviewed exact alias behavior. — 72632d3
- [x] 1.2 Profile tests prove stable persisted CRUD and cross-source duplicate rejection. — 72632d3
- [x] 1.3 Adapter tests preserve existing evaluator semantics and trigger counts. — 72632d3
- [x] 1.4 Mobile lint, type checking, and tests pass. — 72632d3
- [x] 1.5 MVP test plan maps every S-02 high-risk behavior to evidence. — 72632d3

#### Manual

- [x] 1.6 Human approves Polish labels, matching aliases, categories, and non-medical wording. — 72632d3

### Phase 2: Crash-Safe Local Persistence and Profile State

#### Automated

- [ ] 2.1 Repository tests prove strict v1 decoding, recovery, pointer-last saves, and last-valid preservation.
- [ ] 2.2 Store tests prove hydration, promotion, failure isolation, retry, and active-rule exposure.
- [ ] 2.3 Expo resolves the SDK-compatible AsyncStorage dependency and configuration.
- [ ] 2.4 Mobile lint, type checking, and tests pass.

#### Manual

- [ ] 2.5 Android restart and simulated save failure preserve the last saved profile and retryable draft.
- [ ] 2.6 Corrupt storage is reported or recovered without silent reset or overwrite.

### Phase 3: Profile Editor and Navigation

#### Automated

- [ ] 3.1 Editor/state tests prove draft CRUD, dirty tracking, validation, save isolation, retry, and restore.
- [ ] 3.2 Search/presentation tests preserve category order and matching metadata.
- [ ] 3.3 Existing product lookup and scanner suites remain passing.
- [ ] 3.4 Mobile lint, type checking, and tests pass.

#### Manual

- [ ] 3.5 Android Home exposes profile configuration without blocking empty-profile scanning.
- [ ] 3.6 Broad catalogue selection and custom inline CRUD work with understandable duplicate errors.
- [ ] 3.7 Save, retry, restore, dirty-back, keyboard, long-list, loading, recovery, and empty states are usable.

### Phase 4: Android Persistence and S-03 Handoff Verification

#### Automated

- [ ] 4.1 Persisted profile integration tests produce stable evaluator-compatible rules and counts.
- [ ] 4.2 Every automated MVP test-plan evidence row points to a passing test.
- [ ] 4.3 Mobile lint, type checking, and all tests pass.
- [ ] 4.4 API regression tests pass offline.
- [ ] 4.5 Scope checks find no backend profiles, auth/sync, fuzzy matching, medical claims, nutrition rules, or S-03 UI.

#### Manual

- [ ] 4.6 Physical Android persisted CRUD survives restarts and only promotes successful saves.
- [ ] 4.7 Recovery, dirty-discard, empty-profile, catalogue, and scan-regression checks pass the MVP test plan.
- [ ] 4.8 Human accepts the S-03 evaluator handoff and final S-02 behavior.
