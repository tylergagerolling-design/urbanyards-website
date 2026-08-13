[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$failures = [System.Collections.Generic.List[string]]::new()
$passes = [System.Collections.Generic.List[string]]::new()

function Assert-UyTest {
    param([bool]$Condition, [string]$Name)
    if ($Condition) { $passes.Add($Name); Write-Host "PASS $Name" -ForegroundColor Green }
    else { $failures.Add($Name); Write-Host "FAIL $Name" -ForegroundColor Red }
}

$required = @(
    "Start-UrbanYardsPet.ps1", "UrbanYardsPet.ps1", "Launch Urban Yards Pet.cmd", "Launch-UrbanYardsPet.vbs", "README.md", "config.example.json",
    "src\PetWindow.ps1", "src\PetController.ps1", "src\AnimationController.ps1", "src\EventController.ps1",
    "src\DesktopLayer.ps1",
    "src\AuthClient.ps1",
    "src\LawnmowerManClient.ps1", "src\UrbanYardsClient.ps1", "src\NotificationController.ps1", "src\Config.ps1",
    "ui\PetWindow.xaml", "ui\PetMenu.xaml", "ui\ChatPopup.xaml", "ui\SettingsWindow.xaml",
    "config\sprite-manifest.json", "assets\icons\lawnmower-man-app-icon.png", "assets\icons\lawnmower-man-app.ico"
)
foreach ($file in $required) { Assert-UyTest (Test-Path -LiteralPath (Join-Path $root $file)) "required file: $file" }

$appIconPath = Join-Path $root "assets\icons\lawnmower-man-app.ico"
if (Test-Path -LiteralPath $appIconPath -PathType Leaf) {
    $iconBytes = [System.IO.File]::ReadAllBytes($appIconPath)
    $iconCount = if ($iconBytes.Length -ge 6) { [BitConverter]::ToUInt16($iconBytes, 4) } else { 0 }
    $iconSizes = @()
    for ($index = 0; $index -lt $iconCount; $index++) {
        $entryOffset = 6 + (16 * $index)
        if (($entryOffset + 16) -gt $iconBytes.Length) { break }
        $width = [int]$iconBytes[$entryOffset]
        $iconSizes += $(if ($width -eq 0) { 256 } else { $width })
    }
    Assert-UyTest ($iconCount -ge 8) "app icon contains multiple resolution layers"
    Assert-UyTest ($iconSizes -contains 16 -and $iconSizes -contains 32 -and $iconSizes -contains 48 -and $iconSizes -contains 256) "app icon covers Windows shortcut sizes"
}
else {
    Assert-UyTest $false "app icon contains multiple resolution layers"
    Assert-UyTest $false "app icon covers Windows shortcut sizes"
}

$parseFiles = Get-ChildItem -LiteralPath $root -Recurse -Filter *.ps1 -File
foreach ($file in $parseFiles) {
    $tokens = $null; $errors = $null
    [void][Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
    Assert-UyTest ($errors.Count -eq 0) "PowerShell parses: $($file.Name)"
    if ($errors.Count) { $errors | ForEach-Object { Write-Host "  $($_.Message)" -ForegroundColor Yellow } }
}

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml
Add-Type -AssemblyName System.Drawing
$xamlFiles = Get-ChildItem -LiteralPath (Join-Path $root "ui") -Filter *.xaml -File
foreach ($file in $xamlFiles) {
    try {
        [xml]$xaml = Get-Content -LiteralPath $file.FullName -Raw
        $reader = [System.Xml.XmlNodeReader]::new($xaml)
        $object = [System.Windows.Markup.XamlReader]::Load($reader)
        if ($object -is [System.Windows.Window]) { $object.Close() }
        Assert-UyTest $true "XAML loads: $($file.Name)"
    }
    catch { Assert-UyTest $false "XAML loads: $($file.Name)"; Write-Host "  $($_.Exception.Message)" -ForegroundColor Yellow }
}

$manifestPath = Join-Path $root "config\sprite-manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$expectedStates = @("idle","walk","lookAround","sleep","hover","clicked","dragged","thinking","working","writing","foundSomething","newLead","overdue","route","busyDay","weather","payment","celebrate","plant","water")
Assert-UyTest ($manifest.canvas.width -eq 128 -and $manifest.canvas.height -eq 128 -and $manifest.canvas.anchorX -eq 64 -and $manifest.canvas.anchorY -eq 112) "common sprite canvas and anchor"
Assert-UyTest (@($manifest.allowedStates).Count -eq $expectedStates.Count) "manifest state count"
foreach ($state in $expectedStates) {
    Assert-UyTest (@($manifest.allowedStates) -contains $state) "registered state: $state"
    $animation = $manifest.animations.$state
    Assert-UyTest ($null -ne $animation -and @($animation.frames).Count -ge 2) "animation frames: $state"
    foreach ($frame in @($animation.frames)) {
        $path = Join-Path (Join-Path $root "assets\sprites") ([string]$frame)
        Assert-UyTest (Test-Path -LiteralPath $path) "sprite exists: $frame"
    }
}

$spriteFiles = Get-ChildItem -LiteralPath (Join-Path $root "assets\sprites") -Filter *.png -File
$transparentCorners = $true
$dimensionsCorrect = $true
$hasContent = $true
$alphaBounds = [System.Collections.Generic.List[object]]::new()
foreach ($file in $spriteFiles) {
    $bitmap = [Drawing.Bitmap]::new($file.FullName)
    try {
        if ($bitmap.Width -ne 128 -or $bitmap.Height -ne 128) { $dimensionsCorrect = $false }
        if ($bitmap.GetPixel(0,0).A -ne 0 -or $bitmap.GetPixel(127,127).A -ne 0) { $transparentCorners = $false }
        $minX=128; $maxX=-1; $minY=128; $maxY=-1; $pixels=0
        for($y=0;$y -lt 128;$y++) { for($x=0;$x -lt 128;$x++) { if($bitmap.GetPixel($x,$y).A -gt 8) { $pixels++; if($x -lt $minX){$minX=$x}; if($x -gt $maxX){$maxX=$x}; if($y -lt $minY){$minY=$y}; if($y -gt $maxY){$maxY=$y} } } }
        if ($pixels -lt 200) { $hasContent = $false }
        $alphaBounds.Add([pscustomobject]@{ Name=$file.Name; MinX=$minX; MaxX=$maxX; MinY=$minY; MaxY=$maxY; Pixels=$pixels })
    }
    finally { $bitmap.Dispose() }
}
Assert-UyTest ($spriteFiles.Count -ge 100) "extracted sprite frame count"
Assert-UyTest $dimensionsCorrect "all sprites use 128x128"
Assert-UyTest $transparentCorners "all sprite corners are transparent"
Assert-UyTest $hasContent "all sprites contain character pixels"
Assert-UyTest (($alphaBounds | Measure-Object MaxY -Maximum).Maximum -le 112) "sprite feet remain at or above shared baseline"

$configText = Get-Content -LiteralPath (Join-Path $root "config.example.json") -Raw
Assert-UyTest ($configText -notmatch '(?i)service[_-]?role|sk_live|eyJ[a-zA-Z0-9_-]{20,}') "example config contains no privileged secrets"
$allText = (Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object { $_.Extension -in @('.ps1','.json','.xaml','.md','.cmd') } | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join "`n"
Assert-UyTest ($allText -notmatch '(?i)SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*[^\s<]+') "no service role credential in project"
Assert-UyTest ($allText -match 'lawnmower-man-chat') "reuses existing Lawnmower Man endpoint"
Assert-UyTest ($allText -match 'dashboard-tickets') "reuses existing ticket endpoint"
Assert-UyTest ($allText -match 'dashboard-records') "reuses existing records endpoint"
Assert-UyTest ($allText -match 'DataProtectionScope]::CurrentUser') "encrypts saved desktop session for current Windows user"
Assert-UyTest ($allText -match 'Connect to Urban Yards') "settings expose an explicit connection workflow"
Assert-UyTest ($allText -match 'BringForwardEvent') "second launch brings the existing pet forward"
Assert-UyTest ($allText -match 'SetParent' -and $allText -match 'SHELLDLL_DefView') "desktop shelf uses the native Windows desktop layer"
Assert-UyTest ($allText -match 'SEND TO SHELF' -and $allText -match 'BRING FORWARD' -and $allText -match 'SHOW ALERTS') "tray exposes alert, shelf, and foreground controls"
Assert-UyTest ($allText -match 'displayMode') "desktop display mode is persisted"
Assert-UyTest ($allText -match 'SetCurrentProcessExplicitAppUserModelID') "PowerShell host receives a branded app identity"
Assert-UyTest ($allText -match 'TrayOnly' -and $allText -match 'wscript.exe') "shortcut starts PowerShell silently in tray-only mode"
Assert-UyTest ($allText -match 'SetUnhandledExceptionMode' -and $allText -match 'CatchException') "tray UI errors are contained without a JIT crash"
Assert-UyTest ($allText -match 'DispatcherUnhandledException' -and $allText -match 'Handled = \$true') "WPF feature errors cannot terminate the pet"
Assert-UyTest ($allText -match 'ActionFailures' -and $allText -match 'ReportFailure') "tray command failures remain observable in smoke tests"
Assert-UyTest ($allText -match 'Items\[0\]\.PerformClick' -and $allText -match 'Items\[7\]\.PerformClick') "smoke test exercises alerts and pause tray commands"

Write-Host ""
Write-Host "$($passes.Count) passed, $($failures.Count) failed."
if ($failures.Count) { throw "Urban Yards Pet tests failed: $($failures -join '; ')" }
