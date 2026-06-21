---
bootstrapped_at: 2026-05-31T19:36:49.3801847+02:00
starter_id: spring
starter_name: Spring Boot
project_name: goodgut-server
language_family: java
package_manager: maven
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: null
---

## Hand-off

```yaml
---
starter_id: spring
package_manager: maven
project_name: goodgut-server
hints:
  language_family: java
  team_size: solo
  deployment_target: fly
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
```

## Why this stack

GoodGut needs a small server for barcode-based product lookup and dietary analysis while the mobile client remains a separate scaffold. Spring Boot matches the chosen Java direction, provides typed and conventional service structure, and has verified bootstrapper support for a solo developer on a five-week after-hours MVP. The initial imported product dataset is required setup, but periodic refresh is excluded from MVP scope, so no background-job feature is recorded. The server is targeted at Fly.io with GitHub Actions and automatic deployment after merge to keep delivery straightforward.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | not run | n/a | Non-JS starter; no npm scaffold package applies. |
| GitHub repo | not run | n/a | Registry docs_url is `https://docs.spring.io/spring-boot/`, not a GitHub repo URL. |

## Scaffold log

**Resolved invocation**: `curl.exe -sS -o .bootstrap-scaffold.tgz https://start.spring.io/starter.tgz -d dependencies=web,devtools -d type=maven-project -d javaVersion=21 -d groupId=com.example -d artifactId=goodgut-server; tar -xzf .bootstrap-scaffold.tgz -C .bootstrap-scaffold`

**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 8 root entries (`.mvn`, `src`, `.gitattributes`, `.gitignore`, `HELP.md`, `mvnw`, `mvnw.cmd`, `pom.xml`)
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

PowerShell note: the registry template pipes `curl` directly into `tar`; on this Windows shell that corrupted the binary stream. The equivalent download-to-file-and-extract flow above was used for this run.

Sanity check: `.\mvnw.cmd -q test` was attempted after scaffolding. It did not run because the local `java` on PATH is Java 8 (`1.8.0_302`), while the generated project targets Java 21 and Spring Boot dependencies require a newer JVM.

## Post-scaffold audit

**Tool**: skipped - no built-in audit tool for java
**Recommended external tool**: OWASP Dependency-Check or Snyk are common Java dependency-audit choices.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | verified |
| quality_override | false |
| path_taken | custom |
| self_check_answers | typed: true; from_official_starter: true; conventions: true; docs_current: true; can_judge_agent: true |
| team_size | solo |
| deployment_target | fly |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | false |
| has_payments | false |
| has_realtime | false |
| has_ai | false |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified.

Useful manual steps in the meantime:
- `git init` if you have not already, to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance. The full breakdown is in this log.
