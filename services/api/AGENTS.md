# API Service Guidelines

This directory contains the GoodGut Spring Boot API service. Use this file for backend-specific rules; the repository root `AGENTS.md` still governs monorepo-wide behavior.

## Structure

- `src/main/java/com/example/goodgut_server/` contains API code. Keep new packages under `com.example.goodgut_server`.
- `src/main/resources/application.properties` contains Spring runtime configuration.
- `src/test/java/com/example/goodgut_server/` contains JUnit tests mirroring production package paths.
- `.mvn/`, `mvnw`, and `mvnw.cmd` are the service-local Maven wrapper files.

## Commands

Run commands from `services/api`.

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
.\mvnw.cmd package
```

On Unix-like shells:

```bash
./mvnw test
./mvnw spring-boot:run
./mvnw package
```

## Conventions

- Use Java 21 and Spring Boot conventions.
- Prefer constructor injection for Spring collaborators.
- Keep controllers, services, and domain logic in separate top-level classes; avoid hiding request handlers as nested classes.
- Name classes in `PascalCase`, methods and fields in `camelCase`.
- Add focused tests for new behavior and run the service test suite before handoff.

## Deployment

Railway should deploy this service with root directory set to `services/api`, or with equivalent build/start commands that run Maven from this directory.

Do not commit secrets into `application.properties`; use environment variables or Spring profiles for deploy-specific values.
