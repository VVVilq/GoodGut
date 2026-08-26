# GoodGut mobile

Expo SDK 56 Android client for scanning a packaged-food barcode and displaying facts returned by
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

This project targets Expo SDK 56. Install the matching Android Expo Go build from
<https://expo.dev/go?device=true&platform=android&sdkVersion=56> or use a development build.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd expo config --type public
```

On Android, verify camera allow/deny recovery, a complete and incomplete product, not-found,
source/client errors, retry, scan-another, duplicate suppression, and camera release on exit.

The avoided-ingredient profile is stored locally in AsyncStorage under two rotating slots; it is
not sent to the API and is lost if app data is cleared or the app is uninstalled. Use the profile
editor from Home to select reviewed ingredients or add exact-name custom entries. Save is explicit;
failed saves keep the previous active profile and the draft available for retry. Corrupt storage is
reported or recovered from the other valid slot and is never silently overwritten.

Profile evidence: `src/data/__tests__/personal-profile-repository-test.ts`,
`src/data/__tests__/personal-profile-integration-test.ts`, and
`src/features/personal-profile/__tests__/profile-store-test.ts`.

Product facts are sourced from Open Food Facts contributors. Database content is available under
ODbL and product images may be licensed under CC BY-SA; the result screen preserves attribution and
links to the provider record when available.
