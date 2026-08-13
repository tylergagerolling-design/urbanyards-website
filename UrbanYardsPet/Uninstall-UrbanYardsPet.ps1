[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "Medium")]
param(
    [switch]$RemoveUserData,
    [string]$InstallDirectory = (Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) "Programs\UrbanYardsPet")
)

$desktopShortcut = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)) "The Lawnmower Man.lnk"
$startMenuDirectory = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)) "Urban Yards"
$startupShortcut = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)) "The Lawnmower Man.lnk"
$dataRoot = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) "UrbanYardsPet"
$targets = @($desktopShortcut, $startupShortcut, (Join-Path $startMenuDirectory "The Lawnmower Man.lnk"), $InstallDirectory, "$InstallDirectory.previous")
foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) {
        if ($PSCmdlet.ShouldProcess($target, "Remove Urban Yards Pet installation item")) { Remove-Item -LiteralPath $target -Recurse -Force }
    }
}
if ((Test-Path -LiteralPath $startMenuDirectory) -and -not (Get-ChildItem -LiteralPath $startMenuDirectory -Force)) { Remove-Item -LiteralPath $startMenuDirectory -Force }
if ($RemoveUserData -and (Test-Path -LiteralPath $dataRoot) -and $PSCmdlet.ShouldProcess($dataRoot, "Remove Urban Yards Pet settings and logs")) { Remove-Item -LiteralPath $dataRoot -Recurse -Force }
Write-Host "The Lawnmower Man local installation was removed."
