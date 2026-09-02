# GoodGut API

Spring Boot API that owns the Open Food Facts integration and publishes the GoodGut product lookup
contract.

## Run locally

Start PostgreSQL, create a `goodgut` database, configure a real application identity/contact for
Open Food Facts, then start the service:

```powershell
$env:OPEN_FOOD_FACTS_USER_AGENT = "GoodGut/0.1 (contact@example.com)"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "goodgut"
$env:PGUSER = "goodgut"
$env:PGPASSWORD = "local-password"
.\mvnw.cmd spring-boot:run
```

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

Run the offline suite with:

```powershell
.\mvnw.cmd test
```

## Import the Open Food Facts ingredient catalogue

Catalogue import is an explicit operator action. It never downloads data or runs automatically when
the API starts.

1. Download a pinned `ingredients.full.json` snapshot from Open Food Facts.
2. Record the upstream revision and calculate its SHA-256 checksum.
3. Import it as a staged immutable release:

```powershell
$file = "C:\path\to\ingredients.full.json"
$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
.\mvnw.cmd `
  "-Dexec.mainClass=com.example.goodgut_server.catalogue.importer.TaxonomyImportCommand" `
  "-Dexec.args=import $file off-2026-08-31 UPSTREAM_REVISION $checksum" `
  compile exec:java
```

Review the reported node, label, and edge counts before activation. Activate a staged release in a
separate operation:

```powershell
.\mvnw.cmd `
  "-Dexec.mainClass=com.example.goodgut_server.catalogue.importer.TaxonomyImportCommand" `
  "-Dexec.args=activate RELEASE_ID" `
  compile exec:java
```

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
