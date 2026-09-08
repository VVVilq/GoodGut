# Dependency security compatibility

The overrides in `package.json` remediate the npm audit findings verified on 2026-09-08:

- Metro, metro-config and metro-transform-worker 0.84.5 replace the pinned 0.84.4 copies and remove the vulnerable image-size dependency. Keep these three packages aligned.
- xcode uses UUID 11.1.1 instead of vulnerable UUID 7. Its `uuid.v4()` call remains compatible with the CommonJS exports in version 11.
- decode-uri-component 0.5.0 fixes malformed-input denial of service. It exposes an ESM default export, while Expo Router's query-string 7.1.3 expects a CommonJS function. `query-string+7.1.3.patch` adapts that single import; `postinstall` applies it after `npm ci`.

`npm test` runs the Node compatibility checks before Jest. They exercise URL parsing, malformed input and xcode project IDs. Also run `npx expo install --check` and an Android export when updating these overrides. Remove each override or patch when the upstream dependency supports the fixed version, then repeat those checks and `npm audit`.

References: [URL decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [image-size advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr).
