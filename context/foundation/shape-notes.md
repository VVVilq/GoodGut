---
project: "GoodGut"
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
created: 2026-08-18
updated: 2026-08-18
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "context type"
      decision: "brownfield - existing GoodGut project with a changed app concept"
    - topic: "primary persona scope"
      decision: "One shopper uses one local profile on one device in the MVP."
    - topic: "concept change"
      decision: "Preserve barcode scanning, product lookup, Nutri-Score, local profiles, and missing-data handling; remove disease analysis."
    - topic: "access model"
      decision: "One local profile per device with no login and no additional roles."
    - topic: "nutrition threshold direction"
      decision: "A profile threshold can flag a selected nutrition value when it is either above or below the user-defined limit."
    - topic: "mvp delivery"
      decision: "The complete first-launch, profile, scan, highlighting, and triggered-rule-count flow is mandatory and targeted for three weeks of after-hours work."
    - topic: "missing product data"
      decision: "Missing ingredient or nutrition data is shown as unavailable and never treated as a non-match."
    - topic: "ingredient matching"
      decision: "Predefined ingredients use known aliases; custom ingredients use case-insensitive exact-name matching; uncertain matches do not trigger."
    - topic: "threshold equality"
      decision: "Above and below comparisons are strict; a value equal to the configured threshold does not trigger."
    - topic: "legacy concept precedence"
      decision: "The new PRD supersedes the old disease-analysis concept; old documents remain historical and cannot define new implementation behavior."
    - topic: "rule polarity"
      decision: "The MVP supports negative warning rules only; triggered information is highlighted in red and there are no positive green rules."
    - topic: "compatibility and migration"
      decision: "No user-profile migration or backward-compatible product contract is required because there are no existing users or stored profiles."
    - topic: "product framing"
      decision: "GoodGut remains a mobile-only application for a handful of users, delivered after hours within three weeks by 2026-09-08."
    - topic: "deferred capabilities"
      decision: "Scan history and product recommendations are left for later and are not part of this MVP."
  frs_drafted: 10
  quality_check_status: accepted
---

## Seed Idea

I have colitis ulcerosa, my gf have diabetes, we spend a lot of time in shops to read through the labbels, i want to lessen the pain of picking the right things. For example, i look at sweeteners and discard products that have for example sucralose in them, my gf looks at the carbs, ig and suggars. Im doint this project mostly for ourself, and in the proces i want to get certification in 10x course

## Context Decision

Brownfield: the existing GoodGut application remains in place, but its product concept is being changed.

## Current System Overview

GoodGut currently has an Expo mobile client, a Spring Boot API service, and a normalized product-data contract. The planned foundation includes barcode scanning, product lookup, Nutri-Score, local profiles, and explicit handling of missing product data. These capabilities must be preserved.

The earlier concept planned disease-specific analysis and medical-style product scores. That concept is being removed; no disease analysis remains in the redesigned application.

## Problem Statement & Motivation

Two people with different shopping needs spend significant time in shops reading product labels before deciding what to buy. One checks ingredients such as sweeteners and rejects products containing selected ingredients such as sucralose; the other checks carbohydrates, glycemic-index information, and sugars.

GoodGut will reduce this repeated label-reading work by applying the shopper's own profile to scanned product information. The profile represents the shopper's personal rules and interests rather than a universal disease assessment.

## User & Persona

The primary persona is an individual shopper choosing packaged food in a store. The shopper uses one local profile on one device and wants relevant ingredients and nutrition information surfaced quickly before choosing a product.

## Access Control Changes

One shopper uses one local profile on one device. There is no login, account synchronization, or role separation.

The profile contains personal ingredient exclusions and selected nutrition values with user-defined thresholds. Each nutrition threshold can flag a value that is either above or below the configured limit.

## Draft MVP Flow

1. On first launch, GoodGut offers profile configuration.
2. The shopper selects ingredients to avoid from a predefined list.
3. The shopper sets above or below thresholds for selected nutrition values.
4. The shopper scans a product barcode.
5. When no profile rules are configured, GoodGut shows the complete available ingredient list, Nutri-Score, kcal, sugars, fats, and other available nutrition values.
6. When profile rules are configured, GoodGut highlights every ingredient and nutrition value that triggers a rule and shows the total number of triggered rules.

## Success Criteria

### Primary

- A shopper can configure ingredient exclusions and nutrition thresholds, scan a product, and see every matching product value highlighted together with the total number of triggered rules.
- A shopper without configured profile rules can scan a product and see its complete available ingredient list, Nutri-Score, kcal, sugars, fats, and other available nutrition values.

### Secondary

- No secondary outcomes are planned; every captured capability is mandatory for the MVP.

### Guardrails

- Missing ingredient or nutrition data is displayed as unavailable and is never interpreted as a non-match.
- Existing barcode scanning, product lookup, Nutri-Score, local-profile, and missing-data behavior must continue working while the product-data contract is expanded.

## Scope of Change

- FR-001: The shopper can configure and edit one local profile. Priority: must-have. Change: modified
  > Socrates: No counter-argument selected; the requirement stands as written.
