---
project: "GoodGut"
version: 3
status: draft
created: 2026-08-18
context_type: brownfield
product_type: mobile
target_scale:
  users: small
  qps: null
  data_volume: null
timeline_budget:
  delivery_weeks: 3
  hard_deadline: 2026-09-08
  after_hours_only: true
---

## Current System Overview

GoodGut currently has an Expo mobile client, a Spring Boot API service, and a normalized product-data contract. The planned foundation includes barcode scanning, product lookup, Nutri-Score, local profiles, and explicit handling of missing product data. These capabilities must be preserved.

The earlier concept planned disease-specific analysis and medical-style product scores. That concept is superseded by this PRD; no disease analysis remains in the redesigned application.

## Problem Statement & Motivation

Two people with different shopping needs spend significant time in shops reading product labels before deciding what to buy. One checks ingredients such as sweeteners and rejects products containing selected ingredients such as sucralose; the other checks carbohydrates, glycemic-index information, and sugars.

GoodGut will reduce this repeated label-reading work by applying the shopper's own profile to scanned product information. The profile represents the shopper's personal rules and interests rather than a universal disease assessment.

## User & Persona

The primary persona is an individual shopper choosing packaged food in a store. The shopper uses one profile on one device and wants relevant ingredients and nutrition information surfaced quickly before choosing a product.

## Success Criteria

### Primary

- A shopper can configure ingredient exclusions and nutrition thresholds, scan a product, and see every matching product value highlighted together with the total number of triggered rules.
- A shopper without configured profile rules can scan a product and see its complete available ingredient list, Nutri-Score, kcal, sugars, fats, and other available nutrition values.

### Secondary

- No secondary outcomes are planned; every captured capability is mandatory for the MVP.

### Guardrails

- Missing ingredient or nutrition data is displayed as unavailable and is never interpreted as a non-match.
- Barcode scanning, product lookup, Nutri-Score, one-profile behavior, and missing-data handling must continue working while the product-data contract changes.
- The complete MVP flow must be usable on Android devices.

## User Stories

### US-01: Scan a product against personal shopping rules

- **Given** the shopper has one profile that may contain avoided ingredients and nutrition thresholds
- **When** the shopper scans a product barcode
- **Then** GoodGut shows the available product information, highlights every ingredient and nutrition value that triggers a configured rule, and shows the total number of triggered rules

#### Acceptance Criteria

- With no configured profile rules, the result shows the complete available ingredient list, Nutri-Score, kcal, sugars, fats, and other available nutrition values without personalized highlights.
- With configured rules, every matching avoided ingredient and crossed nutrition threshold is highlighted.
- The displayed trigger count equals the number of ingredient and nutrition rules triggered by the product.
- Missing ingredient or nutrition data is displayed as unavailable and is not counted as a non-match or trigger.
- No disease analysis or medical score appears.

## Scope of Change

- [modified] FR-001: The shopper can configure and edit one profile. Priority: must-have.
  > Socrates: No counter-argument selected; the requirement stands as written.
- [new] FR-002: The shopper can select avoided ingredients from a predefined list and add a custom ingredient when the list does not contain it. Priority: must-have.
  > Socrates: Counter-argument considered: the predefined list may omit an ingredient the shopper needs. Resolution: custom ingredient entry is included alongside the predefined list.
- [new] FR-003: The shopper can set an above or below threshold for a selected nutrition value and an explicit per-100-g or per-100-ml basis. Priority: must-have.
  > Socrates: Counter-argument considered: comparing thresholds across different or unknown nutrition bases could mislead the shopper. Resolution: each threshold has an explicit basis; a mismatched or unknown product basis is shown as unavailable for that rule.
- [preserved] FR-004: The shopper can scan a product barcode. Priority: must-have.
  > Socrates: No counter-argument selected; the requirement stands as written.
- [modified] FR-005: The shopper can see triggered rules first and then view the product's complete available ingredients, Nutri-Score, kcal, sugars, fats, and other available nutrition values. Priority: must-have.
  > Socrates: Counter-argument considered: displaying every value with equal prominence could make the result difficult to scan quickly. Resolution: triggered rules appear first while complete product details remain available below them.
- [new] FR-006: The shopper can see avoided ingredients highlighted when a predefined ingredient or known alias, or a case-insensitive exact custom ingredient name, occurs in the scanned product. Priority: must-have.
  > Socrates: Counter-argument considered: exact text matching may miss synonyms, spelling variants, or translated names. Resolution: predefined ingredients use known aliases, custom ingredients use case-insensitive exact-name matching, and uncertain matches do not trigger.
- [new] FR-007: The shopper can see nutrition values highlighted when they are strictly above or strictly below configured thresholds with a matching basis; equality does not trigger. Priority: must-have.
  > Socrates: Counter-argument considered: equality at the threshold needs deterministic behavior. Resolution: above and below comparisons are strict, so equality does not trigger either rule.
- [new] FR-008: The shopper can see the total number of profile rules triggered by the scanned product. Priority: must-have.
  > Socrates: No counter-argument selected; the requirement stands as written.
- [preserved] FR-009: The shopper can see a prominent unavailable state when product data required by a configured rule is missing, without unrelated missing values cluttering the rule summary. Priority: must-have.
  > Socrates: Counter-argument considered: showing every absent field prominently could overwhelm the result. Resolution: prominent warnings are limited to missing values relevant to configured rules.
- [modified] FR-010: The shopper can continue using product lookup and Nutri-Score without receiving disease analysis, and new behavior follows the superseding personal-rules concept. Priority: must-have.
  > Socrates: Counter-argument considered: old disease-oriented documents could accidentally influence implementation. Resolution: this PRD explicitly supersedes the old concept; historical documents remain but cannot define new behavior.
- [removed] Disease-specific profiles, disease analysis, medical-style product scores, and medical suitability judgments are removed from the product concept.

## Constraints & Compatibility

- There are no existing user profiles or production users, so no existing user data needs conversion.
- The existing normalized product-data contract does not require backward compatibility and may be replaced to support the redesigned concept.
- Barcode scanning, product lookup, Nutri-Score, one profile, and explicit missing-data behavior remain required product capabilities.
- Historical disease-analysis documents do not define new implementation behavior; this PRD is authoritative for the redesigned product concept.

## Business Logic Changes

The earlier concept would have evaluated a scanned product against a disease profile and produced condition-specific analysis or medical-style scores.

This change replaces that rule: GoodGut triggers a warning when a scanned product contains an ingredient excluded by the shopper's profile or when a nutrition value is strictly above or below its configured threshold with a matching basis.

An ingredient warning is triggered by a predefined ingredient or its known alias, or by a case-insensitive exact match for a custom ingredient. A nutrition warning is triggered only when the product value and configured threshold use the same per-100-g or per-100-ml basis; equality does not trigger. Triggered product information is highlighted in red and contributes one rule to the displayed total. Missing or uncertain data never triggers a warning and is shown as unavailable when relevant to a configured rule.

## Access Control Changes

No access-control roles are added. One shopper uses one profile on one device, with no login, account synchronization, sharing, or role separation. The profile changes from a disease selection to personal ingredient exclusions and nutrition thresholds.

## Non-Goals

- No disease analysis, medical scoring, or medical advice; personal shopping rules replace the old medical concept.
- No positive or green rules; the MVP supports negative warning rules only.
- No multiple profiles, login, account synchronization, or sharing; one profile per device is sufficient.
- No iOS, web, or desktop interface; Android mobile is the only required client.
- No scan history or product recommendations; both are deferred until after the core scan-and-highlight flow works.

## Open Questions

None identified during shaping.
