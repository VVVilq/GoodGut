---
bootstrapped_at: 2026-06-23T13:24:09.6128024+02:00
starter_id: expo
starter_name: Expo (React Native)
project_name: goodgut-mobile
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

Source: `context/foundation/tech-stack-mobile.md`

```yaml
starter_id: expo
package_manager: npm
project_name: goodgut-mobile
hints:
  language_family: js
  team_size: solo
  deployment_target: expo-go
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

GoodGut is a mobile-first MVP for Android scanning and profile-based food product assessment, while the existing Spring Boot service remains the backend API. Expo is the recommended default for a JavaScript mobile app, supports a typed React Native workflow, and is verified by the bootstrapper, which keeps scaffolding predictable for a solo after-hours project. The PRD excludes login, payments, realtime features, AI, and background jobs from the mobile client; Expo Go is the fastest first-run target before later packaging with EAS or store distribution.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | `create-expo-app` v4.0.0 published 2026-05-15T22:46:00.140Z | fresh | resolved from Expo starter command |
| GitHub repo | not run | n/a | registry docs URL is `https://docs.expo.dev`, not a GitHub repo URL |

## Scaffold log

**Resolved invocation:** `npx.cmd create-expo-app .bootstrap-scaffold --yes --template default`  
**Target directory:** `apps/mobile`  
**Strategy:** subdir-then-move  
**Exit code:** 0  
**Project files present after move:** 57 excluding `node_modules`  
**Conflicts (.scaffold siblings):** none  
**.gitignore handling:** moved silently  
**.bootstrap-scaffold cleanup:** deleted  

Post-scaffold normalization:

- Renamed package from `bootstrap-scaffold` to `goodgut-mobile` in `apps/mobile/package.json` and `apps/mobile/package-lock.json`.
- Renamed Expo app metadata from `.bootstrap-scaffold` to `GoodGut` / `goodgut-mobile` in `apps/mobile/app.json`.
- Added ESLint packages and generated `apps/mobile/eslint.config.js` through `npm run lint`.
- Replaced synchronous hydration state in `apps/mobile/src/hooks/use-color-scheme.web.ts` with `useSyncExternalStore` so `npm run lint` passes.

## Post-scaffold audit

**Tool:** `npm audit --json`  
**Summary:** 0 CRITICAL, 0 HIGH, 11 MODERATE, 0 LOW  
**Direct vs transitive:** 2 direct MODERATE of total 11 MODERATE; 9 MODERATE are transitive.

Direct MODERATE findings:

- `expo`
- `expo-splash-screen`

Transitive MODERATE findings:

- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/inline-modules`
- `@expo/local-build-cache-provider`
- `@expo/metro-config`
- `@expo/prebuild-config`
- `uuid`
- `xcode`

`npm audit fix --force` advertises SemVer-major changes for the Expo dependency chain, so no automatic fix was applied.

## Verification commands

- `npm.cmd run lint` in `apps/mobile`: passed.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | verified |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | expo-go |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | false |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

## Next steps

Useful manual steps:

- Run the app from `apps/mobile` with `npm run android` or `npm run web`.
- Review the 11 MODERATE npm audit findings before production packaging; avoid `npm audit fix --force` unless you intentionally accept the Expo major-version changes it proposes.
- Keep Git at the repository root so mobile and backend changes can land in the same vertical-slice commits.