- FR-002: The shopper can select avoided ingredients from a predefined list and add a custom ingredient when the list does not contain it. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: the predefined list may omit an ingredient the shopper needs. Resolution: custom ingredient entry is included alongside the predefined list.
- FR-003: The shopper can set an above or below threshold for a selected nutrition value and an explicit per-100-g or per-100-ml basis. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: comparing thresholds across different or unknown nutrition bases could mislead the shopper. Resolution: each threshold has an explicit basis; a mismatched or unknown product basis is shown as unavailable for that rule.
- FR-004: The shopper can scan a product barcode. Priority: must-have. Change: preserved
  > Socrates: No counter-argument selected; the requirement stands as written.
- FR-005: The shopper can see triggered rules first and then view the product's complete available ingredients, Nutri-Score, kcal, sugars, fats, and other available nutrition values. Priority: must-have. Change: modified
  > Socrates: Counter-argument considered: displaying every value with equal prominence could make the result difficult to scan quickly. Resolution: triggered rules appear first while complete product details remain available below them.
- FR-006: The shopper can see avoided ingredients highlighted when a predefined ingredient or known alias, or a case-insensitive exact custom ingredient name, occurs in the scanned product. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: exact text matching may miss synonyms, spelling variants, or translated names. Resolution: predefined ingredients use known aliases, custom ingredients use case-insensitive exact-name matching, and uncertain matches do not trigger.
- FR-007: The shopper can see nutrition values highlighted when they are strictly above or strictly below configured thresholds with a matching basis; equality does not trigger. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: equality at the threshold needs deterministic behavior. Resolution: above and below comparisons are strict, so equality does not trigger either rule.
- FR-008: The shopper can see the total number of profile rules triggered by the scanned product. Priority: must-have. Change: new
  > Socrates: No counter-argument selected; the requirement stands as written.
- FR-009: The shopper can see a prominent unavailable state when product data required by a configured rule is missing, without unrelated missing values cluttering the rule summary. Priority: must-have. Change: preserved
  > Socrates: Counter-argument considered: showing every absent field prominently could overwhelm the result. Resolution: prominent warnings are limited to missing values relevant to configured rules.
- FR-010: The shopper can continue using product lookup and Nutri-Score without receiving disease analysis, and new behavior follows the superseding personal-rules concept. Priority: must-have. Change: modified
  > Socrates: Counter-argument considered: old disease-oriented documents could accidentally influence implementation. Resolution: the new PRD explicitly supersedes the old concept; historical documents remain but cannot define new behavior.

## User Stories

### US-01: Scan a product against personal shopping rules

- **Given** the shopper has one local profile that may contain avoided ingredients and nutrition thresholds
- **When** the shopper scans a product barcode
- **Then** GoodGut shows the available product information, highlights every ingredient and nutrition value that triggers a configured rule, and shows the total number of triggered rules

#### Acceptance Criteria

- With no configured profile rules, the result shows the complete available ingredient list, Nutri-Score, kcal, sugars, fats, and other available nutrition values without personalized highlights.
- With configured rules, every matching avoided ingredient and crossed nutrition threshold is highlighted.
- The displayed trigger count equals the number of ingredient and nutrition rules triggered by the product.
- Missing ingredient or nutrition data is displayed as unavailable and is not counted as a non-match or trigger.
- No disease analysis or medical score appears.

## Business Logic Changes

GoodGut triggers a warning rule when a scanned product contains an ingredient excluded by the local profile or when a nutrition value is strictly above or below its configured threshold with a matching basis.

An ingredient warning is triggered by a predefined ingredient or its known alias, or by a case-insensitive exact match for a custom ingredient. A nutrition warning is triggered only when the product value and configured threshold use the same per-100-g or per-100-ml basis; equality does not trigger.

Triggered product information is highlighted in red and contributes one rule to the displayed total. The MVP has no positive or green rules. Missing or uncertain data never triggers a warning and is shown as unavailable when relevant to a configured rule.

## Constraints & Compatibility

- There are no existing user profiles or production users, so no profile migration is required.
- The existing normalized product-data contract does not require backward compatibility and may be replaced to support the redesigned concept.
- Barcode scanning, product lookup, Nutri-Score, one local profile, and explicit missing-data behavior remain required product capabilities.
- Historical disease-analysis documents do not define new implementation behavior.

## Non-Functional Requirements

- The complete MVP flow is usable on Android devices.

## Product Framing

- GoodGut remains a mobile-only application.
- The intended live user base is the shopper and at most a handful of people.
- Delivery is after-hours within three weeks, with a hard deadline of 2026-09-08.

## Non-Goals

- No disease analysis, medical scoring, or medical advice; personal shopping rules replace the old medical concept.
- No positive or green rules; the MVP supports negative warning rules only.
- No multiple profiles, login, account synchronization, or sharing; one local profile per device is sufficient.
- No iOS, web, or desktop interface; Android mobile is the only required client.
- No scan history or product recommendations; both are deferred until after the core scan-and-highlight flow works.

## Open Questions

- None identified during shaping.

## Quality cross-check

- Access Control: present — one local profile per device with no login or roles.
- Business Logic: present — deterministic ingredient and nutrition-threshold warning rules are defined.
- Project artifacts: present — this file carries a valid finalized checkpoint.
- Timeline-cost acknowledgment: present — delivery is limited to three weeks.
- Non-Goals: present — disease analysis, positive rules, multi-profile access, non-Android clients, scan history, and recommendations are excluded.
- Preserved behavior: present — barcode scanning, product lookup, Nutri-Score, local profile behavior, and missing-data handling remain required.
