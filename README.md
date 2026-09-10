# GoodGut

GoodGut is an Android app that scans packaged-food barcodes, displays product facts, and highlights
ingredients and nutrition values matching the shopper's personal rules. A single profile stays on
the device; the app does not provide medical suitability judgments.

This monorepo contains:

- `apps/mobile` - Expo React Native mobile app.
- `services/api` - Spring Boot API service.
- `context` - product, stack, infrastructure, and planning docs.

See the [mobile guide](apps/mobile/README.md), [API guide](services/api/README.md),
and [current product contract](context/foundation/prd-v3.md).

## Prerequisites and Installation

The commands below use Windows PowerShell. The root launcher is Windows-specific.

- Node.js 22.13 or newer with npm (CI uses Node 22).
- Java JDK 21, with `JAVA_HOME` configured; use the included Maven Wrapper.
- Docker Desktop with Docker Compose for the local PostgreSQL database.
- An Android device with an Expo SDK 57-compatible Expo Go app or development build;
  see the [mobile guide](apps/mobile/README.md).

After cloning, run from the repository root:

```powershell
Push-Location apps/mobile
npm.cmd ci
Pop-Location
```

Install development dependencies and allow lifecycle scripts: `postinstall` applies the required
[dependency compatibility patch](apps/mobile/patches/README.md). Initial npm/Maven dependency
downloads require internet access. The launcher does not install mobile dependencies.

## Run Locally

Start PostgreSQL, the API, and Expo with one command from the repository root:

```powershell
$env:OPEN_FOOD_FACTS_USER_AGENT = "GoodGut/0.1 (your-real-contact)"
.\scripts\dev.ps1
```

Replace `your-real-contact` with your application contact identity. The launcher configures the
local database connection and mobile API URL for this session. Keep the phone and computer on a
network that allows them to communicate, and allow the API and Expo through the local firewall.
Use a trusted private network: the local API uses unencrypted HTTP and is reachable on the LAN.
PostgreSQL is bound to `127.0.0.1` only; its fixed development credentials are for disposable local
data, never production or sensitive data. Do not forward these development ports from your router.

The launcher pins the local database connection and port, rejects other inherited `SPRING_*` overrides,
and removes its database variables before starting Expo. It restores the caller's environment on
exit. API URLs must not contain credentials, query parameters, or fragments; public Expo variables
are visible to app users. API logs stay in the Git-ignored `.local-tools/dev-logs/` directory;
review them before sharing because dependency errors can contain configuration details.

The script starts PostgreSQL through Docker Compose, starts the API, waits for `/health`, and ensures
a small local ingredient catalogue is active. It then detects the computer's LAN address for a
physical Android device and starts Expo. Press `Ctrl+C` to stop Expo and the local API; PostgreSQL
remains available with its data in a Docker volume. The bundled catalogue is only a development
fixture; production catalogue imports remain an explicit operator action.

Verify API startup and catalogue availability without starting Expo or waiting for keyboard input:

```powershell
.\scripts\dev.ps1 -Check
```

This binds the API to localhost, stops it after verification, and retains PostgreSQL and its existing
volume. `-NoExpo` also binds the API to localhost. An existing
listener on port 8080 causes startup to fail instead of accidentally checking or seeding that service.

To intentionally keep a new local database without the development catalogue, run:

```powershell
.\scripts\dev.ps1 -SkipCatalogueSeed
```

Use a deployed API instead (replace the example address with your Railway service URL):

```powershell
.\scripts\dev.ps1 -UseRailway -ApiBaseUrl https://YOUR-SERVICE.up.railway.app
```

`-UseRailway` skips local PostgreSQL and API startup and requires an HTTPS URL from `-ApiBaseUrl`
or the shell's `EXPO_PUBLIC_API_BASE_URL`. It does not fall back to a mobile `.env` file.
Java and Docker are not needed when using only a deployed API. Add `-Check` to check its health
without starting Expo.

For an emulator or a manually selected address, override the mobile API URL:

```powershell
.\scripts\dev.ps1 -ApiBaseUrl http://10.0.2.2:8080
```

For separate processes or manual environment configuration, follow the
[mobile setup](apps/mobile/README.md#local-setup) and [API setup](services/api/README.md#run-locally).
To stop the retained local database, run `docker compose stop postgres` from the repository root.

## Verify

Run from the repository root:

```powershell
Push-Location apps/mobile
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd audit
Pop-Location
```

API:

```powershell
Push-Location services/api
.\mvnw.cmd test
Pop-Location
```

`npm test` runs dependency compatibility checks before Jest. API tests use an in-memory database
and fixtures; they do not require a running PostgreSQL service or live Open Food Facts responses.
Maven may still need to download dependencies. The [CI workflow](.github/workflows/quality.yml)
runs lint, typecheck, tests, and an npm audit gate at high severity. Device acceptance is separate;
see the [test plan](context/foundation/test-plan.md).

## Deploy

Railway should deploy the API from `services/api`, not from the repository root. Configure the Railway service root directory to `services/api` or set build/start commands that run Maven from that directory.

Database variables, catalogue import, activation, and redeploy checks are described in the
[API guide](services/api/README.md). The quality workflow does not deploy the application.
