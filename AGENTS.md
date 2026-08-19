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

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
