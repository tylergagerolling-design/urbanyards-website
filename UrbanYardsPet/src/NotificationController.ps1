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
        RestoreAction = $Restore
        SettingsAction = $Settings
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
        $bringForwardItem = $menu.Items.Add("BRING FORWARD")
        $returnToShelfItem = $menu.Items.Add("SEND TO SHELF")
        $hideItem = $menu.Items.Add("Hide Sprout")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $settingsItem = $menu.Items.Add("Settings")
        $pauseItem = $menu.Items.Add("Pause Animations")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $exitItem = $menu.Items.Add("Exit")
        $tray.ContextMenuStrip = $menu
        foreach ($item in @($bringForwardItem, $returnToShelfItem, $hideItem, $settingsItem, $pauseItem, $exitItem)) { $item.Tag = $controller }
        $tray.Tag = $controller
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
        $controller.Tray = $tray
        $controller.TrayMenu = $menu
    }
    return $controller
}
