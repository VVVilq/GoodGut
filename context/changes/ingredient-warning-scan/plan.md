# Ingredient Warning Scan — Server Taxonomy Catalogue Plan

## Summary

Replace bundled name-and-alias matching with a server-owned, versioned Open Food Facts ingredient catalogue. Users see a small promoted list, can search the wider Polish/English catalogue, and may exclude either one taxonomy node or its complete descendant branch. The Spring API classifies product ingredients against the active OFF release; the anonymous mobile client keeps the personal profile locally and intersects saved selections with server evidence.

## Confirmed Decisions

| Area | Decision |
| --- | --- |
| Evaluation | Server classifies ingredients; mobile applies the local profile. |
| Catalogue | Full OFF ingredient taxonomy with Polish and English labels/synonyms. |
| Profile | Local-only and anonymous. |
| Custom entries | Retained as fallback exact-text rules after catalogue suggestions. |
| Selection | Explicit `node` or `subtree`; subtree removes redundant descendants. |
| Family semantics | Only OFF parent/descendant relationships; no GoodGut-derived edges. |
| Updates | Manual, versioned, validated import with atomic activation and rollback. |
| Discovery | Promoted starter list plus server-side search. |
| Migration | Existing profile v1 is intentionally reset with an explicit notice. |
| Partial parsing | Return certain matches plus incomplete status; never show a trustworthy zero. |
| Outage | Cached selections and classified products keep scans working. |

## Current State

- The API is stateless Spring MVC without JDBC, PostgreSQL, or Flyway.
- OFF responses contain stable taxonomy IDs and nesting, but `OpenFoodFactsProductMapper` discards IDs and returns derived names.
- Contract `1.0` exposes `ingredients.names`; the strict mobile decoder means structured evidence requires contract `2.0`.
- Mobile profile v1 stores bundled predefined IDs and custom text; catalogue/search/display labels ship in the app.
- Phase 1 (`ce0c3b1`) provides deterministic warning evidence and profile-state composition. Its lifecycle and custom exact matching remain useful.
- Warning-first Phase 2 UI exists in the working tree and must be preserved while its data seam changes.

## Target Architecture

PostgreSQL stores immutable OFF releases, taxonomy nodes, Polish/English labels and synonyms, and parent edges. Import creates and validates a staged release, then atomically activates it; it never truncates active data.

The API retains trusted OFF leaf IDs and resolves their ancestors in the active release. Found products carry ordered ingredient items with display text, taxonomy identity, ancestor evidence, catalogue version, and complete/partial evaluation status. Unknown fragments do not erase certain matches, but prevent a conclusive zero.

The mobile profile stores stable OFF node IDs, fallback Polish labels, and `node`/`subtree` scope. No selection or custom name is sent to GoodGut or OFF. Counts remain one per saved selection. The editor loads promoted nodes and debounced search results; cached selections remain usable during catalogue outages.

## Phase 1: Existing Match Evidence Foundation

Completed in `ce0c3b1`. Retain evidence, count-by-rule, last-durable-profile lifecycle, and exact custom-text matching. Remove predefined alias matching only after taxonomy evidence is integrated.

## Phase 2: Preserve Warning-First Presentation

### Changes Required

#### 1. Checkpoint current presentation work

**Files**: current modified result route, presentation, product-result component, theme, and presentation tests.

**Intent**: Preserve the completed warning-first UI before changing its data source.

**Contract**: Loading, profile error, partial/unavailable, zero, and triggered states remain before product facts. Components consume composition evidence and never independently match names.

### Success Criteria

#### Automated Verification

- Existing Phase 2 presentation tests, lint, type checking, mobile tests, and Expo public config pass.

#### Manual Verification

- Android light/dark rendering, long-list wrapping, TalkBack semantics, and recovery actions pass after final taxonomy integration.

## Phase 3: PostgreSQL Catalogue and Safe OFF Import

### Changes Required

#### 1. Database foundation

**Files**: `services/api/pom.xml`, `application.properties`, Flyway migrations, catalogue persistence packages.

**Intent**: Add PostgreSQL persistence suitable for Railway and deterministic local tests.

