[CmdletBinding()]
param(
    [switch]$SmokeTest,
    [string]$TestState = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$projectRoot = $PSScriptRoot
$singleInstanceName = "Local\UrbanYardsPet.TheLawnmowerMan"
$bringForwardEventName = "Local\UrbanYardsPet.TheLawnmowerMan.BringForward"
$createdNew = $false
$singleInstanceMutex = [Threading.Mutex]::new($true, $singleInstanceName, [ref]$createdNew)
if (-not $createdNew) {
    try {
        $existingEvent = [Threading.EventWaitHandle]::OpenExisting($bringForwardEventName)
        [void]$existingEvent.Set()
        $existingEvent.Dispose()
    } catch {}
    exit 0
}
$bringForwardEvent = [Threading.EventWaitHandle]::new($false, [Threading.EventResetMode]::AutoReset, $bringForwardEventName)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$sourceFiles = @(
    "src\Config.ps1",
    "src\AuthClient.ps1",
    "src\AnimationController.ps1",
    "src\EventController.ps1",
    "src\LawnmowerManClient.ps1",
    "src\UrbanYardsClient.ps1",
    "src\NotificationController.ps1",
    "src\DesktopLayer.ps1",
    "src\PetController.ps1",
    "src\PetWindow.ps1"
)
foreach ($sourceFile in $sourceFiles) {
    . (Join-Path $projectRoot $sourceFile)
}
Set-UyProcessAppIdentity

# WPF raises several callbacks from closure-backed event scopes. PowerShell 7 does
# not automatically expose functions declared in this script scope to those
# closures, so publish the pet's own helpers into this isolated process runspace.
# Without this, moving the window can fail when LocationChanged tries to resolve
# Set-UyWindowWithinScreens. The desktop-pet process owns this runspace, so these
# names do not leak into the user's PowerShell session.
Get-Command -CommandType Function -Name "*-Uy*" | ForEach-Object {
    Set-Item -LiteralPath ("Function:\global:{0}" -f $_.Name) -Value $_.ScriptBlock
}

try {
    Write-UyPetLog "The Lawnmower Man is starting. PowerShell $($PSVersionTable.PSVersion)."
    $config = Get-UyPetConfig -ProjectRoot $projectRoot
    $app = [System.Windows.Application]::new()
    $app.ShutdownMode = [System.Windows.ShutdownMode]::OnMainWindowClose
    $app.Add_DispatcherUnhandledException({
        param($sender, $eventArgs)
        Write-UyPetLog "Unhandled WPF dispatcher error: $($eventArgs.Exception.Message)" "ERROR"
        $eventArgs.Handled = $false
    })
    Write-UyPetLog "Creating the WPF pet window."
    $runtime = New-UyPetWindow -ProjectRoot $projectRoot -Config $config -SmokeTest:$SmokeTest -BringForwardEvent $bringForwardEvent
    Write-UyPetLog "The WPF pet window was created."
    if ($TestState -and $runtime.Animation.IsAllowedState($TestState)) {
        $runtime.Window.Add_Loaded({ $runtime.PetController.SetState($TestState, "normal", 8) })
    }
    $app.MainWindow = $runtime.Window
    $runtime.Window.Show()
    Write-UyPetLog "The WPF pet window was shown."
    $exitCode = $app.Run()
    Write-UyPetLog "Application loop exited with code $exitCode."
    exit $exitCode
}
catch {
    try { Write-UyPetLog "Startup failed: $($_.Exception.Message)" "ERROR" } catch {}
    [System.Windows.MessageBox]::Show(
        "The Lawnmower Man could not start.`n`n$($_.Exception.Message)",
        "Urban Yards Pet",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Error
    ) | Out-Null
    throw
}
finally {
    if ($bringForwardEvent) { $bringForwardEvent.Dispose() }
    if ($singleInstanceMutex) {
        try { $singleInstanceMutex.ReleaseMutex() } catch {}
        $singleInstanceMutex.Dispose()
    }
}
