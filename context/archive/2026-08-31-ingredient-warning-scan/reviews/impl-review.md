<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Ingredient Warning Scan — Server Taxonomy Catalogue Plan

- **Plan**: context/changes/ingredient-warning-scan/plan.md
- **Scope**: Phases 1–6 of 6
- **Date**: 2026-09-02
- **Verdict**: APPROVED
- **Findings**: 0 critical, 9 warnings, 0 observations

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

### F1 — Persisted descendants survive parent-subtree consolidation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: apps/mobile/src/features/personal-profile/profile-editor-state.ts:5
- **Detail**: `createProfileEditorState` initializes `ancestryByNode` empty. Descendant removal only knows ancestry discovered in the current editor session, so a saved descendant can remain after reopening and selecting its parent subtree. This violates the contract that subtree selection removes covered descendants.
- **Fix**: Consolidate from authoritative ancestry returned with the selected catalogue item, or resolve saved selections against the catalogue before applying the parent selection; add a reopen/persisted-selection regression test.
  - Strength: Enforces the profile invariant across sessions rather than only within one editor session.
  - Tradeoff: Requires either richer catalogue ancestry data in editor state or a bounded lookup before save.
  - Confidence: HIGH — the empty initialization and ancestry-dependent removal are directly observable.
  - Blind spot: The preferred UX during a catalogue outage needs a product decision.
- **Decision**: FIXED — persisted taxonomy selections now retain ancestor IDs; backward-compatible decoding defaults legacy selections to empty ancestry; reopen regression coverage added.

### F2 — Import can activate releases without required label coverage

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: services/api/src/main/java/com/example/goodgut_server/catalogue/importer/TaxonomyImportService.java:91
- **Detail**: Import validates non-empty nodes and DAG acyclicity, then records counts. It does not reject missing Polish/English canonical-label coverage or validate meaningful count expectations before activation, although the plan explicitly requires label-coverage and count validation.
- **Fix**: Add staged-release validation for required English fallback coverage, declared/minimum counts, and tests proving invalid releases cannot activate.
  - Strength: Prevents an unusable but structurally valid catalogue from becoming active.
  - Tradeoff: Requires explicit acceptance thresholds and a validation report contract.
  - Confidence: HIGH — no such validation exists in the import completion path.
  - Blind spot: The acceptable Polish coverage threshold is not specified in the plan.
- **Decision**: FIXED — staged-release validation now checks parsed/stored counts, requires nodes and labels, and rejects missing English canonical-label coverage before activation; regression coverage added.

### F3 — Verified checksum is not bound to imported bytes

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: services/api/src/main/java/com/example/goodgut_server/catalogue/importer/TaxonomyImportService.java:44
- **Detail**: The service hashes a caller-controlled path and then reopens that path for three parser passes. If the file changes after hashing or between passes, persisted data can differ from the recorded checksum or become internally inconsistent.
- **Fix**: Hash while copying to an immutable temporary snapshot, import every pass from that snapshot, and delete it in a `finally` block.
  - Strength: Cryptographically binds the recorded checksum to the bytes actually imported.
  - Tradeoff: Uses temporary disk space approximately equal to the taxonomy snapshot.
  - Confidence: HIGH — the current path is reopened after checksum verification.
  - Blind spot: Available ephemeral disk capacity on the operator host has not been measured.
- **Decision**: FIXED — checksum calculation now copies into a temporary snapshot, all parser passes use those verified bytes, and try-with-resources deletes the snapshot; mutation and cleanup regression coverage added.

### F4 — Catalogue requests perform full-release work

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architecture
- **Location**: services/api/src/main/java/com/example/goodgut_server/catalogue/IngredientCatalogueService.java:58
- **Detail**: Every promoted, search, or children response loads every taxonomy edge and every canonical label to enrich at most 50 returned rows. Search/count also use leading-wildcard `LIKE '%query%'`, which the declared B-tree index cannot efficiently serve. Response pagination therefore does not bound database or application work for the full OFF taxonomy.
- **Fix A ⭐ Recommended**: Query breadcrumbs and child metadata only for returned IDs with bounded recursive/batched SQL and add an index suitable for normalized substring search.
  - Strength: Makes work proportional to the requested page and preserves stateless scaling.
  - Tradeoff: More complex SQL and PostgreSQL-specific integration tests.
  - Confidence: HIGH — current enrichment explicitly loads full tables on every request.
  - Blind spot: Production taxonomy size and query latency have not been benchmarked.
- **Fix B**: Cache immutable release metadata in the API process, keyed by active release version, while adding an index-appropriate search strategy.
  - Strength: Simpler request path and exploits immutable releases.
  - Tradeoff: Higher process memory and cache invalidation/version-switch complexity.
  - Confidence: MEDIUM — viability depends on measured full-catalogue memory.
  - Blind spot: Railway memory limits and catalogue size are not recorded.
- **Decision**: FIXED via Fix A — catalogue enrichment now uses a bounded recursive query for returned IDs and their ancestors; PostgreSQL receives a vendor-specific pg_trgm GIN index while H2 keeps common migrations only; bounded-query regression coverage added.