**Contract**: Environment-backed datasource configuration with no committed secrets. Flyway owns schema evolution. Tests use an isolated database setup without weakening production SQL semantics.

#### 2. Versioned taxonomy schema

**Files**: `services/api/src/main/resources/db/migration/`.

**Intent**: Store Polish/English discovery data and OFF's DAG without mutating an active release.

**Contract**: Tables represent releases, nodes, localized canonical/synonym terms, parent edges, and one active release. Public node IDs are canonical OFF IDs. Constraints prevent duplicate nodes/terms, missing edge endpoints, and multiple active releases.

#### 3. Manual import command

**Files**: new import service/parser/validation report/operator command and documentation.

**Intent**: Import a pinned OFF `ingredients.full.json` snapshot outside requests and startup.

**Contract**: Operator supplies revision/version and checksum. Import writes a staged release, validates identifiers, references, DAG integrity, label coverage and counts, then requires explicit activation. Failures leave the active release untouched; retain the prior release for rollback and OFF attribution.

### Success Criteria

#### Automated Verification

- Flyway creates the schema and enforces release/node/label/edge integrity.
- Fixtures prove Polish/English names and synonyms, multiple parents, normalization, failure isolation, activation, and rollback.
- API tests pass without live taxonomy access.

#### Manual Verification

- A reviewed OFF snapshot imports locally, reports counts/checksum, activates explicitly, and rolls back.

## Phase 4: Catalogue API and Profile Editor v2

### Changes Required

#### 1. Promoted and search endpoints

**Files**: new catalogue controller/service/DTOs and tests.

**Intent**: Provide a small initial selection and discovery across the full catalogue.

**Contract**: `GET /ingredient-catalogue/promoted?locale=pl` and `GET /ingredient-catalogue/search?q=...&locale=pl` return catalogue version, stable node ID, localized label with English fallback, breadcrumb, selectable/has-children metadata, and supported scopes. Search is normalized, ranked, bounded and paginated; no active release produces an explicit unavailable response.

#### 2. Cached mobile catalogue client

**Files**: mobile API adapter, strict decoders, repository/cache, state module, and tests.

**Intent**: Keep discovery responsive and preserve selection labels during API outages.

**Contract**: Debounced server search and atomic cache replacement by catalogue version. Cached promoted results may display as stale with an honest status. Network failure never deletes saved selections.

#### 3. Profile schema v2 and intentional reset

**Files**: mobile profile domain, codec, repository/store, and tests.

**Intent**: Store taxonomy selections while applying the approved reset safely.

**Contract**: v2 stores `selections[{nodeId,labelPl,scope:'node'|'subtree'}]` plus custom exact-text entries. First v1 load retains the old slot temporarily, initializes empty v2, and exposes a one-time reset notice; it is never reported as corruption. Subtree selection removes covered descendants.

#### 4. Hierarchical selection UX

**Files**: profile screen/editor components, editor state, and tests.

**Intent**: Let users select promoted nodes, search widely, inspect breadcrumbs, and choose node or branch scope.

**Contract**: Suggestions precede custom text creation. Nodes with descendants expose both scopes. Consolidation is explained. Loading/error/stale states and language fallback are accessible.

### Success Criteria

#### Automated Verification

- API tests cover locale, synonym, ranking, paging, breadcrumbs, promoted items, and unavailable catalogue.
- Mobile tests cover decoding, cache fallback, v1 reset notice, v2 round-trip, scope/overlap, custom entries, and failures.
- API and mobile quality gates pass.

#### Manual Verification

- A user can select promoted `Mleko`, find `mleko kozie` or `goat milk`, choose scope, and understand consolidation.
- Existing v1 data produces one reset notice and an empty editable v2 profile, not a corruption error.

## Phase 5: Product Contract 2.0 and Server Classification

### Changes Required

#### 1. Normative contract 2.0

**Files**: contract Markdown, canonical schemas/examples, fixtures, Java records, mobile types/decoder.

**Intent**: Preserve display evidence and stable taxonomy classification across the API boundary.

