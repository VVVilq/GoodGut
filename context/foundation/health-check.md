---
project: GoodGut
checked_at: 2026-09-08T16:31:42+02:00
health_status: needs-attention
context_type: brownfield
language_family: multi
stack_assessment_available: true
checks_run: [lockfile, dependency_audit, test_runner, ci_cd, configuration]
audit_findings:
  critical: 0
  high: 5
  moderate: 15
  low: 0
test_runner_detected: true
ci_provider: GitHub Actions
recommended_fixes: 1
---

## Dependency Health

### Lockfile

Status: `apps/mobile/package-lock.json` present; API Maven Wrapper present
Package manager: npm; Maven Wrapper

### Security Audit

Tool: `npm.cmd audit --json` for mobile; Java dependency scanner not configured
Summary: 0 CRITICAL, 5 HIGH, 15 MODERATE, 0 LOW
Direct vs transitive: findings are primarily transitive; Expo packages are direct dependency paths.

Review the advisory paths and upgrade through a compatible Expo SDK release. Do not run `npm.cmd audit fix --force` without reviewing the major-version changes.

### Outdated Dependencies

Outdated-package checks were not run in this verification. npm audit identifies advisory remediation suggestions, not a verified compatible upgrade path.

## Test Suite

Test runner: Jest (`jest-expo`) for mobile; Maven Surefire/JUnit 5 for API
Tests found: 21 mobile suites / 218 tests; 11 API test classes / 42 tests
Test execution: passing locally on 2026-09-08 (218 mobile tests; 42 API tests). Mobile lint and typecheck also passed. npm audit completed with exit code 1 and the findings above.

Configuration: `apps/mobile/package.json`; `services/api/pom.xml`
Framework: Jest 29.7 with `jest-expo` 57.0.5; Spring Boot 4.0.6 with JUnit 5

The mobile lint script now uses ESLint directly with `--no-cache`, avoiding the stale `.expo` cache permission failure. API dependencies resolved successfully and all tests pass.

## CI/CD

Provider: GitHub Actions
Configuration: `.github/workflows/quality.yml`

| Stage | Configuration | Local verification on 2026-09-08 |
|---|---|---|
| Lint | Configured | Passed: `npm.cmd run lint` |
| Test | Configured | Passed: 218 mobile tests and 42 API tests |
| Build | Not configured | Not run |
| Type check | Configured | Passed: `npm.cmd run typecheck` |
| Security | Configured, blocking at high severity | Audit failed: 5 high and 15 moderate findings |

The workflow is configured locally; execution on GitHub Actions has not been verified. With the current dependency findings, `npm audit --audit-level=high` is expected to fail the mobile job. Deployment remains outside this workflow. The API job invokes `bash ./mvnw test` because the wrapper is tracked without its executable bit.

## Configuration

### High severity

No high-severity configuration gaps detected.

### Medium severity

- **Dependency advisories** — npm reports 5 high and 15 moderate transitive advisories. Fix: review paths and upgrade through a compatible Expo SDK release.

### Low severity

No low-severity configuration gaps remain from this audit; a root `.editorconfig` is now present.

## Stack Assessment Cross-Reference

Stack assessment: `context/foundation/stack-assessment.md`
Agent readiness (from stack-assess): ready-with-compensation

| Quality Gate Gap | Health-Check Finding | Status |
|---|---|---|
| Mobile test runner previously missing | Jest and `jest-expo` now run 21 suites | Mitigated |
| Mobile conventions were thin | Root and scoped `AGENTS.md` files document boundaries | Partially mitigated |
| Delivery automation absent | `.github/workflows/quality.yml` configures quality checks; remote execution unverified | Partially mitigated |

## Recommended Fixes

### Fix before agent work (Category A)

### 1. Review and remediate npm advisories

**Impact**: the mobile dependency tree contains 5 high and 15 moderate advisories.
**Severity**: high
**Effort**: significant (> 1 hour)
**Fix**:

Review `npm.cmd audit` dependency paths and upgrade through a compatible Expo SDK release. Avoid `npm.cmd audit fix --force` because it proposes incompatible major versions.

### Addressed in upcoming lessons (Category B)

### Build and deployment automation

**Lesson**: infrastructure and deployment
**What you'll do there**: add build/package and Railway deployment verification to the existing quality workflow.

## Summary

Health status: needs-attention

GoodGut now has passing local quality gates (218 mobile tests and 42 API tests), a working lint command, a shared editor policy, and a CI workflow configured for lint, typecheck, tests, and npm audit (remote execution unverified). The remaining material issue is the mobile dependency tree, which reports 5 high and 15 moderate advisories requiring a reviewed Expo/Metro upgrade path.

Next step: review the npm advisory paths and plan a compatible Expo upgrade; verify the new workflow on GitHub after pushing; the security gate remains blocked by the current findings.
