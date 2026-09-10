[CmdletBinding()]
param(
    [switch]$UseRailway,
    [switch]$NoExpo,
    [switch]$SkipCatalogueSeed,
    [switch]$Check,
    [string]$ApiBaseUrl
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiDirectory = Join-Path $projectRoot 'services\api'
$mobileDirectory = Join-Path $projectRoot 'apps\mobile'
$composeFile = Join-Path $projectRoot 'compose.yaml'
$logDirectory = Join-Path $projectRoot '.local-tools\dev-logs'
$apiStandardLog = Join-Path $logDirectory 'api.log'
$apiErrorLog = Join-Path $logDirectory 'api-error.log'
$apiProcess = $null
$postgresStarted = $false
$managedVariables = @(
    'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
    'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD',
    'SERVER_ADDRESS', 'SERVER_PORT', 'PORT', 'EXPO_PUBLIC_API_BASE_URL'
)
$originalEnvironment = @{}
foreach ($name in $managedVariables) {
    $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

function Assert-ApiUrl {
    param([string]$Value, [switch]$RequireHttps)

    $parsed = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$parsed) -or
        $parsed.Scheme -notin @('http', 'https') -or
        $parsed.UserInfo -or $parsed.Query -or $parsed.Fragment -or
        ($RequireHttps -and $parsed.Scheme -ne 'https')) {
        throw 'API URL must be HTTP(S), without credentials, query parameters, or fragments. Railway requires HTTPS.'
    }
}

function Test-DockerReady {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'SilentlyContinue'
        & docker info *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Wait-ForDocker {
    if (Test-DockerReady) { return }

    $dockerDesktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path -LiteralPath $dockerDesktop)) {
        throw 'Docker engine is not running and Docker Desktop was not found. Start Docker manually and run this script again.'
    }

    Write-Host 'Docker engine is not running. Starting Docker Desktop...'
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden | Out-Null
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        Start-Sleep -Seconds 2
        if (Test-DockerReady) {
            Write-Host 'Docker is ready.' -ForegroundColor Green
            return
        }
    }

    throw 'Docker Desktop did not become ready within 120 seconds. Open Docker Desktop, resolve any startup message, and run this script again.'
}

