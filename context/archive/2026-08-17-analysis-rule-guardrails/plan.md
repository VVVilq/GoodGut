# Analysis Rule Guardrails Implementation Plan

## Overview

Define GoodGut's documentation-only MVP analysis contract for diabetes, celiac disease, and ulcerative colitis (WZJG). The contract gives later backend and mobile work deterministic rules without inventing medical thresholds, treating missing data as favorable evidence, or presenting heuristic output as diagnosis or treatment advice.

## Current State Analysis

GoodGut has a normalized product-data contract but no analysis runtime, endpoint, mobile analysis UI, or disease-specific tests. The product contract exposes carbohydrates, sugars, fibre, ingredient/allergen evidence, gluten evidence, and per-condition readiness, and already prohibits suitability judgments when required inputs are missing.

The PRD expects diabetes and WZJG scores from `1-100`, but authoritative guidance does not support universal item-level clinical scores for either condition. This plan replaces those scores with transparent facts, cautious categories, and separate WZJG flare/remission factor panels. Celiac remains the categorical exception when explicit gluten or cross-contact evidence is present.

## Desired End State

The repository contains `docs/reference/analysis-rule-guardrails.md` as the normative design input for S-03 and S-04. It defines a common result envelope, stable reason codes, evidence maturity, safety invariants, condition decision tables, missing/conflicting-data precedence, and normalized-input test vectors.

The contract is complete when downstream implementers can reproduce every result without raw Open Food Facts data or invented medical rules, and readers can distinguish active rules, inactive research candidates, general label facts, and claims awaiting clinical review.

### Key Discoveries:

- The API exposes only `/health`; analysis domain code does not exist (`services/api/src/main/java/com/example/goodgut_server/HealthController.java:1`).
- The product contract requires `insufficient_data` rather than a judgment when evidence is missing (`docs/reference/product-data-contract.md:137`).
- Diabetes readiness requires carbohydrates, sugars, and fibre; celiac requires explicit gluten evidence; WZJG inputs were intentionally deferred (`docs/reference/product-data-contract.md:149`).
- Silence or missing allergen data cannot become negative gluten evidence (`context/archive/2026-06-24-minimal-product-data-contract/reviews/impl-review-phase-2.md:23`).
- F-02 is a foundation contract that unlocks S-03/S-04, not runtime implementation (`context/foundation/roadmap.md:78`).
- EU rules provide reproducible low-sugar/sugar-free and fibre facts but do not define diabetes suitability or a high-GI inference.
- The selected caution uses a published UK high-sugar label threshold and must never be named `high_gi`.
- IBD guidance does not support deterministic UC product scores; proposed WZJG signals require contextual or inactive treatment.

## What We're NOT Doing

- Implementing Java analysis classes, an endpoint, or a mobile consumer.
- Changing the product lookup adapter, normalized model, or source fixtures.
- Producing numeric diabetes/WZJG scores or estimating GI.
- Calling products `safe`, diagnosing, advising on treatment/medication, or performing symptom triage.
- Storing or asking for the current WZJG phase.
- Activating dairy, spicy-food, emulsifier, or ultra-processing warnings.
- Writing final localized UI copy; S-04 owns presentation.
- Treating user testing as clinical validation.

## Implementation Approach

Create one canonical reference document organized as an executable prose specification: shared safety/result rules, condition decision tables, then normalized-input vectors. Every active rule references a versioned source and evidence-maturity entry. Inactive candidates remain visible but cannot emit output.

The contract consumes only `docs/reference/product-data-contract.md`, keeps product facts separate from interpretation, applies missing/conflicting evidence before favorable outcomes, and exposes stable codes for S-03 implementation and S-04 localization.

## Critical Implementation Details

### Medical-claim boundary

The PRD's numeric diabetes and WZJG scores are intentionally superseded. `consider`, `individual_tolerance`, and `no_*_identified` are bounded heuristic states, not suitability, treatment, or safety claims. The document must state that user testing precedes clinical review and does not clinically validate a rule.

### Evidence and precedence

Evidence strength and output severity are separate. Positive gluten or explicit cross-contact evidence overrides a gluten-free claim; missing evidence never becomes favorable evidence; inactive WZJG candidates never affect output. Reason codes use stable ordering.

## Phase 1: Shared Contract and Safety Invariants

### Overview

Establish normative scope, shared result structure, evidence governance, and non-negotiable safety rules.

### Changes Required:

#### 1. Canonical Document and Product Decision Delta

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Create the durable F-02 contract and document why evidence categories replace the PRD's diabetes/WZJG scores.

**Contract**: Identify the document as a draft MVP validation contract and normative input to S-03/S-04. Define the three conditions, specification-only scope, numeric-score delta, self-identified dietary-profile assumption, and non-goals.

#### 2. Common Result Envelope

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Give downstream code one explainable shape for available and unavailable assessments.

**Contract**: Define `contractVersion`, `condition`, `status`, condition-specific `result`, ordered `reasonCodes`, observed `facts`, `missingFields`, `ruleRefs`, `disclaimerCode`, and `limitations`. Status is `assessment_available | insufficient_data`; unavailable results have no condition judgment and identify missing/unavailable evidence.

