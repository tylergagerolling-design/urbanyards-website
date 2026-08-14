Set-StrictMode -Version Latest

function Get-UyPetDataDirectory {
    $base = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    $path = Join-Path $base "UrbanYardsPet"
    [System.IO.Directory]::CreateDirectory($path) | Out-Null
    return $path
}

function Write-UyPetLog {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [ValidateSet("DEBUG", "INFO", "WARN", "ERROR")][string]$Level = "INFO"
    )

    try {
        $logDirectory = Join-Path (Get-UyPetDataDirectory) "logs"
        [System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null
        $logPath = Join-Path $logDirectory "urban-yards-pet.log"
        if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 524288) {
            for ($index = 4; $index -ge 1; $index--) {
                $older = "$logPath.$index"
                $newer = "$logPath.$($index + 1)"
                if (Test-Path -LiteralPath $older) {
                    if ($index -eq 4) { Remove-Item -LiteralPath $older -Force }
                    else { Move-Item -LiteralPath $older -Destination $newer -Force }
                }
            }
            Move-Item -LiteralPath $logPath -Destination "$logPath.1" -Force
        }
        $safe = $Message -replace '(?i)(bearer\s+)[a-z0-9._-]+', '$1[REDACTED]' -replace '(?i)(token|password|secret|key)\s*[:=]\s*\S+', '$1=[REDACTED]'
        Add-Content -LiteralPath $logPath -Encoding UTF8 -Value ("{0:o} [{1}] {2}" -f [DateTime]::UtcNow, $Level, $safe)
    }
    catch {
        # Logging must never terminate the pet.
    }
}

function Get-UyDefaultConfig {
    return [pscustomobject][ordered]@{
        dashboardUrl = "https://urbanyards.us/dashboard"
        apiBaseUrl = "https://urbanyards.us"
        accessTokenEnvironmentVariable = "URBAN_YARDS_ACCESS_TOKEN"
        pollIntervalSeconds = 45
        alwaysOnTop = $true
        animationsEnabled = $true
        animationSpeed = 1.0
        speechEnabled = $true
        soundsEnabled = $false
        launchWithWindows = $false
        displayMode = "floating"
        debugMode = $false
        idleBeforeSleepMinutes = 20
        notificationCooldownMinutes = 15
        scheduleHeavyThreshold = 6
    }
}

function Merge-UyConfig {
    param([Parameter(Mandatory = $true)]$Base, $Override)
    if ($null -eq $Override) { return $Base }
    foreach ($property in $Base.PSObject.Properties.Name) {
        $candidate = $Override.PSObject.Properties[$property]
        if ($null -ne $candidate -and $null -ne $candidate.Value) {
            $Base.$property = $candidate.Value
        }
    }
    return $Base
}

function Get-UyPetConfig {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)

    $config = Get-UyDefaultConfig
    $appDataPath = Join-Path (Get-UyPetDataDirectory) "config.json"
    $projectPath = Join-Path $ProjectRoot "config\config.json"
    $candidatePath = if (Test-Path -LiteralPath $appDataPath) { $appDataPath } elseif (Test-Path -LiteralPath $projectPath) { $projectPath } else { "" }
    if ($candidatePath) {
        try {
            $saved = Get-Content -LiteralPath $candidatePath -Raw | ConvertFrom-Json
            $config = Merge-UyConfig -Base $config -Override $saved
            Write-UyPetLog "Configuration loaded from a local user file."
        }
        catch {
            Write-UyPetLog "Configuration could not be parsed; defaults are active. $($_.Exception.Message)" "WARN"
        }
    }

    $config.pollIntervalSeconds = [Math]::Min(300, [Math]::Max(30, [int]$config.pollIntervalSeconds))
    $config.animationSpeed = [Math]::Min(2.5, [Math]::Max(0.35, [double]$config.animationSpeed))
    $config.notificationCooldownMinutes = [Math]::Min(240, [Math]::Max(1, [int]$config.notificationCooldownMinutes))
    return $config
}

function Save-UyPetConfig {
    param([Parameter(Mandatory = $true)]$Config)
    $path = Join-Path (Get-UyPetDataDirectory) "config.json"
    $Config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding UTF8
    Write-UyPetLog "Configuration saved."
}