function Wait-ForApi {
    param([string]$HealthUrl)

    Write-Host "Waiting for API at $HealthUrl ..."
    for ($attempt = 1; $attempt -le 45; $attempt++) {
        if ($apiProcess -and $apiProcess.HasExited) {
            throw "API process exited. Check $apiStandardLog and $apiErrorLog."
        }
        try {
            Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2 | Out-Null
            Write-Host 'API is ready.' -ForegroundColor Green
            return
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "API did not become healthy within 90 seconds. Check $apiStandardLog and $apiErrorLog."
}

function Ensure-LocalCatalogue {
    $catalogueUrl = 'http://127.0.0.1:8080/ingredient-catalogue/promoted?locale=pl'
    $developmentVersion = 'local-development-v3'
    try {
        $catalogue = Invoke-RestMethod -Uri $catalogueUrl -TimeoutSec 5
        if ($catalogue.catalogueVersion -eq $developmentVersion -or
            $catalogue.catalogueVersion -notlike 'local-development-*') {
            Write-Host "Ingredient catalogue $($catalogue.catalogueVersion) is ready." -ForegroundColor Green
            return
        }
        Write-Host "Updating local ingredient catalogue from $($catalogue.catalogueVersion) to $developmentVersion..."
    }
    catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 503) {
            throw 'Could not check the local ingredient catalogue. Import was not attempted.'
        }
    }

    $fixture = Join-Path $projectRoot 'scripts\fixtures\ingredients-local-development.json'
    if (-not (Test-Path -LiteralPath $fixture)) {
        throw "Local catalogue fixture was not found at $fixture."
    }

    $checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $fixture).Hash.ToLowerInvariant()
    Write-Host 'No active ingredient catalogue found. Importing the local development fixture...'
    Push-Location $apiDirectory
    try {
        & .\mvnw.cmd `
            '-Dexec.mainClass=com.example.goodgut_server.catalogue.importer.TaxonomyImportCommand' `
            "-Dexec.args=import '$fixture' $developmentVersion bundled-fixture $checksum --activate" `
            compile exec:java
        if ($LASTEXITCODE -ne 0) { throw 'Could not import the local ingredient catalogue fixture.' }
    }
    finally {
        Pop-Location
    }

    Invoke-RestMethod -Uri $catalogueUrl -TimeoutSec 10 | Out-Null
    Write-Host 'Local ingredient catalogue imported and activated.' -ForegroundColor Green
}

function Get-LanAddress {
    $configuration = Get-NetIPConfiguration |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        Select-Object -First 1
    return $configuration.IPv4Address.IPAddress
}

try {
    if ($UseRailway -and -not $ApiBaseUrl) {
        $ApiBaseUrl = $env:EXPO_PUBLIC_API_BASE_URL
        if (-not $ApiBaseUrl) {
            throw 'Pass -ApiBaseUrl with the deployed HTTPS API URL when using -UseRailway.'
        }
    }
    if ($ApiBaseUrl) { Assert-ApiUrl -Value $ApiBaseUrl -RequireHttps:$UseRailway }
    if (-not $UseRailway) {
        $springOverrides = [Environment]::GetEnvironmentVariables('Process').Keys | Where-Object {
            $_ -like 'SPRING_*' -and
            $_ -notin @('SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD')
        }
        if ($springOverrides) {
            throw 'Clear inherited SPRING_* overrides before local startup. Only the three standard datasource variables can be safely replaced by this launcher.'
        }
        if (Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue) {
            throw 'Port 8080 is already in use. Stop the existing service before local startup.'
        }
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            throw 'Docker is not installed or is not available in PATH.'
        }
        Wait-ForDocker

        Write-Host 'Starting PostgreSQL...'
        & docker compose -f $composeFile up -d --wait postgres
        if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start PostgreSQL.' }
        $postgresStarted = $true

        $env:PGHOST = 'localhost'
        $env:PGPORT = '5432'
        $env:PGDATABASE = 'goodgut'
        $env:PGUSER = 'goodgut'
        $env:PGPASSWORD = 'goodgut-local'
        # Pin Spring's higher-priority datasource variables too: never seed a remote database.
        $env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/goodgut'
        $env:SPRING_DATASOURCE_USERNAME = $env:PGUSER
        $env:SPRING_DATASOURCE_PASSWORD = $env:PGPASSWORD
        $env:PORT = '8080'
        $env:SERVER_PORT = '8080'
        $env:SERVER_ADDRESS = if ($NoExpo -or $Check) { '127.0.0.1' } else { '0.0.0.0' }
        if (-not $env:OPEN_FOOD_FACTS_USER_AGENT) {
            Write-Warning 'OPEN_FOOD_FACTS_USER_AGENT is not set. Set it to a real app/contact identity before sustained Open Food Facts use.'
        }

        Write-Host 'Starting Spring Boot API...'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $apiCommand = "& '.\mvnw.cmd' spring-boot:run; exit `$LASTEXITCODE"
        $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($apiCommand))
        $apiProcess = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList @('-NoProfile', '-EncodedCommand', $encodedCommand) `
            -WorkingDirectory $apiDirectory `
            -WindowStyle Hidden `
            -RedirectStandardOutput $apiStandardLog `
            -RedirectStandardError $apiErrorLog `
            -PassThru
        Wait-ForApi -HealthUrl 'http://127.0.0.1:8080/health'
        if (-not $SkipCatalogueSeed) {
            Ensure-LocalCatalogue
        }

        if (-not $ApiBaseUrl -and ($NoExpo -or $Check)) {
            $ApiBaseUrl = 'http://127.0.0.1:8080'
        }
        if (-not $ApiBaseUrl) {
            $lanAddress = Get-LanAddress
            if (-not $lanAddress) {
                throw 'Could not determine the LAN address. Pass -ApiBaseUrl http://YOUR-IP:8080 explicitly.'
            }
            $ApiBaseUrl = "http://${lanAddress}:8080"
        }
        Assert-ApiUrl -Value $ApiBaseUrl
        $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
        Write-Host "Mobile API URL: $ApiBaseUrl"
    }
    elseif ($ApiBaseUrl) {
        $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
    }

    if ($Check) {
        if ($UseRailway) { Wait-ForApi -HealthUrl "$($ApiBaseUrl.TrimEnd('/'))/health" }
        Write-Host 'Startup check passed.' -ForegroundColor Green
    }
    elseif (-not $NoExpo) {
        # Database credentials belong to the API, not the mobile bundler or its children.
        foreach ($name in $managedVariables | Where-Object { $_ -ne 'EXPO_PUBLIC_API_BASE_URL' }) {
            [Environment]::SetEnvironmentVariable($name, $null, 'Process')
        }
        Write-Host 'Starting Expo. Press Ctrl+C to stop...'
        Push-Location $mobileDirectory
        try {
            & npm.cmd start
            if ($LASTEXITCODE -ne 0) { throw 'Expo exited with an error.' }
        }
        finally { Pop-Location }
    }
    else {
        Write-Host 'PostgreSQL and API are running. Press Enter to stop the API process.'
        Read-Host | Out-Null
    }
}
finally {
    foreach ($name in $managedVariables) {
        [Environment]::SetEnvironmentVariable($name, $originalEnvironment[$name], 'Process')
    }
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Write-Host 'Stopping local API...'
        & taskkill.exe /PID $apiProcess.Id /T /F 2>$null | Out-Null
    }
    if ($postgresStarted) {
        Write-Host 'PostgreSQL remains available in Docker. Stop it with: docker compose stop postgres'
    }
}
