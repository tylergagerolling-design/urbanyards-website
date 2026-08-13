[CmdletBinding()]
param(
    [switch]$Launch,
    [switch]$EnableStartup,
    [string]$InstallDirectory = (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) "Programs\UrbanYardsPet"),
    [string]$RuntimeArchive = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$sourceRoot = $PSScriptRoot
$installRoot = [System.IO.Path]::GetFullPath($InstallDirectory)
$parent = [System.IO.Path]::GetDirectoryName($installRoot)
$staging = Join-Path $parent ("UrbanYardsPet.install-" + [Guid]::NewGuid().ToString("N"))
$backup = "$installRoot.previous"
$dataRoot = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) "UrbanYardsPet"

function Copy-UyDirectory {
    param([string]$Source, [string]$Destination)
    [System.IO.Directory]::CreateDirectory($Destination) | Out-Null
    foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
        if ($item.Name -in @("logs", "config.json") -or $item.Name -like "*.user.json") { continue }
        $target = Join-Path $Destination $item.Name
        if ($item.PSIsContainer) { Copy-UyDirectory -Source $item.FullName -Destination $target }
        else { Copy-Item -LiteralPath $item.FullName -Destination $target -Force }
    }
}

function New-UyShortcut {
    param([string]$Path, [string]$Target, [string]$Arguments, [string]$WorkingDirectory, [string]$IconPath)
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $Target
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.IconLocation = "$IconPath,0"
    $shortcut.Description = "Launch The Lawnmower Man desktop pet"
    $shortcut.Save()
}

try {
    [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    Copy-UyDirectory -Source $sourceRoot -Destination $staging

    $runtimeDirectory = Join-Path $staging "runtime"
    if ($RuntimeArchive) {
        if (-not (Test-Path -LiteralPath $RuntimeArchive -PathType Leaf)) { throw "PowerShell runtime archive not found: $RuntimeArchive" }
        [System.IO.Directory]::CreateDirectory($runtimeDirectory) | Out-Null
        Expand-Archive -LiteralPath $RuntimeArchive -DestinationPath $runtimeDirectory -Force
    }
    elseif (Test-Path -LiteralPath (Join-Path $installRoot "runtime\pwsh.exe") -PathType Leaf) {
        # Keep the private PowerShell runtime during an in-place application
        # update so a reinstall does not silently fall back to PowerShell 5.1.
        Copy-UyDirectory -Source (Join-Path $installRoot "runtime") -Destination $runtimeDirectory
    }

    $launcher = @'
@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0runtime\pwsh.exe" (
  start "" "%~dp0runtime\pwsh.exe" -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Start-UrbanYardsPet.ps1"
) else (
  where pwsh.exe >nul 2>nul
  if %errorlevel%==0 (
    start "" pwsh.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Start-UrbanYardsPet.ps1"
  ) else (
    start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Start-UrbanYardsPet.ps1"
  )
)
endlocal
'@
    [System.IO.File]::WriteAllText((Join-Path $staging "Launch Urban Yards Pet.cmd"), $launcher, [Text.UTF8Encoding]::new($false))

    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
    if (Test-Path -LiteralPath $installRoot) { Move-Item -LiteralPath $installRoot -Destination $backup }
    Move-Item -LiteralPath $staging -Destination $installRoot

    $launcherPath = Join-Path $installRoot "Launch Urban Yards Pet.cmd"
    $silentLauncherPath = Join-Path $installRoot "Launch-UrbanYardsPet.vbs"
    $iconPath = Join-Path $installRoot "assets\icons\lawnmower-man-app.ico"
    $shortcutTarget = Join-Path $env:WINDIR "System32\wscript.exe"
    $shortcutArguments = "`"$silentLauncherPath`""
    $desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
    $programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
    $startMenuDirectory = Join-Path $programs "Urban Yards"
    [System.IO.Directory]::CreateDirectory($startMenuDirectory) | Out-Null
    New-UyShortcut -Path (Join-Path $desktop "The Lawnmower Man.lnk") -Target $shortcutTarget -Arguments $shortcutArguments -WorkingDirectory $installRoot -IconPath $iconPath
    New-UyShortcut -Path (Join-Path $startMenuDirectory "The Lawnmower Man.lnk") -Target $shortcutTarget -Arguments $shortcutArguments -WorkingDirectory $installRoot -IconPath $iconPath

    if ($EnableStartup) {
        $startup = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
        New-UyShortcut -Path (Join-Path $startup "The Lawnmower Man.lnk") -Target $shortcutTarget -Arguments $shortcutArguments -WorkingDirectory $installRoot -IconPath $iconPath
    }
    [System.IO.Directory]::CreateDirectory($dataRoot) | Out-Null
    [pscustomobject]@{
        installedAt = [DateTime]::UtcNow.ToString("o")
        installDirectory = $installRoot
        runtime = if (Test-Path -LiteralPath (Join-Path $installRoot "runtime\pwsh.exe")) { "bundled-powershell-7" } elseif (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { "system-powershell-7" } else { "windows-powershell-compatibility" }
        startupEnabled = [bool]$EnableStartup
        source = $sourceRoot
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dataRoot "install.json") -Encoding UTF8

    Write-Host "The Lawnmower Man installed to $installRoot" -ForegroundColor Green
    Write-Host "Desktop shortcut: The Lawnmower Man" -ForegroundColor Green
    Write-Host "Start Menu shortcut: Urban Yards > The Lawnmower Man" -ForegroundColor Green
    if (Test-Path -LiteralPath $backup) { Write-Host "Previous installation retained at $backup" }
    if ($Launch) { Start-Process -FilePath $shortcutTarget -ArgumentList $shortcutArguments -WorkingDirectory $installRoot -WindowStyle Hidden | Out-Null }
}
catch {
    if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
    if (-not (Test-Path -LiteralPath $installRoot) -and (Test-Path -LiteralPath $backup)) { Move-Item -LiteralPath $backup -Destination $installRoot }
    throw
}
