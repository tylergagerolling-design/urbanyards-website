[CmdletBinding()]
param(
    [switch]$SmokeTest,
    [switch]$TrayOnly,
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
    if (-not $TrayOnly) {
        try {
            $existingEvent = [Threading.EventWaitHandle]::OpenExisting($bringForwardEventName)
            [void]$existingEvent.Set()
            $existingEvent.Dispose()
        } catch {}
    }
    exit 0
}
$bringForwardEvent = [Threading.EventWaitHandle]::new($false, [Threading.EventResetMode]::AutoReset, $bringForwardEventName)

Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

# Both WPF and Windows Forms dispatch delayed UI callbacks. A feature-level
# exception must be logged and contained; it must never tear down the tray host
# or show the Windows Forms JIT crash dialog.
$script:UyUnhandledUiErrorCount = 0
[System.Windows.Forms.Application]::SetUnhandledExceptionMode([System.Windows.Forms.UnhandledExceptionMode]::CatchException)
[System.Windows.Forms.Application]::add_ThreadException({
    param($sender, $eventArgs)
    $script:UyUnhandledUiErrorCount++
    try { Write-UyPetLog "Unhandled tray UI error was contained: $($eventArgs.Exception.Message)" "ERROR" } catch {}
})

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
        $script:UyUnhandledUiErrorCount++
        Write-UyPetLog "Unhandled WPF feature error was contained: $($eventArgs.Exception.Message)" "ERROR"
        $eventArgs.Handled = $true
    })
    Write-UyPetLog "Creating the WPF pet window."
    $runtime = New-UyPetWindow -ProjectRoot $projectRoot -Config $config -SmokeTest:$SmokeTest -TrayOnly:$TrayOnly -BringForwardEvent $bringForwardEvent
    Write-UyPetLog "The WPF pet window was created."
    if ($TrayOnly) { Write-UyPetLog "Tray-only visible top-level windows: $(Get-UyVisibleProcessWindowCount)." }
    if ($TestState -and $runtime.Animation.IsAllowedState($TestState)) {
        $runtime.Window.Add_Loaded({ $runtime.PetController.SetState($TestState, "normal", 8) })
    }
    $app.MainWindow = $runtime.Window
    if ($TrayOnly) {
        Write-UyPetLog "The Lawnmower Man started in tray-only mode."
    }
    else {
        $runtime.Window.Show()
        Write-UyPetLog "The WPF pet window was shown."
    }
    $exitCode = $app.Run()
    if ($SmokeTest -and $script:UyUnhandledUiErrorCount -gt 0) {
        throw "The UI stability smoke test caught $script:UyUnhandledUiErrorCount unhandled feature error(s)."
    }
    if ($SmokeTest -and $runtime.Notification.ActionFailures -gt 0) {
        throw "The tray stability smoke test caught $($runtime.Notification.ActionFailures) failed command(s): $($runtime.Notification.LastActionError)"
    }
    Write-UyPetLog "Application loop exited with code $exitCode."
    exit $exitCode
}
catch {
    try { Write-UyPetLog "Startup failed: $($_.Exception.Message)" "ERROR" } catch {}
    if (-not $SmokeTest) {
        [System.Windows.MessageBox]::Show(
            "The Lawnmower Man could not start.`n`n$($_.Exception.Message)",
            "Urban Yards Pet",
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Error
        ) | Out-Null
    }
    throw
}
finally {
    if ($bringForwardEvent) { $bringForwardEvent.Dispose() }
    if ($singleInstanceMutex) {
        try { $singleInstanceMutex.ReleaseMutex() } catch {}
        $singleInstanceMutex.Dispose()
    }
}