**Contract**: Available ingredients become ordered items with display name, canonical OFF node ID when resolved, and ancestor IDs from one declared catalogue version. Evaluation completeness is `complete` or `partial`; missing/unparseable remain explicit. Producer and consumers update together.

#### 2. OFF mapper identity preservation

**Files**: OFF mapper and focused tests.

**Intent**: Stop using an English-looking derived string as the only matching identity.

**Contract**: Trusted nested leaves retain OFF IDs and labels. Resolved leaves receive active-release ancestry. Safe resolved evidence remains available when other fragments are unknown, producing `partial` rather than discarding certain matches.

#### 3. Catalogue classifier

**Files**: new classification domain/service and tests.

**Intent**: Make OFF relationships the sole family authority.

**Contract**: Classification follows stored parent edges transitively, supports multiple parents, adds no GoodGut family edges, and identifies its catalogue version.

### Success Criteria

#### Automated Verification

- Schemas, examples, fixtures, controller tests, mapper tests, and strict mobile decoder implement v2.
- Goat/sheep milk and egg-yolk behavior occurs only when the imported OFF release supplies ancestry.
- Multiple parents, nested/localized ingredients, partial certain matches, and no partial zero are covered.
- API and mobile gates pass offline.

#### Manual Verification

- Representative products expose stable IDs, understandable display names, catalogue version, and honest completeness.

## Phase 6: Taxonomy Warning Integration and Acceptance

### Changes Required

#### 1. Hybrid evaluator

**Files**: mobile rules domain, warning composition, profile adapter, and tests.

**Intent**: Apply local node/subtree selections without transmitting the profile.

**Contract**: `node` matches exact identity; `subtree` matches identity or descendant evidence. One selection contributes one warning. Custom rules keep NFKC/trim/case-insensitive exact names. Partial results show certain warnings plus incompleteness, never neutral zero.

#### 2. Adapt warning-first UI

**Files**: preserved result route, presentation, product-result component, and tests.

**Intent**: Reuse the warning UI with taxonomy evidence.

**Contract**: Rows show saved Polish fallback label and matching product text. Complete non-matches show zero; partial matches/non-matches show incomplete evaluation. Facts remain usable during failures.

#### 3. Operations and acceptance documentation

**Files**: API/mobile READMEs, environment example, `context/foundation/test-plan.md`.

**Intent**: Document local PostgreSQL, Railway variables, import/activation/rollback, attribution, and Android acceptance.

**Contract**: No secrets or startup import. Test plan covers outage, stale cache, partial mapping, overlap, multiple parents, reset, rollback, accessibility, and scan lifecycle.

### Success Criteria

#### Automated Verification

- Cross-boundary tests prove imported taxonomy → classified product → local profile → warning evidence.
- Complete, partial, missing, and unparseable products never produce misleading results.
- Full API/mobile lint, type, test, and config gates pass.
- No auth, server profile persistence, GoodGut family edges, medical claims, nutrition rules, history, or recommendations enter scope.

#### Manual Verification

- Android covers promoted selection, bilingual search, goat/sheep milk, egg yolk, both scopes, custom fallback, partial state, outage, themes, TalkBack, retry, and rescan.
- Railway PostgreSQL serves search/classification and survives API redeployment.

## Testing Strategy

- Imports and database behavior use pinned fixtures; CI and startup never download OFF.
- Contract fixtures change atomically with contract version.
- Database tests cover constraints, activation/rollback, DAG traversal, multiple parents, and normalized search.
- Mobile tests cover cache/versioning, reset, scopes, privacy, custom fallback, partial evaluation, counts, and presentation.
- Real OFF and Android checks supplement deterministic fixtures.

## Performance and Railway

- Search is indexed, bounded, paginated, and server-side; mobile never downloads the full catalogue.
- Ancestors may be materialized during import or queried recursively after measurement; public behavior stays identical.
- Import never runs during startup/request handling. PostgreSQL is persistent; deployment filesystem is disposable.
- Railway Free is development-only. Measure catalogue/index size, memory, and monthly usage after the first import.

## Security, Privacy, Licensing

