# Repository Guidelines

This repository is a GoodGut monorepo with an Expo mobile client in `apps/mobile/` and a Spring Boot API service in `services/api/`. The API uses Java 21, Maven, Spring Web MVC, DevTools, and Spring Boot's MVC test starter as declared in `services/api/pom.xml`.

## Project Structure & Module Organization

- `services/api/src/main/java/com/example/goodgut_server/` contains API application code. Keep new Java packages under this root package; `services/api/HELP.md` notes that `com.example.goodgut-server` is invalid and was normalized to `com.example.goodgut_server`.
- `services/api/src/main/resources/` contains API runtime configuration, currently `application.properties`.
- `services/api/src/test/java/com/example/goodgut_server/` contains JUnit tests. Mirror production package paths when adding tests.
- `services/api/.mvn/`, `services/api/mvnw`, and `services/api/mvnw.cmd` are the Maven wrapper files; prefer them over a system Maven install.
- `apps/mobile/` contains the Expo React Native client. Run client commands from that directory.
- `context/` contains planning and foundation docs. Do not archive or rewrite foundation history unless a skill explicitly calls for it.

## Build, Test, and Development Commands

- `cd services/api && ./mvnw test` runs the API test suite on Unix-like shells.
- `cd services\api; .\mvnw.cmd test` runs the API test suite from PowerShell.
- `cd services/api && ./mvnw spring-boot:run` starts the API locally with Spring Boot DevTools available at runtime.
- `cd services/api && ./mvnw package` compiles, tests, and builds the API artifact.
- `cd apps/mobile && npm.cmd start` starts Expo for the mobile client.
- `cd apps/mobile && npm.cmd run lint` runs the mobile lint check.

## Coding Style & Naming Conventions

Use Java 21 and the Spring Boot conventions already present in `GoodgutServerApplication.java`. Use four-space indentation in Java files, constructor injection for Spring collaborators, and package names under `com.example.goodgut_server`. Name classes in `PascalCase`, methods and fields in `camelCase`, and tests with names that describe behavior rather than implementation.

## Testing Guidelines

API tests use JUnit 5 with Spring Boot test support. Keep test classes in `services/api/src/test/java` with the same package as the code under test, and use `*Tests` for Spring context or integration-style tests, matching `GoodgutServerApplicationTests`. Add focused unit tests for new API logic and run `cd services/api && ./mvnw test` or `cd services\api; .\mvnw.cmd test` before handing off API changes.

## Commit & Pull Request Guidelines

This checkout is not inside a Git repository, so no local commit convention could be inferred. Until one is documented, use short imperative commit subjects, for example `Add health endpoint`, and include a PR summary, test results, and any configuration changes.

## Security & Configuration Tips

Do not commit secrets into `application.properties`, mobile `.env` files, or app config. Put environment-specific values behind Spring properties, Expo environment variables, or profiles, and document required local values in project docs instead of hard-coding credentials.

## Deployment Notes

- Railway deploys the API service from `services/api/`, not from the repository root. Configure the Railway service root directory to `services/api` or set equivalent build/start commands that run Maven from that directory.
- Keep Git at the repository root so vertical slices can include mobile, API, and docs changes in one commit.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 2

Turn one roadmap item into the first implementation cycle with the **change planning chain**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review`, and `/10x-implement` are the lesson focus. `/10x-frame` and `/10x-research` are not required rituals here; they are escalation paths introduced in the next lesson.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Change setup (lesson focus)** | |
| `/10x-new <change-id>` | You selected a roadmap item and need a stable change folder. Creates `context/changes/<change-id>/change.md` so planning, implementation, progress, commits, and later review all share one identity. Use AFTER roadmap selection, BEFORE `/10x-plan`. |
| **Planning (lesson focus)** | |
| `/10x-plan <change-id>` | You have a change folder and need a reviewable implementation plan. Reads roadmap context, foundation docs, codebase evidence, and any existing change notes; writes `plan.md` and `plan-brief.md` with phases, file contracts, success criteria, and `## Progress`. |
| **Plan readiness (lesson focus)** | |
| `/10x-plan-review <change-id>` | You have `plan.md` and need a light pre-code readiness check. Use it to catch missing end state, weak contracts, malformed progress, scope drift, or blind spots before code changes begin. |
| **Implementation (lesson focus)** | |
| `/10x-implement <change-id> phase <n>` | You have an approved plan and want to execute one phase with verification, manual gate, commit ritual, and SHA write-back to `## Progress`. |
| **Lifecycle closure** | |
| `/10x-archive <change-id>` | A change is merged or intentionally closed. Move it out of active `context/changes/` into archive state. |

### How the chain hands off

- `/10x-new` creates the durable change identity.
- `/10x-plan` turns that identity into an implementation contract.
- `/10x-plan-review` checks the plan before the agent mutates code.
- `/10x-implement` executes one planned phase, verifies, asks for manual confirmation when needed, commits, and records progress.

### Lesson boundaries

- Plan is the default router after roadmap selection. Start with `/10x-plan` unless the problem is unclear or external evidence is blocking.
- Do not run `/10x-frame + /10x-research` as ceremony for every change.
- Do not turn this lesson into a full end-to-end product build. A checkpoint with a planned and partially or fully implemented stream is valid.
- Code review of the implemented diff belongs to Lesson 3 via `/10x-impl-review`.
- Lifecycle closure via `/10x-archive` after a change is merged or intentionally closed.

### Paths used by this lesson

- `context/foundation/roadmap.md` - upstream roadmap
- `context/changes/<change-id>/change.md` - change identity
- `context/changes/<change-id>/plan.md` - implementation contract
- `context/changes/<change-id>/plan-brief.md` - compressed handoff
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