#### 3. Sources, Evidence Maturity, and Invariants

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Make rules auditable and stop provisional ideas from becoming medical claims.

**Contract**: Define `regulatory`, `guideline_strong`, `guideline_conditional`, `public_practice`, `emerging`, and `insufficient_or_conflicting`. Every rule records source, population/context, version/access date, inputs, missing-data behavior, and activation. Invariants prohibit `safe`, diagnosis, treatment, medication, inferred-GI, and symptom-triage claims.

### Success Criteria:

#### Automated Verification:

- Guardrail document contains scope, decision-delta, envelope, evidence-maturity, safety-invariants, and source-registry sections.
- Allowed statuses are defined once and no numeric diabetes/WZJG score contract is introduced.
- Every active source entry contains a URL, version/access date, context, and maturity.

#### Manual Verification:

- Human confirms replacing numeric scores is intentional.
- Human confirms deterministic behavior is distinguished from clinical validation.

**Implementation Note**: After automated verification, pause for manual confirmation before proceeding.

---

## Phase 2: Condition-Specific Decision Tables

### Overview

Define deterministic rules, precedence, output, and inactive candidates for each condition using normalized product evidence.

### Changes Required:

#### 1. Diabetes Label Facts and Caution

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Provide a useful caution without presenting sugar concentration as GI or treatment advice.

**Contract**: Emit EU facts for `low_sugars` (at most `5 g/100g` solid or `2.5 g/100ml` liquid), `sugar_free` (at most `0.5 g/100g` or `100ml`), `source_of_fibre` (at least `3 g/100g` or `1.5 g/100kcal` when energy exists), and `high_fibre` (at least `6 g/100g` or `3 g/100kcal`). A UK label-based high-sugar caution above `22.5 g/100g` solid or `11.25 g/100ml` liquid emits `consider` plus `diabetes.high_sugars_label_flag`, never `high_gi`. Without active caution, emit `no_caution_flags_identified`, never `safe`. Carbohydrates/fibre remain facts. Missing any upstream-required diabetes input yields `insufficient_data` while known facts may remain visible.

#### 2. Celiac Evidence and Conflicts

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Turn explicit gluten evidence into conservative categorical results while preserving uncertainty.

**Contract**: Results are `avoid` and `no_conflict_identified`; unknown evidence yields `insufficient_data`. Declared gluten/wheat/barley/rye and explicit `may contain` evidence emit `avoid` with distinct codes. Authoritative gluten-free evidence emits `no_conflict_identified` only without positive conflict. Positive/precautionary evidence wins. Self-identification does not diagnose; `no_conflict_identified` never means `safe`.

#### 3. WZJG Panels and Research Catalogue

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Preserve flare/remission contexts without unsupported scores or universal verdicts.

**Contract**: Every available result contains `flare` and `remission` panels using `individual_tolerance`, `no_active_factors_identified`, or `insufficient_data`. High fibre may create a flare-context tolerance caution, never an inflammation claim. Fat is potentially active only after a normalized field and defensible threshold exist, so it is currently non-evaluable. Dairy, spicy food, emulsifiers, and ultra-processing are inactive research candidates with rationale and cannot emit output. Panels include care-plan limitations but no triage.

#### 4. Precedence and Reason Codes

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Make missing data, conflicts, and multiple rules deterministic.

**Contract**: Order evaluation as upstream readiness, required-input completeness, evidence conflicts, active rules, stable reason ordering, then limitations/disclaimer. Codes are condition-namespaced and contain no localized prose.

### Success Criteria:

#### Automated Verification:

- Diabetes, celiac, WZJG-flare, and WZJG-remission tables define inputs, predicate, precedence, status, code, facts, missing/conflict behavior, source, maturity, and activation.
- Diabetes uses selected thresholds without GI inference or `limit`.
- Celiac covers positive, precautionary, negative, unknown, and conflicting evidence.
- WZJG marks fibre contextual, fat blocked, and dairy/spicy/emulsifier/ultra-processing inactive.
- Active codes are unique, namespaced, source-linked, and exercised.

#### Manual Verification:

- Human confirms the diabetes caution is a sugar-label flag, not GI.
- Human confirms inactive WZJG candidates cannot affect results.
- Human confirms celiac wording avoids absolute safety.

**Implementation Note**: After automated verification, pause for manual confirmation before proceeding.

---

## Phase 3: Test Vectors and Downstream Handoff

### Overview

Make the specification implementable through exact examples, validation constraints, and ownership boundaries.

### Changes Required:

#### 1. Normalized-Input Vectors

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Give future tests exact outcomes without live source calls or prose interpretation.

**Contract**: Each vector defines ID, minimal normalized input, expected status/result, ordered codes, facts, missing fields, rule references, disclaimer, and limitations. Cover equality/adjacent threshold boundaries, solid/liquid basis, each missing diabetes field, celiac evidence/conflicts, WZJG active fibre/inactive candidates/missing inputs, and mandatory dual panels.

#### 2. Safety-Invariant Vectors

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Test safety constraints as well as rule predicates.

