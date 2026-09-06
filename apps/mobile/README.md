# GoodGut mobile

Expo SDK 57 Android client for scanning a packaged-food barcode and displaying facts returned by
the GoodGut API. The client never calls Open Food Facts directly.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to a GoodGut API URL reachable from the Android device:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8080
   ```

   A physical phone cannot use the development computer's `localhost`; use its LAN address.
3. Start the API first, then run:

   ```powershell
   npm.cmd start -- --lan
   ```

This project targets Expo SDK 57. Install the matching Android Expo Go build from
<https://expo.dev/go?device=true&platform=android&sdkVersion=57> or use a development build.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd expo config --type public
```

On Android, verify camera allow/deny recovery, a complete and incomplete product, not-found,
source/client errors, retry, scan-another, duplicate suppression, and camera release on exit.

The personal profile is stored locally as schema v4 in AsyncStorage under two rotating slots. It
contains avoided ingredients and nutrition thresholds, is not sent to the API, Open Food Facts,
URLs, or logs, and is lost if app data is cleared or the app is uninstalled. Existing schema-v2
ingredient profiles migrate in memory without deleting their legacy slots; the first explicit Save
writes a verified schema-v4 slot.

Use the ingredient editor from Home to select a taxonomy node or its OFF descendant branch, or add
an exact-name custom entry. The nutrition editor supports one above-or-below threshold for each of
the eight normalized nutrients. Each threshold applies to the product's reported `per 100 g` or `per 100 ml` value;
energy uses a 0–1000 kcal slider with step 1, other nutrients use a 0–100 g slider with step 0.1,
zero is valid, and equality does not trigger a
rule. Save is explicit. Failed saves keep the previous active profile and the submitted draft
available for retry. Corrupt storage is reported or recovered from the other valid slot and is never
silently overwritten.

Profile evidence: `src/data/__tests__/personal-profile-repository-test.ts`,
`src/data/__tests__/personal-profile-integration-test.ts`, and
`src/features/personal-profile/__tests__/profile-store-test.ts`. Run `npm.cmd run lint`,
`npm.cmd run typecheck`, and `npm.cmd test` after profile changes.

The API contract is version 3.0. Structured ingredient leaves remain visible in source order,
including duplicates. Recognized leaves carry taxonomy evidence; unresolved leaves are shown in
yellow with an accessible status and may trigger only an exact custom rule. Taxonomy rules never
use unresolved leaves as evidence.

Product facts are sourced from Open Food Facts contributors. Database content is available under
ODbL and product images may be licensed under CC BY-SA; the result screen preserves attribution and
links to the provider record when available.

The API classifies product ingredients; the phone intersects that evidence with the saved profile.
An exact-node selection matches only the returned node ID, while a branch selection also matches an
ingredient whose returned ancestors contain that ID. Each saved selection contributes at most one
warning. Custom entries use NFKC, trimmed, case-insensitive exact matching. Partial ingredient data
may show certain warnings, but it never produces a reassuring zero-result message.

Nutrition warning fixture verification is documented in `context/changes/basis-agnostic-nutrition-thresholds/verification.md`; start the development server with `node scripts/nutrition-warning-fixture-server.mjs`.
