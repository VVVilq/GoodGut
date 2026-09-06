# Basis-agnostic nutrition thresholds verification

## Automated checks

Run from `apps/mobile/`:

```powershell
npm.cmd test -- --runTestsByPath src/features/product-lookup/__tests__/personal-warning-integration-test.ts --runInBand
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --runInBand
```

Run the API regression gate from `services/api/`:

```powershell
.\mvnw.cmd test
```

The integration suite uses the shared solid and liquid fixtures, verifies strict equality and trigger boundaries, unknown and unavailable products, schema-v3 migration, and active-profile isolation during save errors.

Phase 3 automated evidence (2026-09-06): integration suite passed (10 tests), full mobile Jest passed (21 suites, 218 tests), lint and typecheck passed, and `services/api/.\mvnw.cmd test` passed (42 tests). The fixture server was started on port 8788, returned HTTP 200 found responses for `5449000000996` and `3017620422003`, returned the contract-v3 `not_found` response for `9999999999999`, and shut down cleanly with Ctrl+C.

## Fixture server

From the repository root, start the development-only server:

```powershell
node scripts/nutrition-warning-fixture-server.mjs
```

Point Expo at `http://<computer-LAN-address>:8787`. The server exposes documented `GET /products/<barcode>` routes for the solid Nutella fixture (`3017620422003`), liquid Coca-Cola fixture (`5449000000996`), and unavailable/partial scenarios. Unknown barcodes return the API contract-v3 `not_found` response. Stop with Ctrl+C and restore the normal API URL afterward.

## Android evidence

Configure one sugars threshold without choosing a basis. Scan both fixture barcodes and verify the same numeric rule evaluates, equality does not trigger, unavailable nutrition remains incomplete, and each result displays its actual `/100 g` or `/100 ml` basis. Confirm warning expansion, save/relaunch persistence, and no incomplete state caused by basis alone. Record device, barcode, and observed result here after the manual run.

Manual evidence (2026-09-06): Xiaomi 17T, Android 16. Live liquid barcode `5449000000996` reported Nutri-Score E, 42 kcal/100 ml, carbohydrates 10.6 g/100 ml, and sugars 10.6 g/100 ml; the configured sugars threshold triggered. The confirmed fixture acceptance covered liquid `5449000000996` and solid `3017620422003`, including basis display, warning expansion, persistence, equality behavior, unavailable nutrition, and no basis-only incomplete status.
