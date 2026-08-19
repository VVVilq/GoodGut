---
project: "GoodGut"
assessed_at: 2026-08-18T19:19:17+02:00
agent_readiness: ready-with-compensation
context_type: brownfield
prd_context: context/foundation/prd-v3.md
stack_components:
  language: "TypeScript 6 strict; Java 21"
  framework: "Expo 56 with React Native 0.85 and Expo Router; Spring Boot 4.0.6 with Spring Web MVC"
  build_tool: "Expo CLI; Maven Wrapper 3.3.4 with Maven 3.9.16"
  test_runner: "Mobile: not detected; API: JUnit 5 through Spring Boot MVC test starter"
  package_manager: "npm; Maven Wrapper"
  ci_provider: null
  deployment_target: "API: Railway documented but not configured; mobile distribution not detected"
gates_passed: 16
gates_failed: 2
---

## Stack Components

The mobile application uses TypeScript `~6.0.3` with strict checking enabled, Expo `~56.0.12`, Expo Router `~56.2.11`, React Native `0.85.3`, npm, and ESLint 9 with Expo's flat configuration (`apps/mobile/package.json:3-42`, `apps/mobile/tsconfig.json:2-4`, `apps/mobile/eslint.config.js:1-9`). Its scope under PRD v3 includes the one-device profile, barcode scan flow, product facts, warning highlights, and triggered-rule count.

The API uses Java 21, Spring Boot 4.0.6, Spring Web MVC, the Spring Boot MVC test starter, and the Spring Boot Maven plugin (`services/api/pom.xml:7-8`, `services/api/pom.xml:30`, `services/api/pom.xml:33-48`, `services/api/pom.xml:52-58`). The checked-in wrapper pins Maven 3.9.16 (`services/api/.mvn/wrapper/maven-wrapper.properties:1-3`). Its PRD v3 scope includes product lookup, expanded normalization, exact nutrition basis, missing-data behavior, and deterministic rule inputs.

The repository has scoped instruction files at the root, mobile application, and API service. The API instructions specify structure, commands, conventions, tests, and deployment boundaries (`AGENTS.md:1-43`, `services/api/AGENTS.md:1-43`). The mobile instructions correctly pin agents to Expo SDK 56 documentation but do not yet define mobile test expectations or project-specific placement for profile and rule logic (`apps/mobile/AGENTS.md:1-3`).

No CI workflow, API deployment descriptor, mobile distribution configuration, or mobile test runner was detected. Railway is documented as the intended API target, but this is documentation rather than deployable configuration (`AGENTS.md:39-43`, `services/api/AGENTS.md:38-43`).

## Quality Gate Assessment

| Component | Typed | Convention | Training Data | Documented | Verdict |
|---|---:|---:|---:|---:|---|
| TypeScript 6 | ✓ | — | — | — | Pass |
| Java 21 | ✓ | — | — | — | Pass |
| Expo + Expo Router | — | ✓ | ✓ | ✓ | Pass |
| Spring Boot + Web MVC | — | ✓ | ✓ | ✓ | Pass |
| Expo CLI + npm | — | ~ | ✓ | ✓ | Pass with note |
| Maven Wrapper | — | ✓ | ✓ | ✓ | Pass |
| JUnit 5 / Spring MVC tests | — | — | ✓ | ✓ | Pass |
| Mobile test runner | — | — | ✗ | ✗ | Missing component |

Legend: ✓ = pass, ✗ = fail, ~ = partial, — = not applicable.

### Gate Details

**Type safety.** Both application languages pass. Mobile has TypeScript installed and `strict: true` (`apps/mobile/package.json:34`, `apps/mobile/tsconfig.json:4`). Java 21 is explicitly pinned for the API (`services/api/pom.xml:29-31`). These contracts give agents compile-time feedback at both sides of the product boundary.

