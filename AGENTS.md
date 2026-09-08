# Repository Guidelines

## Critical Project Rules

- The current product contract is [context/foundation/prd-v3.md](context/foundation/prd-v3.md). Earlier PRDs are historical; do not use them to reintroduce disease profiles, medical scores, or medical suitability judgments.
- Do not commit secrets into API properties, mobile `.env` files, or app config. Document required environment variables without credential values.
- Do not archive or rewrite foundation history unless a skill explicitly calls for it. Foundation document conventions are in [context/foundation/README.md](context/foundation/README.md).
- Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

## Repository Map and Scoped Instructions

GoodGut is a monorepo. Git lives at the repository root so a vertical slice can include mobile, API, and documentation in one commit.

Before changing a module, read its local instructions alongside this file:

- `apps/mobile/` — Expo client; [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) defines mobile architecture and verification.
- `services/api/` — Spring Boot API; [services/api/AGENTS.md](services/api/AGENTS.md) defines backend structure, conventions, commands, and deployment.
- [README.md](README.md) — local startup, including the root `scripts/dev.ps1` launcher, and Railway deployment. Railway's API service root is `services/api/`.
- [.editorconfig](.editorconfig) — formatting settings; module manifests define dependency versions.

## Planning and Verification

- Read [context/foundation/prd-v3.md](context/foundation/prd-v3.md) for current product behavior and [context/foundation/roadmap.md](context/foundation/roadmap.md) for slice sequencing.
- For a planned change, use `context/changes/<change-id>/plan.md` as its implementation contract and `context/changes/<change-id>/reviews/` for review results.
- Use [context/foundation/test-plan.md](context/foundation/test-plan.md) for risk coverage and quality gates. Run the affected module's checks from its local `AGENTS.md` before handoff; changes spanning both modules require both sets of checks.
- Report verification results and any checks that could not run, including device acceptance still pending.
- If `context/foundation/lessons.md` exists, read relevant recurring project rules before planning or implementing. The root `lessons/` directory contains local course materials, not the project's incident register.

## Commits and Pull Requests

Use short imperative commit subjects, such as `Add health endpoint`. PR descriptions should state the resulting behavior, verification results, and configuration changes.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

<!-- END @przeprogramowani/10x-cli -->
