# GoodGut

GoodGut is a monorepo with:

- `apps/mobile` - Expo React Native mobile app.
- `services/api` - Spring Boot API service.
- `context` - product, stack, infrastructure, and planning docs.

## Run Locally

Start PostgreSQL, the API, and Expo with one command from the repository root:

```powershell
.\scripts\dev.ps1
```

The script starts PostgreSQL through Docker Compose, starts the API, waits for `/health`, and ensures
a small local ingredient catalogue is active. It then detects the computer's LAN address for a
physical Android device and starts Expo. Press `Ctrl+C` to stop Expo and the local API; PostgreSQL
remains available with its data in a Docker volume. The bundled catalogue is only a development
fixture; production catalogue imports remain an explicit operator action.

To intentionally keep a new local database without the development catalogue, run:

```powershell
.\scripts\dev.ps1 -SkipCatalogueSeed
```

Use the deployed Railway API instead:

```powershell
.\scripts\dev.ps1 -UseRailway
```

For an emulator or a manually selected address, override the mobile API URL:

```powershell
.\scripts\dev.ps1 -ApiBaseUrl http://10.0.2.2:8080
```

Manual commands remain available. Mobile:

```powershell
cd apps/mobile
npm.cmd start
```

API:

```powershell
cd services/api
.\mvnw.cmd spring-boot:run
```

## Verify

Mobile:

```powershell
cd apps/mobile
npm.cmd run lint
```

API:

```powershell
cd services/api
.\mvnw.cmd test
```

## Deploy

Railway should deploy the API from `services/api`, not from the repository root. Configure the Railway service root directory to `services/api` or set build/start commands that run Maven from that directory.
