---
project: GoodGut
checked_at: 2026-09-08
health_status: needs-attention
context_type: brownfield
language_family: multi
stack_assessment_available: true
checks_run: [lockfile, dependency_audit, test_runner, ci_cd, configuration]
audit_findings:
  critical: 0
  high: 0
  moderate: 0
  low: 0
test_runner_detected: true
ci_provider: GitHub Actions
recommended_fixes: 0
---

## Dependency Health

### Lockfile

Status: `apps/mobile/package-lock.json` present; clean `npm.cmd ci` succeeded and applied the query-string compatibility patch. API Maven Wrapper present.
Package manager: npm; Maven Wrapper.

### Security Audit

Tool: `npm.cmd audit --json` for mobile; Java dependency scanner not configured.
Summary on 2026-09-08: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW; exit code 0.
The previously reported 5 high and 15 moderate findings have been removed from the npm dependency tree. This does not constitute an audit of application logic or Java dependencies.

Remediation: compatible Expo SDK 57 patch updates, Metro 0.84.5, updated browserslist and xmldom, UUID 11.1.1 scoped to xcode, and decode-uri-component 0.5.0. A one-line query-string import patch preserves compatibility with the decoder's ESM default export. See `apps/mobile/patches/README.md` for rationale and removal criteria. No audit suppression or forced SDK downgrade was used.

### Outdated Dependencies

`npx.cmd expo install --check` passes. A general npm/Java outdated-package review was not run.

## Test Suite

- Mobile: 21 Jest suites / 218 tests pass, plus 3 Node dependency compatibility tests run by `pretest`.
- Mobile lint and TypeScript checks pass.
- Android production JavaScript/Hermes export with a cleared Metro cache succeeds, including asset processing. Output is local under `.tmp/security-android-export/`.
- API: 42 tests passed earlier on 2026-09-08; no API changes were made in this dependency remediation, so the suite was not repeated.
- Physical Android acceptance and a native APK build were not performed for these dependency updates.

Configuration: `apps/mobile/package.json`; `services/api/pom.xml`.

## CI/CD

Provider: GitHub Actions.
Configuration: `.github/workflows/quality.yml`.

| Stage | Configuration | Local verification on 2026-09-08 |
|---|---|---|
| Lint | Configured | Passed |
| Test | Configured | 218 Jest + 3 compatibility tests; earlier 42 API tests passed |
| Build | Not configured | Android JS/Hermes export passed; native package not built |
| Type check | Configured | Passed |
| Security | Configured, blocking at high severity | npm audit passed with zero findings |

Remote workflow execution for these dependency changes is unverified. Deployment remains outside this workflow. The API job invokes `bash ./mvnw test` because the wrapper is tracked without its executable bit.

## Configuration

No newly detected configuration blocker. The root `.editorconfig` and scoped agent instructions are present. The query-string patch is applied by `postinstall`; installations must include development dependencies and permit lifecycle scripts for the documented build/test workflow.

## Stack Assessment Cross-Reference

Stack assessment: `context/foundation/stack-assessment.md` (historical baseline).

| Quality Gate Gap | Current evidence | Status |
|---|---|---|
| Mobile automated testing absent | Jest and dependency compatibility tests pass | Mitigated |
| Mobile conventions were thin | Scoped AGENTS.md documents boundaries and verification | Mitigated |
| Delivery automation absent | Workflow configured; remote results for this change unverified | Partially mitigated |

## Recommended Fixes

No remaining npm audit remediation is identified by the current scan. Maintain the dependency overrides and patch until upstream packages incorporate compatible fixes; rerun audit and compatibility checks when removing them.

Delivery follow-up: verify CI for the updated lockfile and perform physical Android acceptance. Native build/deployment automation and Java dependency scanning remain outside the completed verification.

## Summary

All reported npm vulnerabilities are resolved and local mobile checks pass. Overall readiness remains `needs-attention` because remote CI, native/device acceptance for this update, and Java vulnerability scanning are not verified. Do not interpret the clean npm report as proof that the entire product is vulnerability-free.
