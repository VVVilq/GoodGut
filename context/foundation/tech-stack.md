---
starter_id: spring
package_manager: maven
project_name: goodgut-server
hints:
  language_family: java
  team_size: solo
  deployment_target: railway
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: true
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

GoodGut needs a small server for barcode-based product lookup and dietary analysis while the mobile client remains a separate scaffold. The Spring Boot API lives in `services/api`, matches the chosen Java direction, provides typed and conventional service structure, and has verified bootstrapper support for a solo developer on a five-week after-hours MVP. The initial imported product dataset is required setup, but periodic refresh is excluded from MVP scope, so no background-job feature is recorded. The server is targeted at Railway with GitHub Actions and automatic deployment after merge to keep delivery straightforward.
