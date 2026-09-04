[CmdletBinding()]
param(
    [switch]$UseRailway,
    [switch]$NoExpo,
    [switch]$SkipCatalogueSeed,
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
    $catalogueUrl = 'http://localhost:8080/ingredient-catalogue/promoted?locale=pl'
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
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -ne 503) {
            throw "Could not check the local ingredient catalogue: $($_.Exception.Message)"
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
    if (-not $UseRailway) {
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
        if (-not $env:OPEN_FOOD_FACTS_USER_AGENT) {
            Write-Warning 'OPEN_FOOD_FACTS_USER_AGENT is not set. Set it to a real app/contact identity before sustained Open Food Facts use.'
        }

        Write-Host 'Starting Spring Boot API...'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $apiCommand = "& '$apiDirectory\mvnw.cmd' spring-boot:run"
        $apiProcess = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList @('-NoProfile', '-Command', $apiCommand) `
            -WorkingDirectory $apiDirectory `
            -WindowStyle Hidden `
            -RedirectStandardOutput $apiStandardLog `
            -RedirectStandardError $apiErrorLog `
            -PassThru
        Wait-ForApi -HealthUrl 'http://localhost:8080/health'
        if (-not $SkipCatalogueSeed) {
            Ensure-LocalCatalogue
        }

        if (-not $ApiBaseUrl) {
            $lanAddress = Get-LanAddress
            if (-not $lanAddress) {
                throw 'Could not determine the LAN address. Pass -ApiBaseUrl http://YOUR-IP:8080 explicitly.'
            }
            $ApiBaseUrl = "http://${lanAddress}:8080"
        }
        $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
        Write-Host "Mobile API URL: $ApiBaseUrl"
    }
    elseif ($ApiBaseUrl) {
        $env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl
    }

    if (-not $NoExpo) {
        Write-Host 'Starting Expo. Press Ctrl+C to stop...'
        Push-Location $mobileDirectory
        try { & npm.cmd start }
        finally { Pop-Location }
    }
    else {
        Write-Host 'PostgreSQL and API are running. Press Enter to stop the API process.'
        Read-Host | Out-Null
    }
}
finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Write-Host 'Stopping local API...'
        & taskkill.exe /PID $apiProcess.Id /T /F 2>$null | Out-Null
    }
    if ($postgresStarted) {
        Write-Host 'PostgreSQL remains available in Docker. Stop it with: docker compose stop postgres'
    }
}
