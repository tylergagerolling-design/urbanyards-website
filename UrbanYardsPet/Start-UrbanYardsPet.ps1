[CmdletBinding()]
param(
    [switch]$SmokeTest,
    [string]$TestState = ""
)

$ErrorActionPreference = "Stop"
$main = Join-Path $PSScriptRoot "UrbanYardsPet.ps1"
if (-not (Test-Path -LiteralPath $main)) { throw "UrbanYardsPet.ps1 was not found beside the launcher." }

function Start-UyPetProcess {
    param([Parameter(Mandatory = $true)][string]$Executable)
    $arguments = @("-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", ('"{0}"' -f $main))
    if ($SmokeTest) { $arguments += "-SmokeTest" }
    if ($TestState) { $arguments += @("-TestState", ('"{0}"' -f $TestState)) }
    $process = Start-Process -FilePath $Executable -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -PassThru
    Write-Host "The Lawnmower Man started (PID $($process.Id)) with $Executable."
    if ($SmokeTest) { $process.WaitForExit(); exit $process.ExitCode }
}

if ($PSVersionTable.PSEdition -eq "Core" -and $PSVersionTable.PSVersion.Major -ge 7 -and [Threading.Thread]::CurrentThread.ApartmentState -eq "STA") {
    & $main -SmokeTest:$SmokeTest -TestState $TestState
    exit $LASTEXITCODE
}

$pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
if ($pwsh) { Start-UyPetProcess -Executable $pwsh.Source; exit }

$windowsPowerShell = Get-Command powershell.exe -ErrorAction SilentlyContinue
if ($windowsPowerShell) {
    Write-Warning "PowerShell 7+ was not found. Starting with Windows PowerShell 5.1 compatibility mode. Install PowerShell 7 for the recommended runtime."
    Start-UyPetProcess -Executable $windowsPowerShell.Source
    exit
}

throw "PowerShell was not found. Install PowerShell 7 from https://aka.ms/powershell and try again."
