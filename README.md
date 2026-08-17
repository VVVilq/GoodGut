# GoodGut

GoodGut is a monorepo with:

- `apps/mobile` - Expo React Native mobile app.
- `services/api` - Spring Boot API service.
- `context` - product, stack, infrastructure, and planning docs.

## Run Locally

Mobile:

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
