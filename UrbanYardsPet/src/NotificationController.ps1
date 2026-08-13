Set-StrictMode -Version Latest

function New-UyNotificationController {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)][System.Windows.Controls.Primitives.Popup]$SpeechPopup,
        [Parameter(Mandatory = $true)][System.Windows.Controls.TextBlock]$SpeechText,
        [Parameter(Mandatory = $true)][System.Windows.Controls.Button]$SpeechAction,
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$TrayIconPath,
        [Parameter(Mandatory = $true)][scriptblock]$OpenRoute,
        [Parameter(Mandatory = $true)][scriptblock]$Restore,
        [Parameter(Mandatory = $true)][scriptblock]$Ask,
        [Parameter(Mandatory = $true)][scriptblock]$ShowAlerts,
        [Parameter(Mandatory = $true)][scriptblock]$BringForward,
        [Parameter(Mandatory = $true)][scriptblock]$ReturnToShelf,
        [Parameter(Mandatory = $true)][scriptblock]$TogglePause,
        [Parameter(Mandatory = $true)][scriptblock]$Exit
    )
    $hideTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $controller = [pscustomobject]@{
        Window = $Window
        SpeechPopup = $SpeechPopup
        SpeechText = $SpeechText
        SpeechAction = $SpeechAction
        Config = $Config
        HideTimer = $hideTimer
        CurrentRoute = "overview"
        Tray = $null
        TrayMenu = $null
        IsPaused = $false
        ActionFailures = 0
        LastActionError = ""
        OpenRouteAction = $OpenRoute
        RestoreAction = $Restore
        AskAction = $Ask
        ShowAlertsAction = $ShowAlerts
        BringForwardAction = $BringForward
        ReturnToShelfAction = $ReturnToShelf
        TogglePauseAction = $TogglePause
        ExitAction = $Exit
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ReportFailure -Value {
        param([string]$Operation, $Failure)
        $message = if ($Failure -is [System.Management.Automation.ErrorRecord]) { $Failure.Exception.Message } elseif ($Failure -is [Exception]) { $Failure.Message } else { [string]$Failure }
        $this.ActionFailures++
        $this.LastActionError = "$Operation`: $message"
        Write-UyPetLog "Feature '$Operation' failed but the pet stayed open: $message" "ERROR"
        if ($null -ne $this.Tray) {
            try { $this.Tray.ShowBalloonTip(2200, "The Lawnmower Man", "That command did not finish, but I am still running.", [System.Windows.Forms.ToolTipIcon]::Warning) } catch {}
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name HideSpeech -Value {
        $this.HideTimer.Stop()
        $this.SpeechPopup.IsOpen = $false
    }
    $controller | Add-Member -MemberType ScriptMethod -Name InvokeAction -Value {
        param([string]$ActionName, $Argument = $null, [bool]$HasArgument = $false)
        try {
            $property = $this.PSObject.Properties[$ActionName]
            if ($null -eq $property -or $null -eq $property.Value) { throw "Tray action '$ActionName' is unavailable." }
            $action = $property.Value
            if ($HasArgument) { & $action $Argument } else { & $action }
        }
        catch {
            $this.ReportFailure($ActionName, $_)
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ShowSpeech -Value {
        param([string]$Message, [string]$ActionLabel = "", [string]$Route = "overview", [int]$Seconds = 8)
        if (-not [bool]$this.Config.speechEnabled -or [string]::IsNullOrWhiteSpace($Message)) { return }
        $this.CurrentRoute = $Route
        $this.SpeechText.Text = $Message
        $this.SpeechAction.Content = if ($ActionLabel) { $ActionLabel } else { "OPEN URBAN YARDS" }
        $this.SpeechAction.Visibility = if ($Route) { [System.Windows.Visibility]::Visible } else { [System.Windows.Visibility]::Collapsed }
        $this.SpeechPopup.IsOpen = $true
        $this.HideTimer.Stop()
        $this.HideTimer.Interval = [TimeSpan]::FromSeconds([Math]::Max(2, $Seconds))
        $this.HideTimer.Start()
    }
    $controller | Add-Member -MemberType ScriptMethod -Name MinimizeToTray -Value {
        try {
            $this.HideSpeech()
            $this.Window.Hide()
            if ($null -ne $this.Tray) {
                $this.Tray.Visible = $true
                $this.Tray.ShowBalloonTip(1800, "The Lawnmower Man", "I’m still keeping an eye on Urban Yards.", [System.Windows.Forms.ToolTipIcon]::Info)
            }
        } catch { $this.ReportFailure("MinimizeToTray", $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name RestoreFromTray -Value {
        try {
            $this.Window.Show()
            $this.Window.Activate()
            $this.Window.Topmost = [bool]$this.Config.alwaysOnTop
            $this.InvokeAction("RestoreAction")
        } catch { $this.ReportFailure("RestoreFromTray", $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Dispose -Value {
        $this.HideTimer.Stop()
        if ($null -ne $this.Tray) { $this.Tray.Visible = $false; $this.Tray.Dispose(); $this.Tray = $null }
        if ($null -ne $this.TrayMenu) { $this.TrayMenu.Dispose(); $this.TrayMenu = $null }
    }

    $hideTimer.Tag = $controller
    $hideTimer.Add_Tick({ param($sender, $eventArgs); $sender.Tag.HideSpeech() })
    $speechAction.Tag = $controller
    $speechAction.Add_Click({
        param($sender, $eventArgs)
        $instance = $sender.Tag
        $instance.HideSpeech()
        $instance.InvokeAction("OpenRouteAction", $instance.CurrentRoute, $true)
    })

    if (Test-Path -LiteralPath $TrayIconPath) {
        $tray = [System.Windows.Forms.NotifyIcon]::new()
        $tray.Icon = [System.Drawing.Icon]::new($TrayIconPath)
        $tray.Text = "The Lawnmower Man"
        # Keep the tray control available in both floating and shelf modes so the
        # pet can always be recovered even while normal windows cover the desktop.
        $tray.Visible = $true
        $menu = [System.Windows.Forms.ContextMenuStrip]::new()
        $alertsItem = $menu.Items.Add("SHOW ALERTS")
        $bringForwardItem = $menu.Items.Add("BRING FORWARD")
        $returnToShelfItem = $menu.Items.Add("SEND TO SHELF")
        $hideItem = $menu.Items.Add("Hide Lawnmower Man")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $askItem = $menu.Items.Add("Ask Lawnmower Man")
        $openItem = $menu.Items.Add("Open Urban Yards")
        $pauseItem = $menu.Items.Add("Pause")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $exitItem = $menu.Items.Add("Exit")
        $tray.ContextMenuStrip = $menu
        foreach ($item in @($alertsItem, $bringForwardItem, $returnToShelfItem, $hideItem, $askItem, $openItem, $pauseItem, $exitItem)) { $item.Tag = $controller }
        $tray.Tag = $controller
        $alertsItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ShowAlertsAction") })
        $bringForwardItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("BringForwardAction") })
        $returnToShelfItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ReturnToShelfAction") })
        $hideItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.MinimizeToTray() })
        $askItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("AskAction") })
        $openItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("OpenRouteAction", "overview", $true) })
        $pauseItem.Add_Click({
            param($sender,$eventArgs)
            $instance = $sender.Tag
            $instance.IsPaused = -not $instance.IsPaused
            $sender.Text = if ($instance.IsPaused) { "Resume" } else { "Pause" }
            $instance.InvokeAction("TogglePauseAction", $instance.IsPaused, $true)
        })
        $exitItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ExitAction") })
        $tray.Add_DoubleClick({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ShowAlertsAction") })
        $controller.Tray = $tray
        $controller.TrayMenu = $menu
    }
    return $controller
}
