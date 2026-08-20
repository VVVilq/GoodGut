# GoodGut API

Spring Boot API that owns the Open Food Facts integration and publishes the GoodGut product lookup
contract.

## Run locally

Configure a real application identity/contact for Open Food Facts, then start the service:

```powershell
$env:OPEN_FOOD_FACTS_USER_AGENT = "GoodGut/0.1 (contact@example.com)"
.\mvnw.cmd spring-boot:run
```

Optional environment variables are `OPEN_FOOD_FACTS_BASE_URL`,
`OPEN_FOOD_FACTS_CONNECT_TIMEOUT`, and `OPEN_FOOD_FACTS_READ_TIMEOUT`. Do not commit contact values
or credentials into `application.properties`.

Check the service and a representative product:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/products/5449000000996 | ConvertTo-Json -Depth 10
```

Run the offline suite with:

```powershell
.\mvnw.cmd test
```
