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
    }
    $controller | Add-Member -MemberType ScriptMethod -Name HideSpeech -Value {
        $this.HideTimer.Stop()
        $this.SpeechPopup.IsOpen = $false
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
        $this.HideSpeech()
        $this.Window.Hide()
        if ($null -ne $this.Tray) {
            $this.Tray.Visible = $true
            $this.Tray.ShowBalloonTip(1800, "The Lawnmower Man", "I’m still keeping an eye on Urban Yards.", [System.Windows.Forms.ToolTipIcon]::Info)
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name RestoreFromTray -Value {
        $this.Window.Show()
        $this.Window.Activate()
        $this.Window.Topmost = [bool]$this.Config.alwaysOnTop
        & $Restore
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Dispose -Value {
        $this.HideTimer.Stop()
        if ($null -ne $this.Tray) { $this.Tray.Visible = $false; $this.Tray.Dispose(); $this.Tray = $null }
        if ($null -ne $this.TrayMenu) { $this.TrayMenu.Dispose(); $this.TrayMenu = $null }
    }

    $hideTimer.Tag = $controller
    $hideTimer.Add_Tick({ param($sender, $eventArgs); $sender.Tag.HideSpeech() })
    $speechAction.Tag = $controller
    $speechAction.Add_Click(({ param($sender, $eventArgs); $instance = $sender.Tag; $instance.HideSpeech(); & $OpenRoute $instance.CurrentRoute }).GetNewClosure())

    if (Test-Path -LiteralPath $TrayIconPath) {
        $tray = [System.Windows.Forms.NotifyIcon]::new()
        $tray.Icon = [System.Drawing.Icon]::new($TrayIconPath)
        $tray.Text = "The Lawnmower Man"
        $tray.Visible = $false
        $menu = [System.Windows.Forms.ContextMenuStrip]::new()
        $showItem = $menu.Items.Add("Show Lawnmower Man")
        $askItem = $menu.Items.Add("Ask Lawnmower Man")
        $openItem = $menu.Items.Add("Open Urban Yards")
        $pauseItem = $menu.Items.Add("Pause")
        [void]$menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
        $exitItem = $menu.Items.Add("Exit")
        $tray.ContextMenuStrip = $menu
        $showItem.Add_Click(({ $controller.RestoreFromTray() }).GetNewClosure())
        $askItem.Add_Click(({ & $Ask }).GetNewClosure())
        $openItem.Add_Click(({ & $OpenRoute "overview" }).GetNewClosure())
        $pauseItem.Add_Click(({
            $controller.IsPaused = -not $controller.IsPaused
            $pauseItem.Text = if ($controller.IsPaused) { "Resume" } else { "Pause" }
            & $TogglePause $controller.IsPaused
        }).GetNewClosure())
        $exitItem.Add_Click(({ & $Exit }).GetNewClosure())
        $tray.Add_DoubleClick(({ $controller.RestoreFromTray() }).GetNewClosure())
        $controller.Tray = $tray
        $controller.TrayMenu = $menu
    }
    return $controller
}
