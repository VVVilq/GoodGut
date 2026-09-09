# Catalogue import verification — 2026-09-09

Imported and activated the Open Food Facts ingredient catalogue in Railway project `goodgut-server`, environment `production`, database service `Postgres`.

- Source: https://static.openfoodfacts.org/data/taxonomies/ingredients.full.json (Open Food Facts, ODbL).
- Downloaded snapshot: 6,571,364 bytes.
- SHA-256: `b635e3a211eb2f07de2e113f7487a882cd1777efe86deea5a9197aa9a61a45df`.
- Version: `off-20260909-b635e3a2`; release ID: `1`; final status: `active`.
- Source revision field: `snapshot-sha256-` followed by the above checksum. This identifies the downloaded artifact, not an upstream Git commit.
- Counts: 6,455 nodes; 22,809 Polish/English labels and synonyms; 6,306 parent edges.

## Verification

Used the existing `TaxonomyImportCommand`, first importing into a separate local PostgreSQL 16.15 container. Local import and validation succeeded. Production PostgreSQL 18.6 initially had no catalogue releases. Production import succeeded with identical counts, followed by explicit activation using the existing command. Flyway validated both existing migrations; no application code or schema changes were needed.

After activation, the deployed API at `https://goodgut-server-production.up.railway.app` passed these checks:

- `/health`: successful HTTP response.
- `/ingredient-catalogue/promoted?locale=pl`: 10 items and the expected catalogue version.
- `/ingredient-catalogue/search?q=milk&locale=pl`: 20 items and the expected catalogue version.
- `/products/5449000000996`: `found`, with the expected ingredient catalogue version.

## Storage

- Production database size from `pg_database_size`: 21,141,183 bytes (~21.1 MB).
- Sum of regular file sizes under PostgreSQL's data directory, including WAL: 95,623,265 bytes (~95.6 MB).
- Railway volume limit: 500 MB. The measured PostgreSQL files use roughly 19% of that limit.
- Railway's volume API still reported its earlier 41.689088 MB reading at verification time; it was not used as the post-import measurement.
- File-size totals are not an exact filesystem allocation measurement. WAL and future retained releases can increase usage; this is a point-in-time reading, not a permanent bound.

## Cleanup and limits

Removed the temporary Railway TCP proxy created for the import. API/database private connectivity remains in use. Stopped the separate local container `goodgut-import-check-20260909`; its test data and the downloaded temporary snapshot remain locally for reproducibility. No credentials were written to this report or repository. No external skills were installed.

No application code was changed and no regression suite was run. Validation consisted of real local/production imports, database count/size checks, and deployed API smoke checks. Physical Android acceptance remains untested.
