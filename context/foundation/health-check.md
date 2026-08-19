---
project: GoodGut
checked_at: 2026-08-18T19:25:48+02:00
health_status: critical-issues
context_type: brownfield
language_family: multi
stack_assessment_available: true
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 20
  moderate: 8
  low: 0
test_runner_detected: true
ci_provider: null
recommended_fixes: 7
---

## Dependency Health

### Lockfile

Status: present (`apps/mobile/package-lock.json`)
Package manager: npm for mobile; Maven wrapper metadata for API

### Security Audit

Tool: `npm audit --json` in `apps/mobile/`
Summary: 0 CRITICAL, 20 HIGH, 8 MODERATE, 0 LOW
Direct vs transitive: 5 direct packages are in affected chains (`expo`, `react-native`, `react-native-reanimated`, `react-native-worklets`, and moderate-severity `expo-splash-screen`); the remaining findings are transitive package nodes.

#### HIGH findings

- **Expo toolchain** — affected nodes include `expo`, `@expo/cli`, `@expo/metro`, `@expo/metro-config`, `metro`, `metro-config`, `metro-transform-worker`, and `image-size`. Several advisories concern denial of service; `image-size` includes infinite-loop advisories. Fix: first update within the compatible Expo SDK 56 line using Expo's installer, then audit again. Do not apply npm's suggested downgrade to Expo 53.
- **React Native toolchain** — affected nodes include `react-native`, `@react-native/community-cli-plugin`, `@react-native/metro-config`, `@react-native/virtualized-lists`, `react-native-reanimated`, `react-native-screens`, and `react-native-worklets`. Fix: align packages with Expo SDK 56 using `npx.cmd expo install --fix`, then re-run audit; review any remaining major-version proposal manually.
- **brace-expansion** — GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, and GHSA-rgw5-rvv9-x895: denial of service through unbounded/exponential expansion. Fix: refresh compatible transitive dependencies and verify resolved versions are outside affected ranges.
- **js-yaml** — GHSA-52cp-r559-cp3m and GHSA-5p4m-2wfm-xmqj: quadratic CPU consumption. Fix: resolve to `js-yaml` 4.3.1 or newer through a compatible parent update.
- **nanoid** — GHSA-28wg-ghj8-5hjv and GHSA-2v37-7h3g-55p8: generators can loop indefinitely for invalid sizes. Fix: resolve to `nanoid` 3.3.18 or newer.
- **postcss** — GHSA-fxqj-rqcc-2cmp: source-map path traversal/file disclosure. Fix: resolve to a patched release newer than 8.5.22 through a compatible dependency update.
- **shell-quote** — GHSA-395f-4hp3-45gv: quadratic-complexity denial of service. Fix: resolve to a release newer than 1.8.4.

MODERATE findings: 8 affected package nodes (`@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/prebuild-config`, `expo-splash-screen`, `uuid`, and `xcode`). The explicit `uuid` advisory is GHSA-w5hq-g745-h8pq; most others inherit severity through Expo configuration chains.

Java audit: skipped — Maven has no built-in dependency vulnerability audit. Recommended external tool: OWASP Dependency-Check or Dependabot after CI is introduced.

### Outdated Dependencies

Packages with major version gaps: 0 packages two or more major versions behind.

The registry reports one-major-line updates for Expo SDK 57 and related Expo packages, ESLint 10, TypeScript 7, React Native Gesture Handler 3, and React Native 0.87. These are not automatic MVP upgrades; stay on the Expo SDK 56 compatibility set and apply compatible patch updates first.

## Test Suite

Test runner: JUnit 5/Spring Boot test support for API; not detected for mobile
Tests found: 2 API tests; 0 mobile tests
Test execution: API passing; mobile not attempted
Configuration: `services/api/pom.xml`; no mobile test configuration
Framework: JUnit Platform via Maven Surefire 3.5.5

⚠ No mobile test runner detected. The agent cannot verify the core on-device rule evaluator and highlighting behavior.
Recommended: add Jest with the Expo-compatible `jest-expo` preset, a `test` script, and focused tests for ingredient matching, nutrition thresholds, unavailable values, and triggered-rule counts. Use the exact Expo SDK 56 testing instructions when selecting versions.

The documented `services/api/mvnw.cmd test` command currently fails inside the wrapper script (`Cannot index into a null array`). The same suite passes with the installed system Maven: 2 tests run, 0 failures, 0 errors.

## CI/CD

Provider: not detected
Configuration: not found

| Stage | Status | Notes |
|---|---|---|
| Lint | ✗ | No CI; local `npm.cmd run lint` passes |
| Test | ✗ | No CI; API tests pass locally, mobile runner absent |
| Build | ✗ | No CI; Maven and Expo build commands are not automated |
| Type check | ✗ | No CI; local `npx.cmd tsc --noEmit` fails with two missing CSS module declarations |
| Security | ✗ | No CI; npm audit is manual and Java audit is absent |

ℹ No CI/CD configuration detected. You'll set this up in the infrastructure and deployment lesson.
For now, working local verification commands are sufficient for agent collaboration once the Category A issues are fixed.

