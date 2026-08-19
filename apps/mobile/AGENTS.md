# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Mobile Architecture

- Keep route files under `src/app/` focused on navigation and screen composition.
- Keep reusable visual elements under `src/components/`.
- Keep ingredient matching, threshold comparison, basis validation, missing-data handling, and trigger counting outside route components in framework-independent TypeScript modules.
- Do not add disease profiles, medical scores, or medical suitability judgments; `context/foundation/prd-v3.md` is authoritative for the personal-rules concept.

## Mobile Verification

- Run `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd test` from `apps/mobile/` before handing off mobile changes.
- Add focused automated tests for ingredient aliases, custom-name matching, strict above/below boundaries, equality, `100 g` versus `100 ml` mismatches, unavailable inputs, and trigger counts.
- Keep tests outside `src/app/`; Expo Router treats files in that directory as routes.
