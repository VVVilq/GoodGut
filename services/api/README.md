# GoodGut API

Spring Boot API that owns the Open Food Facts integration and publishes the GoodGut product lookup
contract.

## Run locally

Use Java JDK 21 with `JAVA_HOME` configured and the included Maven Wrapper. Commands below run from
`services/api/` unless stated otherwise. Initial Maven dependency downloads require internet access.
For combined API/mobile startup and a development catalogue, use the [root launcher](../../README.md).

For manual startup, run this from the repository root with Docker available:

```powershell
docker compose up -d --wait postgres
```

This creates the local `goodgut` database with the development credentials in `compose.yaml`.
Then, from `services/api/`, configure the connection and an application identity/contact for
Open Food Facts (replace the contact placeholder):

```powershell
$env:OPEN_FOOD_FACTS_USER_AGENT = "GoodGut/0.1 (your-real-contact)"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "goodgut"
$env:PGUSER = "goodgut"
$env:PGPASSWORD = "goodgut-local"
.\mvnw.cmd spring-boot:run
```

For your own PostgreSQL instance, create the database/user and substitute its connection values.
`.env.example` lists supported configuration; Spring Boot does not load that file or a copied
`.env` automatically. Export variables in the shell that starts Maven. On Unix-like shells use
`export` for variables and `bash ./mvnw spring-boot:run` for startup.

Optional environment variables are `OPEN_FOOD_FACTS_BASE_URL`,
`OPEN_FOOD_FACTS_CONNECT_TIMEOUT`, and `OPEN_FOOD_FACTS_READ_TIMEOUT`. Do not commit contact values
or credentials into `application.properties`.

Flyway applies database migrations during API startup. Railway may provide `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER`, and `PGPASSWORD` from a linked PostgreSQL service. Alternatively set a full
JDBC URL in `SPRING_DATASOURCE_URL`. Keep all database credentials in local environment variables or
Railway variables.

For Railway, attach a PostgreSQL service and keep its volume/database when redeploying the API.
Set the service root directory to `services/api`; an API redeploy must not recreate the database.
After deployment, verify both `/ingredient-catalogue/promoted?locale=pl` and a product lookup return
the same active `catalogueVersion` as before the redeploy.

Check the service and a representative product:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/products/5449000000996 | ConvertTo-Json -Depth 10
```

Run the suite without a running PostgreSQL service or live Open Food Facts access:

```powershell
.\mvnw.cmd test
```

Tests use H2 and recorded fixtures. Maven can still require network access to download dependencies.

## Import the Open Food Facts ingredient catalogue

Catalogue import is an explicit operator action. It never downloads data or runs automatically when
the API starts.

The root development launcher separately imports a small bundled fixture if needed, unless
`-SkipCatalogueSeed` is set. Manual API startup leaves a new database without an active catalogue;
catalogue discovery remains unavailable until a release is activated.

1. Download a pinned `ingredients.full.json` snapshot from Open Food Facts.
2. Record the upstream revision and calculate its SHA-256 checksum.
3. Import it as a staged immutable release:

```powershell
$file = "C:\path\to\ingredients.full.json"
$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
.\mvnw.cmd `
  "-Dexec.mainClass=com.example.goodgut_server.catalogue.importer.TaxonomyImportCommand" `
  "-Dexec.args=import '$file' off-2026-08-31 UPSTREAM_REVISION $checksum" `
  compile exec:java
```

Replace the example version and `UPSTREAM_REVISION` with identifiers for your snapshot. The inner
quotes keep paths containing spaces together. Keep the same database environment for import and API.

Review the reported node, label, and edge counts before activation. Activate a staged release in a
separate operation:

```powershell
.\mvnw.cmd `
  "-Dexec.mainClass=com.example.goodgut_server.catalogue.importer.TaxonomyImportCommand" `
  "-Dexec.args=activate RELEASE_ID" `
  compile exec:java
```

Replace `RELEASE_ID` with the numeric release ID printed by the import command.

Activating an older retained release performs catalogue rollback without deleting either release.
A failed import is marked `failed` and cannot replace the active release. The importer reads the
large JSON stream three times (nodes, labels, then edges) so it does not hold the complete catalogue
in JVM memory. Only Polish and English discovery terms are stored; all nodes and OFF parent edges are
retained so ancestry remains complete.

Open Food Facts is the catalogue source. Preserve its ODbL attribution and record the source revision,
source URL, and checksum for every imported release.

Catalogue discovery is available through bounded, server-side endpoints:

```text
GET /ingredient-catalogue/promoted?locale=pl
GET /ingredient-catalogue/search?q=goat%20milk&locale=pl&page=0&size=20
GET /ingredient-catalogue/children?nodeId=en%3Amilk&locale=pl&page=0&size=20
```

The import command is the only catalogue write path. Never run it during startup or request
handling. Activation switches between immutable releases, so rollback is performed by explicitly
activating the retained previous release.
