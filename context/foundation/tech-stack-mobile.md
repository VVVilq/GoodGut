---
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
---

## Why this stack

GoodGut is a mobile-first MVP for Android scanning and profile-based food product assessment, while the existing Spring Boot service remains the backend API. Expo is the recommended default for a JavaScript mobile app, supports a typed React Native workflow, and is verified by the bootstrapper, which keeps scaffolding predictable for a solo after-hours project. The PRD excludes login, payments, realtime features, AI, and background jobs from the mobile client; Expo Go is the fastest first-run target before later packaging with EAS or store distribution.