- Profiles/custom text stay on-device and out of requests, URLs, logs, analytics, and OFF calls.
- Datasource credentials and import controls use environment variables.
- Import validates size, checksum, structure, and identifiers.
- Preserve OFF/ODbL attribution and exact upstream revision per release.

## Migration and Rollback

- Flyway migrations are forward-only; catalogue rollback switches active immutable release.
- Contract v2 is a coordinated API/mobile development release, not a silent v1 extension.
- Profile v1 is intentionally reset once, retained temporarily for diagnostics, with an explicit notice.
- Integration failure falls back to unavailable/partial treatment, never a false complete alias-based result.

## References

- `context/foundation/prd-v3.md`
- `context/foundation/roadmap.md`
- `context/foundation/infrastructure.md`
- `docs/reference/product-data-contract.md`
- `services/api/src/main/java/com/example/goodgut_server/product/source/openfoodfacts/OpenFoodFactsProductMapper.java`
- `apps/mobile/src/data/personal-profile-codec.ts`
- `apps/mobile/src/domain/avoided-ingredients/catalog.ts`
- [OFF taxonomy structure](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/taxonomies/README.md)
- [OFF API](https://openfoodfacts.github.io/openfoodfacts-server/api/)

## Progress

> `- [ ]` pending, `- [x]` done; append `— <sha>` when committed. Manual rows require human confirmation.

### Phase 1: Existing Match Evidence Foundation

#### Automated
- [x] 1.1 Domain evidence and composition foundation completed. — ce0c3b1

#### Manual
- [x] 1.2 Transitional evidence semantics accepted. — ce0c3b1

### Phase 2: Preserve Warning-First Presentation

#### Automated
- [x] 2.1 Warning-first implementation and automated gates pass.

#### Manual
- [x] 2.2 Final Android visual, accessibility, and recovery acceptance passes.

### Phase 3: PostgreSQL Catalogue and Safe OFF Import

#### Automated
- [x] 3.1 PostgreSQL and Flyway foundation is verified. — 83f256f
- [x] 3.2 Taxonomy schema enforces release, node, label, and edge integrity. — 83f256f
- [x] 3.3 Pinned fixture imports, validates, activates, and rolls back safely. — 83f256f
- [x] 3.4 API tests pass without live taxonomy access. — 83f256f

#### Manual
- [x] 3.5 A reviewed real OFF snapshot imports and rolls back locally. — 83f256f

### Phase 4: Catalogue API and Profile Editor v2

#### Automated
- [x] 4.1 Catalogue APIs cover locale, synonyms, breadcrumbs, ranking, paging, and unavailable state. — b2e5e26
- [x] 4.2 Mobile cache and decoders cover fresh, stale, and unavailable data. — b2e5e26
- [x] 4.3 Profile v2 reset, persistence, scope, overlap, and custom fallback pass. — b2e5e26
- [x] 4.4 Editor coverage and API/mobile quality gates pass. — b2e5e26

#### Manual
- [x] 4.5 Bilingual discovery, scope, consolidation, and reset notice are usable on Android. — b2e5e26

### Phase 5: Product Contract 2.0 and Server Classification

#### Automated
- [x] 5.1 Contract schemas, examples, fixtures, API records, and mobile decoder implement v2. — 454a702
- [x] 5.2 OFF mapper preserves identities and partial evidence. — 454a702
- [x] 5.3 Classifier follows only OFF ancestry, including multiple parents. — 454a702
- [x] 5.4 Complete and partial contract regression suites pass. — 454a702

#### Manual
- [x] 5.5 Representative OFF products expose understandable versioned evidence. — 454a702

### Phase 6: Taxonomy Warning Integration and Acceptance

#### Automated
- [x] 6.1 Node/subtree and custom evaluation yields one warning per selection.
- [x] 6.2 UI distinguishes complete zero, partial evidence, and unavailable evaluation.
- [x] 6.3 Cross-boundary and full quality gates pass.
- [x] 6.4 Documentation, privacy, licensing, deployment, and scope checks pass.

#### Manual
- [x] 6.5 Physical Android taxonomy, partial/offline, visual, accessibility, and scan acceptance passes.
- [x] 6.6 Railway persistence and catalogue behavior survive API redeployment.