function Get-UyPetWindowState {
    $path = Join-Path (Get-UyPetDataDirectory) "window-state.json"
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    try { return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
    catch { return $null }
}

function Save-UyPetWindowState {
    param([Parameter(Mandatory = $true)][double]$Left, [Parameter(Mandatory = $true)][double]$Top)
    if ([double]::IsNaN($Left) -or [double]::IsInfinity($Left) -or [double]::IsNaN($Top) -or [double]::IsInfinity($Top)) {
        Write-UyPetLog "Skipped an invalid pet window position." "WARN"
        return
    }
    try {
        [pscustomobject]@{ left = [Math]::Round($Left, 2); top = [Math]::Round($Top, 2); savedAt = [DateTime]::UtcNow.ToString("o") } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path (Get-UyPetDataDirectory) "window-state.json") -Encoding UTF8
    }
    catch {
        Write-UyPetLog "Pet window position could not be saved: $($_.Exception.Message)" "WARN"
    }
}

function Get-UyAccessToken {
    param([Parameter(Mandatory = $true)]$Config)
    $name = [string]$Config.accessTokenEnvironmentVariable
    if (-not [string]::IsNullOrWhiteSpace($name)) {
        $environmentToken = [string][Environment]::GetEnvironmentVariable($name, [EnvironmentVariableTarget]::Process)
        if (-not [string]::IsNullOrWhiteSpace($environmentToken)) { return $environmentToken }
    }
    if (Get-Command Get-UyUsableAccessToken -ErrorAction SilentlyContinue) {
        return [string](Get-UyUsableAccessToken -Config $Config)
    }
    return ""
}

function Test-UyConnectivityConfigured {
    param([Parameter(Mandatory = $true)]$Config)
    return -not [string]::IsNullOrWhiteSpace((Get-UyAccessToken -Config $Config))
}

function Get-UyRouteMap {
    return [ordered]@{
        overview = "overview"
        tickets = "tickets"
        work = "calendar"
        routes = "route-planner"
        leads = "outreach"
        clients = "contacts"
        callQueue = "call-queue"
        money = "documents"
        tools = "settings"
        equipment = "equipment"
        documentation = "documentation"
        importExport = "import-export"
        ai = "groundskeeper-ai"
        aiMemory = "ai-memory"
    }
}

function Get-UyDashboardUri {
    param([Parameter(Mandatory = $true)]$Config, [string]$Route = "overview")
    $map = Get-UyRouteMap
    $hash = if ($map.Contains($Route)) { [string]$map[$Route] } elseif ($map.Values -contains $Route) { $Route } else { "overview" }
    $base = ([string]$Config.dashboardUrl).TrimEnd('/')
    return "$base#$hash"
}

function Open-UyDashboardRoute {
    param([Parameter(Mandatory = $true)]$Config, [string]$Route = "overview")
    $uri = Get-UyDashboardUri -Config $Config -Route $Route
    try {
        Start-Process $uri | Out-Null
        Write-UyPetLog "Opened dashboard route '$Route'."
    }
    catch {
        Write-UyPetLog "Could not open dashboard route '$Route'. $($_.Exception.Message)" "ERROR"
    }
}

function Set-UyStartupRegistration {
    param(
        [Parameter(Mandatory = $true)][bool]$Enabled,
        [Parameter(Mandatory = $true)][string]$LauncherPath,
        [string]$IconPath = ""
    )
    $startup = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
    $startupLauncher = Join-Path $startup "The Lawnmower Man.lnk"
    $legacyLauncher = Join-Path $startup "Urban Yards Pet.cmd"
    if ($Enabled) {
        $projectRoot = [System.IO.Path]::GetDirectoryName($LauncherPath)
        $silentLauncherPath = Join-Path $projectRoot "Launch-UrbanYardsPet.vbs"
        $target = Join-Path $env:WINDIR "System32\wscript.exe"
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($startupLauncher)
        $shortcut.TargetPath = $target
        $shortcut.Arguments = "`"$silentLauncherPath`""
        $shortcut.WorkingDirectory = $projectRoot
        $shortcut.IconLocation = if ($IconPath) { "$IconPath,0" } else { "$target,0" }
        $shortcut.Description = "Launch The Lawnmower Man desktop pet"
        $shortcut.Save()
        if (Test-Path -LiteralPath $legacyLauncher) { Remove-Item -LiteralPath $legacyLauncher -Force }
        Write-UyPetLog "Per-user Windows startup enabled."
    }
    else {
        if (Test-Path -LiteralPath $startupLauncher) { Remove-Item -LiteralPath $startupLauncher -Force }
        if (Test-Path -LiteralPath $legacyLauncher) { Remove-Item -LiteralPath $legacyLauncher -Force }
        Write-UyPetLog "Per-user Windows startup disabled."
    }
}

function Reset-UyPetPosition {
    $path = Join-Path (Get-UyPetDataDirectory) "window-state.json"
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
}
