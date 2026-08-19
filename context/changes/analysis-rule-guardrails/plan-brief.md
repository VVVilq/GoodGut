# Analysis Rule Guardrails — Plan Brief

> Full plan: `context/changes/analysis-rule-guardrails/plan.md`

## What & Why

Define a safe, deterministic MVP contract for diabetes, celiac disease, and WZJG before runtime or UI work. It replaces unsupported numeric precision with transparent label facts, bounded categories, evidence provenance, and explicit uncertainty.

## Starting Point

GoodGut has a normalized product contract and no analysis implementation. The PRD promises numeric diabetes/WZJG scores, while the product contract already requires `insufficient_data` and prohibits judgments from missing evidence.

## Desired End State

S-03 and S-04 can implement and present results from one canonical document without inventing thresholds or medical wording. Every active result is reproducible, every reason points to a source-backed rule, and inactive candidates cannot affect users.

## Key Decisions Made

| Decision | Choice | Why |
| --- | --- | --- |
| F-02 scope | Documentation-only specification | Review semantics before runtime code. |
| Diabetes output | Label facts plus `consider`; no score or `limit` | Avoid unsupported clinical precision. |
| Diabetes caution | Published UK high-sugar label threshold | Produce a caution without inferring GI. |
| Partial diabetes data | `insufficient_data` plus available facts | Preserve no-judgment while retaining facts. |
| Celiac positive evidence | `avoid`, including explicit `may contain` | Conservative cross-contact handling. |
| Celiac negative evidence | `no_conflict_identified`, never `safe` | Useful without an absolute guarantee. |
| Profile meaning | Self-identified dietary need | Low friction without diagnosis claims. |
| WZJG output | Separate flare/remission panels, no scores | Preserve context without unsupported precision. |
| WZJG active scope | Fibre contextual; fat blocked pending data/threshold | Limit behavior to auditable evidence. |
| WZJG catalogue | Dairy, spicy, emulsifiers, and UPF inactive | Preserve ideas without speculative warnings. |
| Safety escalation | No symptom triage | Keep scanning outside medical assessment. |
| Contract format | Prose, tables, registries, test vectors | Human-reviewable and executable later. |
| Validation order | User testing first; clinical review deferred | Record the chosen MVP path and its risk. |

## Scope

**In scope:**

- Common envelope, stable codes, facts, limitations, missing-data rules, source registry, and evidence maturity
- Diabetes, celiac, WZJG-flare, and WZJG-remission tables
- Label-based diabetes facts/high-sugar caution
- Conservative celiac precedence
- Active/inactive WZJG catalogue
- Boundary/conflict/missing-data/forbidden-claim vectors plus user-test and S-03/S-04 handoff

**Out of scope:**

- Java engine, endpoint, or mobile UI
- Numeric scores or inferred GI
- Diagnosis, treatment, medication guidance, or symptom triage
- Stored WZJG phase, personal trigger list, final localized copy, or clinical validation

## Architecture / Approach

`docs/reference/analysis-rule-guardrails.md` consumes normalized fields from `docs/reference/product-data-contract.md`. Shared safety/evidence rules govern condition tables; test vectors define what S-03 implements and S-04 communicates.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Shared Contract and Safety Invariants | Result shape, evidence governance, PRD delta, forbidden claims | Determinism may be mistaken for clinical validation. |
| 2. Condition-Specific Decision Tables | Diabetes, celiac, and dual-context WZJG rules | Inactive candidates may accidentally appear active. |
| 3. Test Vectors and Downstream Handoff | Exact outcomes and slice ownership | User testing may overstate confidence. |

**Prerequisites:** Archived F-01 product contract.
**Estimated effort:** Three focused documentation/review sessions.

## Open Risks & Assumptions

- The UK threshold is a general label rule, not a diabetes-specific Polish/EU medical threshold.
- User testing precedes clinical review; all results remain provisional.
- Fat needs a normalized field and defensible predicate before activation.
- Ingredient text cannot reliably activate spicy, emulsifier, or UPF judgments.
- New evidence may require a versioned contract revision.

## Success Criteria (Summary)

- Implementers can derive every active result and code from the contract alone.
- Missing/conflicting data never becomes a favorable judgment.
- Numeric-score, inferred-GI, absolute-safety, treatment, and triage claims are excluded.