### F5 — Product classification uses an N+1 query loop

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: services/api/src/main/java/com/example/goodgut_server/product/classification/CatalogueIngredientClassifier.java:20
- **Detail**: A lookup performs `activeRelease()` and then `containsNode()` plus `ancestorIds()` for every distinct ingredient. Product scan latency therefore grows as `1 + 2N` database queries for N ingredients.
- **Fix**: Add one batch/recursive repository query for all requested IDs and group node/ancestor evidence in memory.
  - Strength: Removes query-count growth on the public scan hot path while preserving evidence semantics.
  - Tradeoff: Requires a more involved result-grouping query and regression tests.
  - Confidence: HIGH — the query calls occur inside the per-ID loop.
  - Blind spot: Current production ingredient-count distribution has not been measured.
- **Decision**: FIXED — classification now uses one recursive batch query for all requested IDs and groups ancestor evidence in memory; missing nodes, root nodes, duplicates, and multiple-parent ancestry are covered.

### F6 — Search wildcards can trigger broad expensive queries

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: services/api/src/main/java/com/example/goodgut_server/catalogue/IngredientCatalogueRepository.java:28
- **Detail**: User `%` and `_` characters retain SQL `LIKE` wildcard meaning. A two-character query such as `%%` is accepted, matches nearly everything, and forces broad ranking and count scans. Values are parameterized, so this is not SQL injection.
- **Fix**: Escape `LIKE` metacharacters with an explicit `ESCAPE` clause or reject queries without alphanumeric content.
- **Decision**: FIXED — search and count patterns now escape backslash, `%`, and `_` and use an explicit escape character; literal wildcard regression coverage added.

### F7 — Initial catalogue loading races duplicate requests

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/mobile/src/features/personal-profile/use-ingredient-catalogue.ts:13
- **Detail**: One mount effect loads promoted data and the query effect immediately loads it again for the initial empty query. Completions can arrive out of order and React Strict Mode can amplify the duplicate work.
- **Fix**: Give one effect ownership of promoted loading and guard state updates with a request generation or abort-aware latest-request check.
- **Decision**: FIXED — one effect now owns promoted/search loading, and a tested request-generation guard prevents stale effect or retry completions from updating React state.

### F8 — No automated test proves the complete cross-boundary chain

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/ingredient-warning-scan/plan.md:335
- **Detail**: Server tests import taxonomy or test classification with mocked repositories, while mobile tests consume handwritten classification evidence. No test bridges imported persistence through classification/contract output into the local-profile warning evaluator, despite the explicit Phase 6 success criterion.
- **Fix**: Add a versioned shared boundary fixture generated by a real imported-taxonomy/classifier integration test and consume that exact fixture in the mobile decoder/evaluator test.
  - Strength: Detects producer/consumer drift across the complete evidence chain.
  - Tradeoff: Requires a deterministic fixture handoff between Maven and Jest suites.
  - Confidence: HIGH — existing tests stop at separate component boundaries.
  - Blind spot: CI orchestration for cross-project fixture generation is not currently documented.
- **Decision**: FIXED — a committed boundary fixture is asserted against real importer/database/classifier/mapper output and consumed unchanged by the mobile decoder and subtree-warning evaluator.

### F9 — Completion overstates outage and manual evidence

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/ingredient-warning-scan/plan.md:341
- **Detail**: The plan promises cached classified products during outages, but only promoted catalogue data and saved selections are cached; no product-result cache exists. All manual rows are checked, while the recorded confirmation was explicitly brief with deeper testing deferred, and there is no observable Railway redeployment or full TalkBack evidence.
- **Fix A ⭐ Recommended**: Reopen the unsupported manual rows, narrow the outage claim to cached catalogue/profile behavior, and track product-result caching as a separate planned change.
  - Strength: Makes current status honest without expanding this already-large slice.
  - Tradeoff: The change remains open until focused Android/Railway checks are completed.
  - Confidence: HIGH — no product cache exists in the changed files and the verification was described as brief.
  - Blind spot: External Railway evidence may exist outside this workspace.
- **Fix B**: Implement classified-product caching now and repeat documented Android/Railway acceptance.
  - Strength: Delivers the original outage statement literally.
  - Tradeoff: Material scope expansion with cache invalidation, retention, privacy, and stale-result UX decisions.
  - Confidence: MEDIUM — the architecture is feasible but not planned in implementation detail.
  - Blind spot: Product-cache retention and invalidation requirements are undefined.
- **Decision**: FIXED via Fix A — unsupported manual checks were reopened, outage language now reflects cached catalogue/profile behavior only, and classified-product caching is tracked as a separately planned follow-up.

## Verification Evidence

- `cd apps/mobile; npm.cmd run lint` — PASS
- `cd apps/mobile; npm.cmd run typecheck` — PASS
- `cd apps/mobile; npm.cmd test` — PASS (14 suites, 115 tests)
- `cd apps/mobile; npx.cmd expo config --type public` — PASS (SDK 56.0.0)
- `cd services/api; .\mvnw.cmd test` — PASS (32 tests)
- Latest post-triage gates: mobile lint/typecheck PASS, mobile Jest PASS (15 suites, 119 tests), API Maven PASS (39 tests).
- Manual Android, real OFF snapshot, and Railway rows are reopened pending focused human verification.

## Triage Summary

- **Fixed**: F1, F2, F3, F4 (Fix A), F5, F6, F7, F8, F9 (Fix A)
- **Skipped**: none
- **Accepted risks**: none
- **Remaining gate**: none; all reopened manual checks were user-confirmed on 2026-09-02.
