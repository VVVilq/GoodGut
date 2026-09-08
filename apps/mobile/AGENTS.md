# Expo HAS CHANGED

Read the versioned Expo docs matching `expo` in `package.json` before writing any code: currently SDK 57 at https://docs.expo.dev/versions/v57.0.0/. Update this reference when upgrading Expo.

## Mobile Architecture

- Keep route files under `src/app/` focused on navigation and screen composition.
- Keep reusable visual elements under `src/components/`.
- Keep ingredient matching, threshold comparison, basis validation, missing-data handling, and trigger counting outside route components in framework-independent TypeScript modules.
- Do not add disease profiles, medical scores, or medical suitability judgments; `context/foundation/prd-v3.md` is authoritative for the personal-rules concept.

## Mobile Verification

- Run `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd test` from `apps/mobile/` before handing off mobile changes.
- Add focused automated tests for ingredient aliases, custom-name matching, strict above/below boundaries, equality, `100 g` versus `100 ml` mismatches, unavailable inputs, and trigger counts.
- Keep tests outside `src/app/`; Expo Router treats files in that directory as routes.