## Configuration

### High severity

- **Mobile test configuration** — the core PRD v3 rules have no automated verification path. Fix: configure an Expo-compatible test runner and add a `test` script.
- **Mobile TypeScript inputs** — strict mode is enabled, but `npx.cmd tsc --noEmit` fails because `src/components/animated-icon.module.css` and `global.css` (or their declarations) are missing. Fix: restore the intended files or remove the stale imports, then require a passing type-check.
- **`services/api/mvnw.cmd`** — the documented Windows wrapper fails before Maven starts due to a null-array access in the generated wrapper script. Fix: regenerate Maven Wrapper 3.3.4 from a working Maven installation and verify `.\mvnw.cmd test`.

### Medium severity

- **Formatter configuration** — no Prettier or equivalent shared formatter configuration is present. Fix: add a minimal repository formatter policy after confirming it does not conflict with Expo lint defaults.
- **`apps/mobile/AGENTS.md`** — it only links to Expo documentation and omits the source boundaries, verification commands, and generated-directory constraints recommended by the stack assessment. Fix: apply the ready-to-paste additions in `context/foundation/stack-assessment.md`.

### Low severity

- **`.editorconfig`** — no cross-editor whitespace convention is present. Fix: add a small root configuration covering UTF-8, final newline, and the repository's indentation conventions.

## Stack Assessment Cross-Reference

Stack assessment: `context/foundation/stack-assessment.md`
Agent readiness (from stack-assess): ready-with-compensation

| Quality Gate Gap | Health-Check Finding | Status |
|---|---|---|
| Mobile automated testing absent | No mobile test script, runner, configuration, or tests were found | Reinforced |
| Mobile conventions under-documented | Recommended additions are not present in `apps/mobile/AGENTS.md` | Reinforced |
| Typed gate passed | Strict TypeScript is configured, but the current project fails type-checking | Partly reinforced |
| API test conventions present | The API suite passes 2/2 under system Maven | Mitigated |

## Recommended Fixes

### Fix before agent work (Category A)

### 1. Triage and reduce high-severity mobile dependency findings

**Impact**: Agents should not build new MVP slices on a dependency graph with 20 high-severity findings, but an incompatible forced downgrade would be worse.
**Severity**: high
**Effort**: moderate (15–30 min)
**Fix**:

From `apps/mobile/`, run `npx.cmd expo install --fix`, inspect the proposed SDK 56-compatible changes, then run `npm.cmd audit --json` again. Do not run `npm audit fix --force` and do not accept the audit's Expo 53 or React Native 0.72 downgrade suggestions.

### 2. Add a mobile test runner and deterministic rule tests

**Impact**: Ingredient matching and numeric-threshold behavior are the product core; without tests, an agent cannot prove that matching, unavailable values, and counts remain correct.
**Severity**: critical
**Effort**: significant (> 1 hour)
**Fix**:

Follow the Expo SDK 56 Jest guide to install compatible `jest` and `jest-expo` packages, add `"test": "jest"` to `apps/mobile/package.json`, and cover the pure rule evaluator before UI-heavy tests.

### 3. Restore a passing mobile type-check

**Impact**: Strict typing only protects agent changes when the baseline compiles cleanly.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**:

Resolve the two missing CSS imports/declarations reported by `npx.cmd tsc --noEmit`, then rerun that command from `apps/mobile/`.

### 4. Repair the Windows Maven wrapper

**Impact**: Agents and course instructions rely on the checked-in wrapper, not a machine-specific Maven installation.
**Severity**: medium
**Effort**: moderate (15–30 min)
**Fix**:

Regenerate Maven Wrapper 3.3.4 from `services/api/`, keep the configured Maven 3.9.16 distribution and checksum validation, then verify `.\mvnw.cmd test`. Until repaired, `mvn test` is a confirmed local workaround.

### 5. Apply the mobile agent-instruction compensation

**Impact**: Explicit boundaries and verification commands reduce incorrect file placement and unverified agent edits.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

Copy the `apps/mobile/AGENTS.md` additions from `context/foundation/stack-assessment.md`, updating the test command after the runner is installed.

### Addressed in upcoming lessons (Category B)

### Add CI/CD verification

**Lesson**: Infrastructure and deployment
**What you'll do there**: Automate mobile lint/type/test checks, API wrapper tests, builds, and dependency scanning for every change.

### Add deployment configuration

**Lesson**: Infrastructure and deployment
**What you'll do there**: Encode the documented Railway API root and the chosen mobile delivery process in reproducible configuration.

## Summary

Health status: critical-issues

The repository has strong foundations: locked mobile dependencies, strict TypeScript configuration, passing mobile lint, and a passing two-test Spring Boot suite. It is not yet safe for sustained agent-assisted feature work because the mobile core has no test runner, the TypeScript baseline fails, the documented Maven wrapper is broken on Windows, and npm reports 20 high-severity dependency-chain findings that require compatibility-aware triage.

Next step: fix the dependency baseline, mobile type-check, test runner, and Maven wrapper; then proceed to agent onboarding and the first PRD v3 vertical slice.
