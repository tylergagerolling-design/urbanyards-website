Set-StrictMode -Version Latest

function New-UyNotificationController {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$TrayIconPath,
        [Parameter(Mandatory = $true)][scriptblock]$Restore,
        [Parameter(Mandatory = $true)][scriptblock]$Settings,
        [Parameter(Mandatory = $true)][scriptblock]$BringForward,
        [Parameter(Mandatory = $true)][scriptblock]$ReturnToShelf,
        [Parameter(Mandatory = $true)][scriptblock]$TogglePause,
        [Parameter(Mandatory = $true)][scriptblock]$OpenLeads,
        [Parameter(Mandatory = $true)][scriptblock]$Exit
    )
    $controller = [pscustomobject]@{
        Window = $Window
        Config = $Config
        Tray = $null
        TrayMenu = $null
        IsPaused = $false
        ActionFailures = 0
        LastActionError = ""
        QuoteStatusItem = $null
        LastQuoteAlertCount = 0
        RestoreAction = $Restore
        SettingsAction = $Settings
        BringForwardAction = $BringForward
        ReturnToShelfAction = $ReturnToShelf
        TogglePauseAction = $TogglePause
        OpenLeadsAction = $OpenLeads
        ExitAction = $Exit
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ReportFailure -Value {
        param([string]$Operation, $Failure)
        $message = if ($Failure -is [System.Management.Automation.ErrorRecord]) { $Failure.Exception.Message } elseif ($Failure -is [Exception]) { $Failure.Message } else { [string]$Failure }
        $this.ActionFailures++
        $this.LastActionError = "$Operation`: $message"
        Write-UyPetLog "Pet control '$Operation' failed but Sprout stayed open: $message" "ERROR"
    }
    $controller | Add-Member -MemberType ScriptMethod -Name InvokeAction -Value {
        param([string]$ActionName, $Argument = $null, [bool]$HasArgument = $false)
        try {
            $property = $this.PSObject.Properties[$ActionName]
            if ($null -eq $property -or $null -eq $property.Value) { throw "Pet control '$ActionName' is unavailable." }
            $action = $property.Value
            if ($HasArgument) { & $action $Argument } else { & $action }
        }
        catch { $this.ReportFailure($ActionName, $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name MinimizeToTray -Value {
        try { $this.Window.Hide(); if ($null -ne $this.Tray) { $this.Tray.Visible = $true } }
        catch { $this.ReportFailure("MinimizeToTray", $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name RestoreFromTray -Value {
        try {
            $this.Window.Show()
            $this.Window.Activate()
            $this.Window.Topmost = [bool]$this.Config.alwaysOnTop
            $this.InvokeAction("RestoreAction")
        }
        catch { $this.ReportFailure("RestoreFromTray", $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetQuoteStatus -Value {
        param([string]$Status)
        if ($null -ne $this.QuoteStatusItem) { $this.QuoteStatusItem.Text = "Quote alerts: $Status" }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ShowQuoteNotification -Value {
        param([int]$Count)
        try {
            if ($Count -lt 1 -or $null -eq $this.Tray) { return }
            $this.LastQuoteAlertCount = $Count
            $this.Tray.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
            $this.Tray.BalloonTipTitle = if ($Count -eq 1) { "New online quote request" } else { "$Count new online quote requests" }
            $this.Tray.BalloonTipText = if ($Count -eq 1) {
                "Open Online Quote Requests & Leads to review it."
            } else {
                "Open Online Quote Requests & Leads to review them."
            }
            $this.Tray.ShowBalloonTip(12000)
        }
        catch { $this.ReportFailure("ShowQuoteNotification", $_) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Dispose -Value {
        if ($null -ne $this.Tray) { $this.Tray.Visible = $false; $this.Tray.Dispose(); $this.Tray = $null }
        if ($null -ne $this.TrayMenu) { $this.TrayMenu.Dispose(); $this.TrayMenu = $null }
    }

    if (Test-Path -LiteralPath $TrayIconPath) {
        $tray = [System.Windows.Forms.NotifyIcon]::new()
        $tray.Icon = [System.Drawing.Icon]::new($TrayIconPath)
        $tray.Text = "The Lawnmower Man"
        $tray.Visible = $true
        $menu = [System.Windows.Forms.ContextMenuStrip]::new()
        $openQuotesItem = $menu.Items.Add("OPEN QUOTE REQUESTS")
        $quoteStatusItem = $menu.Items.Add("Quote alerts: Not connected")
        $quoteStatusItem.Enabled = $false
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $bringForwardItem = $menu.Items.Add("BRING FORWARD")
        $returnToShelfItem = $menu.Items.Add("SEND TO SHELF")
        $hideItem = $menu.Items.Add("Hide Sprout")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $settingsItem = $menu.Items.Add("Settings")
        $pauseItem = $menu.Items.Add("Pause Animations")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $exitItem = $menu.Items.Add("Exit")
        $tray.ContextMenuStrip = $menu
        foreach ($item in @($openQuotesItem, $bringForwardItem, $returnToShelfItem, $hideItem, $settingsItem, $pauseItem, $exitItem)) { $item.Tag = $controller }
        $tray.Tag = $controller
        $openQuotesItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("OpenLeadsAction") })
        $bringForwardItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("BringForwardAction") })
        $returnToShelfItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ReturnToShelfAction") })
        $hideItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.MinimizeToTray() })
        $settingsItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("SettingsAction") })
        $pauseItem.Add_Click({
            param($sender,$eventArgs)
            $instance = $sender.Tag
            $instance.IsPaused = -not $instance.IsPaused
            $sender.Text = if ($instance.IsPaused) { "Resume Animations" } else { "Pause Animations" }
            $instance.InvokeAction("TogglePauseAction", $instance.IsPaused, $true)
        })
        $exitItem.Add_Click({ param($sender,$eventArgs); $sender.Tag.InvokeAction("ExitAction") })
        $tray.Add_DoubleClick({ param($sender,$eventArgs); $sender.Tag.InvokeAction("BringForwardAction") })
        $tray.Add_BalloonTipClicked({ param($sender,$eventArgs); $sender.Tag.InvokeAction("OpenLeadsAction") })
        $controller.Tray = $tray
        $controller.TrayMenu = $menu
        $controller.QuoteStatusItem = $quoteStatusItem
    }
    return $controller
}
