# Nutrition warning scan verification

Run mobile checks from `apps/mobile/`: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`. Run API regression from `services/api/`: `.\mvnw.cmd test`.

For Android edge cases, start `node scripts/nutrition-warning-fixture-server.mjs` from the repository root and set `EXPO_PUBLIC_API_BASE_URL` to `http://<computer-LAN-address>:8787`. Configure `Cukry` above `10 g / 100 ml`, scan `5449000000996`, and verify one highlighted nutrition value. Use a per-100-g rule on that barcode to verify expandable basis-mismatch details. Scan `6111242100992` with an ingredient rule to verify certain matches plus incomplete status. Save a changed threshold and confirm the existing result updates without rescanning. Restore the normal API URL, stop the fixture server, and record a live physical barcode result.

Automated results (2026-09-06):

- `npm.cmd test -- --runTestsByPath src/features/product-lookup/__tests__/personal-warning-integration-test.ts --runInBand`: passed (1 suite, 1 test).
- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: passed (20 suites, 206 tests).
- `.\mvnw.cmd test -q` from `services/api/`: passed (exit code 0).
- Fixture server startup logged on port 8787; `GET /products/5449000000996` returned the shared liquid found fixture; an unknown barcode returned the contract-v3 `not_found` response; Ctrl-C shut the server down cleanly.

Manual results: live scan recorded for Xiaomi 17T (Android 16), barcode `5449000000996`, through the running normal API. Observed Nutri-Score E; energy 42 kcal/100 ml; carbohydrates 10.6 g/100 ml; sugars 10.6 g/100 ml; fat 0, fiber 0, salt 0, protein 0. The configured sugars rule triggered. Fixture, disclosure/accessibility, persistence, and navigation checks remain pending.
