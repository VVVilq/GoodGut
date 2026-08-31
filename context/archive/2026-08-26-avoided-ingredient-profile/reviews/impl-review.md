<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Avoided Ingredient Profile

- **Plan**: context/changes/avoided-ingredient-profile/plan.md
- **Scope**: Full plan (Phases 1–4 of 4)
- **Date**: 2026-08-26
- **Verdict**: APPROVED
- **Findings**: 0 critical, 0 warnings, 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — In-flight edits can be marked saved without being persisted

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: apps/mobile/src/components/personal-profile/profile-editor.tsx:50-52
- **Detail**: `save()` submits the current draft asynchronously, then accepts whatever draft is in React state when the promise resolves. Because selection and custom-entry controls remain editable while saving, edits made during the request can become the new active baseline even though they were never written.
- **Fix**: Disable all draft-mutating controls while saving, or snapshot the submitted candidate and only accept that exact candidate while preserving concurrent edits as a dirty draft.
- **Decision**: FIXED — snapshot submitted candidate and preserve concurrent edits as dirty draft.

### F2 — Custom input can display stale text after restoring the draft

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/mobile/src/components/personal-profile/profile-editor.tsx:138-143
- **Detail**: `CustomRow` initializes local input state once and does not synchronize it when the parent restores or replaces the draft. The visible value can diverge from the profile model, and a later blur can write the stale value back.
- **Fix**: Synchronize the local input value from the `name` prop with an effect, or make the row fully controlled by editor state.
- **Decision**: FIXED — keyed custom rows by identity and name to remount with restored authoritative text; lint and tests pass.

### F3 — Duplicate/reserved errors omit the conflicting item

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: apps/mobile/src/features/personal-profile/profile-editor-state.ts:84-89
- **Detail**: Domain validation retains `conflictingId`, but `profileErrorMessage()` discards it and renders generic messages. The Phase 3 contract requires identifying the conflicting predefined or custom item so the user can understand the duplicate.
- **Fix**: Pass catalogue/custom names into error presentation and include the conflicting item's label in the field error.
- **Decision**: FIXED — error formatting now includes the conflicting predefined label or custom ingredient name.

## Verification Evidence

- Mobile: `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd test` passed (12 suites, 106 tests).
- API: `services/api/.\mvnw.cmd test` passed (21 tests).
- Manual progress rows for all phases are marked complete based on user approval.