**Conventions.** Expo Router supplies file-based routing and the repository already places routes under `apps/mobile/src/app/`; its official SDK 56 documentation describes that routing model. Spring Boot supplies strong configuration, dependency, and application-layout conventions, reinforced by the API's scoped `AGENTS.md`. Expo CLI and npm scripts are predictable, but placement of non-route mobile domain logic is only partially documented.

**Ecosystem familiarity.** React Native, Expo, Spring Boot, Maven, and JUnit are mainstream within their respective JavaScript/TypeScript and Java ecosystems. Their idioms are well represented in common training material. There is no mobile test runner to assess, so agents have no established project command or local test pattern for mobile business rules.

**Documentation.** Mobile instructions point to the exact Expo SDK 56 documentation (`apps/mobile/AGENTS.md:1-3`), including the versioned Expo Router reference at `https://docs.expo.dev/versions/v56.0.0/sdk/router/`. Spring publishes a versioned Spring Boot 4.0 reference at `https://docs.spring.io/spring-boot/4.0/reference/index.html`. Maven documents wrapper behavior at `https://maven.apache.org/tools/mavenwrapper.html`, and JUnit maintains its user guide at `https://docs.junit.org/current/user-guide/`.

## Gaps & Compensation

### Mobile automated testing is absent

`apps/mobile/package.json` defines start, platform, reset, and lint scripts but no test script or test dependency (`apps/mobile/package.json:30-43`). This matters because PRD v3 introduces deterministic alias matching, exact threshold boundaries, basis mismatches, missing-data states, and trigger counting. Without automated tests, an agent can produce plausible UI code while silently breaking those rules.

Compensation: make mobile verification expectations explicit immediately, then select and configure a compatible test runner in the first implementation plan that adds mobile domain behavior. Keep rule evaluation outside route components so it can be tested without rendering screens.

### Mobile project conventions are thin

Expo Router defines route placement, but `apps/mobile/AGENTS.md` currently contains only a versioned-doc warning. Until implementation establishes concrete modules, agents need a small boundary rule to prevent profile persistence, matching logic, and presentation from accumulating inside route files.

Compensation: document that route files compose screens, reusable UI stays in components, and deterministic personal-rule evaluation lives in a framework-independent module with focused tests. Update exact paths after the first vertical slice establishes them.

### Delivery automation is not detected

No CI workflow or deployable configuration was found. This does not reduce the framework scores, but it weakens feedback and release confidence. The next health check should verify build reproducibility, dependency health, mobile distribution requirements, API deployment readiness, and the absence of committed secrets.

### Recommended Instruction File Additions

Add the following to `apps/mobile/AGENTS.md`:

```markdown
## Mobile Architecture

- Keep route files under `src/app/` focused on navigation and screen composition.
- Keep reusable visual elements under `src/components/`.
- Keep ingredient matching, threshold comparison, basis validation, missing-data handling, and trigger counting outside route components in framework-independent TypeScript modules.
- Do not add disease profiles, medical scores, or medical suitability judgments; `context/foundation/prd-v3.md` is authoritative for the personal-rules concept.

## Mobile Verification

- Run `npm.cmd run lint` and `npx.cmd tsc --noEmit` from `apps/mobile/` before handing off mobile changes.
- Add focused automated tests for ingredient aliases, custom-name matching, strict above/below boundaries, equality, `100 g` versus `100 ml` mismatches, unavailable inputs, and trigger counts when the mobile rule module is introduced.
- Do not report mobile rule behavior as verified until a test runner and repeatable test command are configured in `package.json`.
```

## Summary

GoodGut is ready for agent-assisted development with limited compensation. Its core languages are typed, both frameworks are mainstream and convention-oriented, build tooling is reproducible, official documentation is versioned, and repository/API instructions already provide useful boundaries.

The immediate weakness is the mobile feedback loop: deterministic product-rule behavior has no automated test runner or command. Mobile-specific module boundaries are also under-documented. CI and deployment remain operational gaps for the next health check. No stack replacement is indicated; add the instruction rules above, establish mobile tests with the first vertical slice, and proceed to `/10x-health-check`.
