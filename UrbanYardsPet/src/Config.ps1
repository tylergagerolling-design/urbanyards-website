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
        Add-Content -LiteralPath $logPath -Encoding UTF8 -Value ("{0:o} [{1}] {2}" -f [DateTime]::UtcNow, $Level, $Message)
    }
    catch {
        # Logging must never terminate the pet.
    }
}

function Get-UyDefaultConfig {
    return [pscustomobject][ordered]@{
        alwaysOnTop = $true
        animationsEnabled = $true
        animationSpeed = 1.0
        launchWithWindows = $false
        displayMode = "floating"
        idleBeforeSleepMinutes = 20
    }
}

function Merge-UyConfig {
    param([Parameter(Mandatory = $true)]$Base, $Override)
    if ($null -eq $Override) { return $Base }
    foreach ($property in $Base.PSObject.Properties.Name) {
        $candidate = $Override.PSObject.Properties[$property]
        if ($null -ne $candidate -and $null -ne $candidate.Value) { $Base.$property = $candidate.Value }
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
        catch { Write-UyPetLog "Configuration could not be parsed; defaults are active. $($_.Exception.Message)" "WARN" }
    }
    $config.animationSpeed = [Math]::Min(2.5, [Math]::Max(0.35, [double]$config.animationSpeed))
    $config.idleBeforeSleepMinutes = [Math]::Min(240, [Math]::Max(1, [int]$config.idleBeforeSleepMinutes))
    return $config
}

function Save-UyPetConfig {
    param([Parameter(Mandatory = $true)]$Config)
    $path = Join-Path (Get-UyPetDataDirectory) "config.json"
    $Config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $path -Encoding UTF8
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
    catch { Write-UyPetLog "Pet window position could not be saved: $($_.Exception.Message)" "WARN" }
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