**Contract**: Assert no numeric score, `safe`, high-GI inference, treatment claim, symptom triage, or favorable fallthrough; facts retain `100g_or_100ml`; inactive rules emit nothing; code order is stable.

#### 3. Validation and Handoff

**File**: `docs/reference/analysis-rule-guardrails.md`

**Intent**: Define provisional validation and later slice ownership.

**Contract**: Record user testing first and clinical review as deferred, not completed. Test materials call the output an MVP prototype without clinical validation. S-03 implements Java rules/tests; S-04 owns localized copy/presentation. Neither may reinterpret statuses or activate candidates without a reviewed contract change.

### Success Criteria:

#### Automated Verification:

- Every active rule has positive, boundary/conflict, and missing-data vectors as applicable.
- All vector references resolve to registry entries.
- Scope check confirms F-02 adds no runtime implementation.

#### Manual Verification:

- Human predicts representative results from tables alone.
- Human confirms user-testing limitations are prominent.
- Human confirms S-03/S-04 boundaries are actionable.

**Implementation Note**: After automated verification, pause for manual confirmation before closing the change.

---

## Testing Strategy

### Unit Tests:

- F-02 is documentation-only; use structural checks and deterministic vector review.
- S-03 must translate every active vector into focused backend tests without changing expected codes/order.
- Threshold vectors cover below, equal, and above values for solid/liquid bases.

### Integration Tests:

- F-02 adds no integration code.
- Future tests consume GoodGut-normalized fixtures, not raw Open Food Facts or live calls.
- Future API tests verify readiness failures prevent favorable analysis.

### Manual Testing Steps:

1. Trace one product through each condition using normalized fields only.
2. Verify missing/conflicting evidence follows precedence.
3. Review examples for forbidden certainty, diagnosis, treatment, inferred-GI, or safety wording.
4. Confirm inactive WZJG candidates produce nothing.
5. Confirm user-test materials disclose missing clinical validation.

## Performance Considerations

No runtime work is added. Tables remain deterministic/local so S-03 needs no network or dynamic rule lookup during a scan.

## Migration Notes

No data/runtime migration is included. This contract supersedes the PRD's numeric diabetes/WZJG representation for downstream work. Activating fat or other inactive candidates later may require a separate normalized-product-contract change and fixtures.

## References

- `docs/reference/product-data-contract.md`
- `context/foundation/roadmap.md`
- `context/foundation/prd-v2.md`
- `context/foundation/shape-notes.md`
- `context/archive/2026-06-24-minimal-product-data-contract/reviews/impl-review-phase-2.md`
- EU claims regulation: `https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex:32006R1924`
- UK front-of-pack guidance: `https://www.gov.uk/government/publications/front-of-pack-nutrition-labelling-guidance`
- ADA Standards 2026: `https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932/5-Facilitating-Positive-Health-Behaviors-and-Well`
- ACG celiac guideline: `https://pubmed.ncbi.nlm.nih.gov/36602836/`
- NICE celiac recommendations: `https://www.nice.org.uk/guidance/ng20/chapter/Recommendations`
- ECCO IBD diet consensus: `https://academic.oup.com/ecco-jcc/article/19/9/jjaf122/8198055`
- Polish NCEZ IBD guidance: `https://ncez.pzh.gov.pl/choroba-a-dieta/choroby-ukladu-pokarmowego/nieswoiste-choroby-zapalne-jelit-zalecenia-zywieniowe/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Shared Contract and Safety Invariants

#### Automated

- [ ] 1.1 Guardrail document contains the required shared-contract sections
- [ ] 1.2 Allowed statuses are defined once and numeric diabetes/WZJG scores are absent
- [ ] 1.3 Every active source entry contains provenance and evidence maturity

#### Manual

- [ ] 1.4 Human confirms the numeric-score replacement is intentional
- [ ] 1.5 Human confirms deterministic behavior is distinguished from clinical validation

### Phase 2: Condition-Specific Decision Tables

#### Automated

- [ ] 2.1 All four condition/context tables define the complete rule contract
- [ ] 2.2 Diabetes rules use selected label thresholds without GI inference or a limit result
- [ ] 2.3 Celiac rules cover positive, precautionary, negative, unknown, and conflicting evidence
- [ ] 2.4 WZJG rules keep unsupported candidates inactive and contextualize active cautions
- [ ] 2.5 Active reason codes are unique, namespaced, source-linked, and exercised

#### Manual

- [ ] 2.6 Human confirms diabetes caution is not represented as GI
- [ ] 2.7 Human confirms inactive WZJG candidates cannot affect results
- [ ] 2.8 Human confirms celiac results avoid absolute safety language

### Phase 3: Test Vectors and Downstream Handoff

#### Automated

- [ ] 3.1 Every active rule has positive, boundary or conflict, and missing-data vectors as applicable
- [ ] 3.2 All vector references resolve to defined registry entries
- [ ] 3.3 Repository scope check confirms F-02 added no runtime implementation

#### Manual

- [ ] 3.4 Human predicts representative results from the decision tables alone
- [ ] 3.5 Human confirms user-testing limitations are prominent
- [ ] 3.6 Human confirms S-03 and S-04 ownership boundaries are actionable
