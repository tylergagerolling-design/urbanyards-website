Set-StrictMode -Version Latest

function Import-UyXaml {
    param([Parameter(Mandatory = $true)][string]$Path)
    [xml]$xaml = Get-Content -LiteralPath $Path -Raw
    return [System.Windows.Markup.XamlReader]::Load([System.Xml.XmlNodeReader]::new($xaml))
}

function Set-UyWindowIcon {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)][string]$ProjectRoot
    )
    $iconPath = Join-Path $ProjectRoot "assets\icons\lawnmower-man-app.ico"
    if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) { return }
    $stream = [System.IO.File]::OpenRead($iconPath)
    try {
        $decoder = [System.Windows.Media.Imaging.IconBitmapDecoder]::new(
            $stream,
            [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,
            [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
        )
        $Window.Icon = $decoder.Frames | Sort-Object PixelWidth -Descending | Select-Object -First 1
    }
    finally { $stream.Dispose() }
}

function Add-UyChatMessage {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Controls.StackPanel]$Panel,
        [Parameter(Mandatory = $true)][string]$Text,
        [ValidateSet("user", "assistant", "error")][string]$Role
    )
    $border = [System.Windows.Controls.Border]::new()
    $border.CornerRadius = [System.Windows.CornerRadius]::new(14)
    $border.Padding = [System.Windows.Thickness]::new(14)
    $border.Margin = if ($Role -eq "user") { [System.Windows.Thickness]::new(48, 0, 0, 12) } else { [System.Windows.Thickness]::new(0, 0, 48, 12) }
    $border.Background = if ($Role -eq "user") { [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(28, 106, 72)) } elseif ($Role -eq "error") { [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(255, 237, 232)) } else { [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(238, 245, 234)) }
    $block = [System.Windows.Controls.TextBlock]::new()
    $block.Text = $Text
    $block.TextWrapping = [System.Windows.TextWrapping]::Wrap
    $block.FontSize = 14
    $block.Foreground = if ($Role -eq "user") { [System.Windows.Media.Brushes]::White } elseif ($Role -eq "error") { [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(130, 35, 25)) } else { [System.Windows.Media.SolidColorBrush]::new([System.Windows.Media.Color]::FromRgb(23, 58, 43)) }
    $border.Child = $block
    [void]$Panel.Children.Add($border)
    return $border
}

function Show-UyChatWindow {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)]$PetController,
        [Parameter(Mandatory = $true)][string[]]$AllowedStates,
        [Parameter(Mandatory = $true)]$EventController
    )
    $window = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\ChatPopup.xaml")
    Set-UyWindowIcon -Window $window -ProjectRoot $ProjectRoot
    $header = $window.FindName("ChatHeader")
    $close = $window.FindName("ChatClose")
    $input = $window.FindName("ChatInput")
    $send = $window.FindName("ChatSend")
    $openFull = $window.FindName("OpenFullAi")
    $messages = $window.FindName("MessagesPanel")
    $scroll = $window.FindName("ChatScroll")
    $history = [System.Collections.Generic.List[object]]::new()
    $chatState = [pscustomobject]@{
        Window = $window; Config = $Config; PetController = $PetController; AllowedStates = $AllowedStates
        EventController = $EventController; Input = $input; SendButton = $send; Messages = $messages
        Scroll = $scroll; History = $history; IsSending = $false
    }
    $chatState | Add-Member -MemberType ScriptMethod -Name SendMessage -Value {
        $text = $this.Input.Text.Trim()
        if (-not $text -or $this.IsSending) { return }
        [void](Add-UyChatMessage -Panel $this.Messages -Text $text -Role "user")
        $this.History.Add([pscustomobject]@{ role = "user"; content = $text })
        $this.Input.Clear()
        $this.IsSending = $true
        $this.SendButton.IsEnabled = $false
        $this.Input.IsEnabled = $false
        [void]$this.PetController.SetState("thinking", "normal", 0)
        $status = Add-UyChatMessage -Panel $this.Messages -Text "Checking Urban Yards…" -Role "assistant"
        $this.Scroll.ScrollToEnd()
        try {
            $response = Invoke-UyLawnmowerMan -Config $this.Config -Message $text -History @($this.History) -AllowedStates $this.AllowedStates
            [void]$this.Messages.Children.Remove($status)
            [void](Add-UyChatMessage -Panel $this.Messages -Text $response.reply -Role "assistant")
            $this.History.Add([pscustomobject]@{ role = "assistant"; content = $response.reply })
            if ($response.pet) {
                [void](Send-PetEvent -Controller $this.EventController -Type $response.pet.state -Severity $response.pet.severity -Message $response.pet.speech -ActionLabel $(if ($response.action) { $response.action.label } else { "OPEN URBAN YARDS" }) -Route $(if ($response.action) { $response.action.route } else { "overview" }) -Force)
            }
            else { $this.PetController.SetState("celebrate", "normal", 5) }
        }
        catch {
            [void]$this.Messages.Children.Remove($status)
            [void](Add-UyChatMessage -Panel $this.Messages -Text $_.Exception.Message -Role "error")
            Write-UyPetLog "AI request failed: $($_.Exception.Message)" "WARN"
            $this.PetController.ReturnToIdle()
        }
        finally {
            $this.IsSending = $false
            $this.SendButton.IsEnabled = $true
            $this.Input.IsEnabled = $true
            $this.Input.Focus()
            $this.Scroll.ScrollToEnd()
        }
    }
    foreach ($control in @($header, $close, $openFull, $send, $input)) { $control.Tag = $chatState }
    $window.Tag = $chatState
    $header.Add_MouseLeftButtonDown({ param($sender,$eventArgs); if ($eventArgs.ChangedButton -eq [System.Windows.Input.MouseButton]::Left) { try { $sender.Tag.Window.DragMove() } catch {} } })
    $close.Add_Click({ param($sender,$eventArgs); $sender.Tag.Window.Close() })
    $openFull.Add_Click({ param($sender,$eventArgs); Open-UyDashboardRoute -Config $sender.Tag.Config -Route "ai" })
    $send.Add_Click({ param($sender,$eventArgs); $sender.Tag.SendMessage() })
    $input.Add_KeyDown({ param($sender,$eventArgs); if ($eventArgs.Key -eq [System.Windows.Input.Key]::Enter -and [System.Windows.Input.Keyboard]::Modifiers -ne [System.Windows.Input.ModifierKeys]::Shift) { $eventArgs.Handled = $true; $sender.Tag.SendMessage() } })
    $window.Add_Closed({ param($sender,$eventArgs); $sender.Tag.PetController.ReturnToIdle() })
    [void]$window.Show()
    $window.Activate()
    $input.Focus()
    return $window
}

function Show-UySettingsWindow {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)]$Window,
        [Parameter(Mandatory = $true)]$Animation,
        [Parameter(Mandatory = $true)]$PetController,
        [Parameter(Mandatory = $true)]$DesktopLayer,
        [Parameter(Mandatory = $true)]$Notification,
        [Parameter(Mandatory = $true)]$Polling,
        [Parameter(Mandatory = $true)][string[]]$AllowedStates
    )
    $settings = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\SettingsWindow.xaml")
    Set-UyWindowIcon -Window $settings -ProjectRoot $ProjectRoot
    $get = { param($name) $settings.FindName($name) }
    $launch = & $get "LaunchWithWindows"
    $top = & $get "AlwaysOnTop"
    $displayMode = & $get "DisplayMode"
    $animations = & $get "AnimationsEnabled"
    $wander = & $get "WanderingEnabled"
    $speech = & $get "SpeechEnabled"
    $sounds = & $get "SoundsEnabled"
    $speed = & $get "AnimationSpeed"
    $poll = & $get "PollingInterval"
    $dashboard = & $get "DashboardUrl"
    $notice = & $get "ConnectionNoticeText"
    $connectionStatus = & $get "ConnectionStatusText"
    $connectionEmail = & $get "ConnectionEmail"
    $connectionPassword = & $get "ConnectionPassword"
    $connectButton = & $get "ConnectUrbanYards"
    $disconnectButton = & $get "DisconnectUrbanYards"
    $debug = & $get "DebugState"
    $launch.IsChecked = [bool]$Config.launchWithWindows
    $top.IsChecked = [bool]$Config.alwaysOnTop
    foreach ($item in $displayMode.Items) {
        if ([string]$item.Tag -eq [string]$Config.displayMode) { $displayMode.SelectedItem = $item; break }
    }
    if ($displayMode.SelectedIndex -lt 0) { $displayMode.SelectedIndex = 0 }
    $animations.IsChecked = [bool]$Config.animationsEnabled
    $wander.IsChecked = [bool]$Config.wanderingEnabled
    $speech.IsChecked = [bool]$Config.speechEnabled
    $sounds.IsChecked = [bool]$Config.soundsEnabled
    $speed.Value = [double]$Config.animationSpeed
    $poll.Text = [string]$Config.pollIntervalSeconds
    $dashboard.Text = [string]$Config.dashboardUrl
    $connectedEmail = Get-UyPetConnectedEmail
    $connectionEmail.Text = $connectedEmail
    $connectionStatus.Text = if ($connectedEmail) { "Connected as $connectedEmail." } else { "Not connected. Sign in with the same account you use for the Urban Yards dashboard." }
    $disconnectButton.IsEnabled = [bool]$connectedEmail
    $notice.Text = if (Test-UyConnectivityConfigured -Config $Config) { "Urban Yards data and compact chat are connected. The session is protected for this Windows account." } else { "Local mode is active. The pet still animates and opens dashboard pages. Use Connect to Urban Yards below to enable live notifications and compact chat." }
    $connectButton.Add_Click(({
        $connectButton.IsEnabled = $false
        $connectionStatus.Text = "Connecting to Urban Yards..."
        try {
            $session = Connect-UyPetToUrbanYards -Config $Config -Email $connectionEmail.Text -Password $connectionPassword.Password
            $connectionPassword.Clear()
            $connectionStatus.Text = "Connected as $($session.email)."
            $notice.Text = "Urban Yards data and compact chat are connected. The session is protected for this Windows account."
            $disconnectButton.IsEnabled = $true
            $Polling.Poll()
            $Notification.ShowSpeech("Urban Yards connected.", "OPEN HOME", "overview", 6)
        }
        catch {
            $connectionStatus.Text = $_.Exception.Message
        }
        finally { $connectButton.IsEnabled = $true }
    }).GetNewClosure())
    $disconnectButton.Add_Click(({
        Remove-UyPetAuthSession
        $connectionPassword.Clear()
        $connectionStatus.Text = "Not connected. Sign in with the same account you use for the Urban Yards dashboard."
        $notice.Text = "Local mode is active. Use Connect to Urban Yards to enable live notifications and compact chat."
        $disconnectButton.IsEnabled = $false
        $Notification.ShowSpeech("Urban Yards disconnected. Local mode is still available.", "", "", 6)
    }).GetNewClosure())
    foreach ($state in $AllowedStates) { [void]$debug.Items.Add($state) }
    $debug.SelectedItem = "idle_blink"
    (& $get "ResetPosition").Add_Click(({ Reset-UyPetPosition; Set-UyDefaultWindowPosition -Window $Window; $Notification.ShowSpeech("Position reset.", "", "", 4) }).GetNewClosure())
    (& $get "TestNotification").Add_Click(({ $Notification.ShowSpeech("Three follow-ups need attention.", "VIEW LEADS", "leads", 8) }).GetNewClosure())
    (& $get "TestAnimation").Add_Click(({ if ($debug.SelectedItem) { $PetController.SetState([string]$debug.SelectedItem, "normal", 7) } }).GetNewClosure())
    (& $get "CancelSettings").Add_Click(({ $settings.Close() }).GetNewClosure())
    (& $get "SaveSettings").Add_Click(({
        $interval = 45
        if (-not [int]::TryParse($poll.Text, [ref]$interval)) { $interval = 45 }
        $Config.launchWithWindows = [bool]$launch.IsChecked
        $Config.alwaysOnTop = [bool]$top.IsChecked
        $Config.displayMode = [string]$displayMode.SelectedItem.Tag
        $Config.animationsEnabled = [bool]$animations.IsChecked
        $Config.wanderingEnabled = [bool]$wander.IsChecked
        $Config.speechEnabled = [bool]$speech.IsChecked
        $Config.soundsEnabled = [bool]$sounds.IsChecked
        $Config.animationSpeed = [double]$speed.Value
        $Config.pollIntervalSeconds = [Math]::Min(300, [Math]::Max(30, $interval))
        if (-not [string]::IsNullOrWhiteSpace($dashboard.Text)) { $Config.dashboardUrl = $dashboard.Text.Trim() }
        Save-UyPetConfig -Config $Config
        Set-UyStartupRegistration -Enabled ([bool]$Config.launchWithWindows) -LauncherPath (Join-Path $ProjectRoot "Launch Urban Yards Pet.cmd") -IconPath (Join-Path $ProjectRoot "assets\icons\lawnmower-man-app.ico")
        if ($Config.displayMode -eq "shelf") { $DesktopLayer.ReturnToShelf($false) } else { $DesktopLayer.BringForward($false) }
        $Animation.SetSpeed([double]$Config.animationSpeed)
        $Animation.SetPaused(-not [bool]$Config.animationsEnabled)
        $Polling.ApplyInterval()
        $settings.Close()
        $Notification.ShowSpeech("Settings saved.", "", "", 4)
    }).GetNewClosure())
    [void]$settings.ShowDialog()
}

function New-UyPetWindow {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [Parameter(Mandatory = $true)]$Config,
        [switch]$SmokeTest,
        [switch]$TrayOnly,
        [Threading.EventWaitHandle]$BringForwardEvent
    )
    $window = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\PetWindow.xaml")
    Set-UyWindowIcon -Window $window -ProjectRoot $ProjectRoot
    $petImage = $window.FindName("PetImage")
    $petGlow = $window.FindName("PetGlow")
    $petShadow = $window.FindName("PetShadow")
    $menuPopup = $window.FindName("MenuPopup")
    $speechPopup = $window.FindName("SpeechPopup")
    $speechText = $window.FindName("SpeechText")
    $speechAction = $window.FindName("SpeechAction")
    $menu = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\PetMenu.xaml")
    $menuPopup.Child = $menu
    $window.Topmost = [bool]$Config.alwaysOnTop
    $desktopLayer = New-UyDesktopLayerController -Window $window -Config $Config

    $manifestPath = Join-Path $ProjectRoot "config\sprite-manifest.json"
    $spriteDirectory = Join-Path $ProjectRoot "assets\sprites"
    $animation = New-UyAnimationController -ImageControl $petImage -ManifestPath $manifestPath -SpriteDirectory $spriteDirectory -Speed ([double]$Config.animationSpeed)
    if (-not [bool]$Config.animationsEnabled) { $animation.SetPaused($true) }
    $petController = New-UyPetController -Window $window -Animation $animation -Config $Config
    $manifest = $animation.Manifest
    $allowedStates = @($manifest.allowedStates)
    $allowedEventTypes = @($allowedStates + @($manifest.eventStateMap.PSObject.Properties.Name) | Select-Object -Unique)
    $global:UyPetExitRequested = $false
    $script:UyChatWindow = $null
    $polling = $null
    $notification = $null
    $eventController = $null
    $runtimeContext = [hashtable]::Synchronized(@{
        ProjectRoot = $ProjectRoot; Config = $Config; Window = $window; DesktopLayer = $desktopLayer
        PetController = $petController; Animation = $animation; AllowedStates = $allowedStates
        Menu = $menu; MenuPopup = $menuPopup; PetGlow = $petGlow; BringForwardEvent = $BringForwardEvent
        EventController = $null; Polling = $null; Notification = $null; MouseState = $null
    })
    # The pet is single-instance. Delayed WPF and tray callbacks resolve this
    # persistent state instead of depending on function-local PowerShell closures.
    $script:UyPetRuntimeState = $runtimeContext
    $bringForwardTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $bringForwardTimer.Interval = [TimeSpan]::FromMilliseconds(350)

    $openRoute = { param([string]$route) Open-UyDashboardRoute -Config $script:UyPetRuntimeState.Config -Route $route }
    $ask = {
        if ($null -ne $script:UyChatWindow -and $script:UyChatWindow.IsVisible) { $script:UyChatWindow.Activate(); return }
        $state = $script:UyPetRuntimeState
        $script:UyChatWindow = Show-UyChatWindow -ProjectRoot $state.ProjectRoot -Config $state.Config -PetController $state.PetController -AllowedStates $state.AllowedStates -EventController $state.EventController
    }
    $togglePause = { param([bool]$paused); $state = $script:UyPetRuntimeState; $state.PetController.Pause($paused); if ($state.Polling) { $state.Polling.SetPaused($paused) } }
    $restore = { $state = $script:UyPetRuntimeState; if ($state.Polling) { $state.Polling.SetPaused($false) } }
    $exit = {
        $global:UyPetExitRequested = $true
        if ([System.Windows.Application]::Current) { [System.Windows.Application]::Current.Shutdown(0) }
        [System.Windows.Forms.Application]::ExitThread()
    }
    $bringForwardTimer.Add_Tick({
        $state = $script:UyPetRuntimeState
        if ($state.BringForwardEvent -and $state.BringForwardEvent.WaitOne(0)) {
            $state.DesktopLayer.BringForward($true)
            if ($state.Polling) { $state.Polling.SetPaused($false) }
        }
    })
    $bringForwardTimer.Start()

    $trayIconPath = Join-Path $ProjectRoot "assets\icons\lawnmower-man-app.ico"
    $bringForward = { $script:UyPetRuntimeState.DesktopLayer.BringForward($true) }
    $returnToShelf = { $script:UyPetRuntimeState.DesktopLayer.ReturnToShelf($true) }
    $showAlerts = {
        $state = $script:UyPetRuntimeState
        $state.DesktopLayer.BringForward($false)
        if ($state.Notification) {
            $state.Notification.ShowSpeech("I’m watching Urban Yards. No unread alerts right now.", "OPEN URBAN YARDS", "overview", 8)
        }
    }
    $notification = New-UyNotificationController -Window $window -SpeechPopup $speechPopup -SpeechText $speechText -SpeechAction $speechAction -Config $Config -TrayIconPath $trayIconPath -OpenRoute $openRoute -Restore $restore -Ask $ask -ShowAlerts $showAlerts -BringForward $bringForward -ReturnToShelf $returnToShelf -TogglePause $togglePause -Exit $exit
    $runtimeContext.Notification = $notification
    $eventController = New-UyEventController -AllowedStates $allowedEventTypes -CooldownMinutes ([int]$Config.notificationCooldownMinutes) -OnEvent {
        param($event)
        $state = $script:UyPetRuntimeState
        $duration = if ($event.type -in @("overdue", "weather", "busyDay")) { 12 } else { 8 }
        $visualState = [string]$event.type
        if ($state.AllowedStates -notcontains $visualState) {
            $mapping = $state.Animation.Manifest.eventStateMap.PSObject.Properties[$visualState]
            $visualState = if ($null -ne $mapping) { [string]$mapping.Value } else { "attention" }
        }
        $state.PetController.SetState($visualState, [string]$event.severity, $duration)
        if ($event.message) { $state.Notification.ShowSpeech([string]$event.message, [string]$event.action.label, [string]$event.action.route, $duration) }
    }
    $runtimeContext.EventController = $eventController

    $polling = New-UyPollingController -Config $Config -OnSnapshot {
        param($snapshot)
        $state = $script:UyPetRuntimeState
        $connectionText = $state.Menu.FindName("ConnectionStatus")
        $connectionText.Text = if (-not $snapshot.configured) { "LOCAL MODE" } elseif ($snapshot.online) { "ONLINE" } else { "RECONNECTING" }
        foreach ($event in @($snapshot.events)) { [void]$state.EventController.Publish($event, $false) }
        if (-not $snapshot.online -and $snapshot.configured -and $state.Polling.Failures -eq 1) { $state.Notification.ShowSpeech("Urban Yards is offline. I’ll keep trying.", "", "", 7) }
    }
    $runtimeContext.Polling = $polling
    $polling.Start()

    $savedState = Get-UyPetWindowState
    if ($savedState -and $savedState.PSObject.Properties["left"] -and $savedState.PSObject.Properties["top"]) {
        $window.Left = [double]$savedState.left
        $window.Top = [double]$savedState.top
        # A saved position can be invalid after DPI, resolution, or monitor changes.
        # Defer the authoritative clamp until WPF has created the HWND and knows DPI.
    }
    else { Set-UyDefaultWindowPosition -Window $window }

    $mouseState = [hashtable]::Synchronized(@{ LeftDownAt = [DateTime]::MinValue; DragStarted = $false; DoubleClick = $false })
    $runtimeContext.MouseState = $mouseState
    $petImage.Add_MouseEnter({
        $state = $script:UyPetRuntimeState
        if (-not $state.PetController.IsDragging) { $state.PetGlow.Opacity = 0.9 }
    })
    $petImage.Add_MouseLeave({
        $state = $script:UyPetRuntimeState
        if (-not $state.PetController.IsDragging -and -not $state.PetController.TemporaryState) { [void]$state.Animation.SetState("idle_blink", "normal", $true); $state.PetGlow.Opacity = 0 }
    })
    $petImage.Add_MouseLeftButtonDown({
        param($sender,$eventArgs)
        $state = $script:UyPetRuntimeState
        $state.MouseState.LeftDownAt = [DateTime]::UtcNow
        $state.MouseState.DragStarted = $false
        $state.MouseState.DoubleClick = $eventArgs.ClickCount -ge 2
        if ($state.MouseState.DoubleClick) {
            $state.MenuPopup.IsOpen = $false
            $state.Notification.InvokeAction("AskAction")
            $eventArgs.Handled = $true
            return
        }
        $state.PetController.Touch()
        $state.PetController.IsDragging = $true
        [void]$state.Animation.SetState("working", "normal", $true)
        try { $state.Window.DragMove(); $state.MouseState.DragStarted = ([DateTime]::UtcNow - $state.MouseState.LeftDownAt).TotalMilliseconds -gt 180 } catch {}
        $state.PetController.IsDragging = $false
        Set-UyWindowWithinScreens -Window $state.Window
        Save-UyPetWindowState -Left $state.Window.Left -Top $state.Window.Top
        if ($state.MouseState.DragStarted) { [void]$state.Animation.SetState("idle_blink", "normal", $true) }
    })
    $petImage.Add_MouseLeftButtonUp({
        param($sender,$eventArgs)
        $state = $script:UyPetRuntimeState
        if (-not $state.MouseState.DoubleClick -and -not $state.MouseState.DragStarted -and ([DateTime]::UtcNow - $state.MouseState.LeftDownAt).TotalMilliseconds -lt 550) {
            $state.PetController.SetState("attention", "normal", 2)
            $state.MenuPopup.IsOpen = -not $state.MenuPopup.IsOpen
        }
    })

    $menuButtonRoutes = @{ AttentionButton = "tickets"; ScheduleButton = "work"; RoutesButton = "routes"; LeadsButton = "leads"; DashboardButton = "overview" }
    foreach ($pair in $menuButtonRoutes.GetEnumerator()) {
        $button = $menu.FindName($pair.Key)
        $button.Tag = $pair.Value
        $button.Add_Click({ param($sender,$eventArgs); $script:UyPetRuntimeState.MenuPopup.IsOpen = $false; $script:UyPetRuntimeState.Notification.InvokeAction("OpenRouteAction", [string]$sender.Tag, $true) })
    }
    $menu.FindName("AskButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("AskAction") })
    $menu.FindName("ConnectButton").Add_Click({
        $state = $script:UyPetRuntimeState
        $state.MenuPopup.IsOpen = $false
        Show-UySettingsWindow -ProjectRoot $state.ProjectRoot -Config $state.Config -Window $state.Window -Animation $state.Animation -PetController $state.PetController -DesktopLayer $state.DesktopLayer -Notification $state.Notification -Polling $state.Polling -AllowedStates $state.AllowedStates
    })
    $menu.FindName("BringForwardButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("BringForwardAction") })
    $menu.FindName("ReturnToShelfButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("ReturnToShelfAction") })
    $menu.FindName("MinimizeButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Polling.SetPaused($true); $state.Notification.MinimizeToTray() })

    $context = [System.Windows.Controls.ContextMenu]::new()
    function Add-ContextItem([string]$Label, [string]$ActionName, [string]$Argument = "", [bool]$Checkable = $false, [bool]$Checked = $false) {
        $item = [System.Windows.Controls.MenuItem]::new()
        $item.Header = $Label; $item.IsCheckable = $Checkable; $item.IsChecked = $Checked
        $item.Tag = [pscustomobject]@{ ActionName = $ActionName; Argument = $Argument }
        $item.Add_Click({
            param($sender,$eventArgs)
            $state = $script:UyPetRuntimeState
            switch ([string]$sender.Tag.ActionName) {
                "ask" { $state.Notification.InvokeAction("AskAction") }
                "open" { $state.Notification.InvokeAction("OpenRouteAction", [string]$sender.Tag.Argument, $true) }
                "bring" { $state.Notification.InvokeAction("BringForwardAction") }
                "shelf" { $state.Notification.InvokeAction("ReturnToShelfAction") }
                "top" { $state.Config.alwaysOnTop = -not [bool]$state.Config.alwaysOnTop; $state.Window.Topmost = [bool]$state.Config.alwaysOnTop; $sender.IsChecked = [bool]$state.Config.alwaysOnTop; Save-UyPetConfig -Config $state.Config }
                "pause" { $paused = -not $state.Animation.IsPaused; $state.Notification.InvokeAction("TogglePauseAction", $paused, $true); $sender.IsChecked = $paused }
                "hide" { $state.Polling.SetPaused($true); $state.Notification.MinimizeToTray() }
                "settings" { Show-UySettingsWindow -ProjectRoot $state.ProjectRoot -Config $state.Config -Window $state.Window -Animation $state.Animation -PetController $state.PetController -DesktopLayer $state.DesktopLayer -Notification $state.Notification -Polling $state.Polling -AllowedStates $state.AllowedStates }
                "exit" { $state.Notification.InvokeAction("ExitAction") }
            }
        })
        [void]$context.Items.Add($item); return $item
    }
    [void](Add-ContextItem "Ask Lawnmower Man" "ask")
    [void](Add-ContextItem "Open Urban Yards" "open" "overview")
    [void](Add-ContextItem "Bring Forward" "bring")
    [void](Add-ContextItem "Return to Desktop Shelf" "shelf")
    [void](Add-ContextItem "Today's Work" "open" "work")
    [void](Add-ContextItem "Leads" "open" "leads")
    [void](Add-ContextItem "Tickets" "open" "tickets")
    [void](Add-ContextItem "Routes" "open" "routes")
    [void](Add-ContextItem "Money" "open" "money")
    [void]$context.Items.Add([System.Windows.Controls.Separator]::new())
    $topItem = Add-ContextItem "Keep On Top" "top" "" $true ([bool]$Config.alwaysOnTop)
    $pauseItem = Add-ContextItem "Pause Animations" "pause" "" $true $false
    [void](Add-ContextItem "Minimize to Tray" "hide")
    [void](Add-ContextItem "Connect Urban Yards / Settings" "settings")
    [void](Add-ContextItem "Exit" "exit")
    $petImage.ContextMenu = $context

    $window.Add_SourceInitialized(({
        try {
            $helper = [System.Windows.Interop.WindowInteropHelper]::new($window)
            $source = [System.Windows.Interop.HwndSource]::FromHwnd($helper.Handle)
            if ($source) { $source.CompositionTarget.BackgroundColor = [System.Windows.Media.Colors]::Transparent }
        } catch {}
    }).GetNewClosure())
    $window.Add_LocationChanged({ $state = $script:UyPetRuntimeState; if ($state.DesktopLayer.Mode -ne "shelf" -and -not $state.PetController.IsMoving -and -not $state.PetController.IsDragging) { Set-UyWindowWithinScreens -Window $state.Window } })
    $window.Add_Closing(({
        param($sender,$eventArgs)
        if (-not $global:UyPetExitRequested -and -not $SmokeTest) {
            $eventArgs.Cancel = $true
            $polling.SetPaused($true)
            $notification.MinimizeToTray()
        }
    }).GetNewClosure())
    $window.Add_Closed(({
        $polling.Stop(); $bringForwardTimer.Stop(); $petController.BehaviorTimer.Stop(); $petController.MoveTimer.Stop(); $petController.ReturnTimer.Stop(); $animation.Timer.Stop(); $notification.Dispose(); $desktopLayer.DetachForExit()
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        Write-UyPetLog "The Lawnmower Man exited."
    }).GetNewClosure())
    $window.Add_Loaded(({
        Write-UyPetLog "Pet window loaded."
        Set-UyWindowWithinScreens -Window $window
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        if (-not $TrayOnly) { $desktopLayer.ApplySavedMode() }
        $window.Tag = [pscustomobject]@{ loaded = $true; loadedAt = [DateTime]::UtcNow.ToString("o") }
        if (-not $TrayOnly -and -not (Test-UyConnectivityConfigured -Config $Config)) {
            $notification.ShowSpeech("Local mode is ready. Click me, then choose Connect Urban Yards.", "", "", 9)
        }
        if ($SmokeTest) {
            $notification.ShowSpeech("Smoke test: pet window, animation, and notification are working.", "", "", 3)
            # Exercise the actual delayed tray handlers. This covers the commands
            # users rely on without opening an external browser or account window.
            $featureState = [pscustomobject]@{ Step = 0; Notification = $notification; Window = $window }
            $featureTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $featureTimer.Tag = $featureState
            $featureTimer.Interval = [TimeSpan]::FromMilliseconds(550)
            $featureTimer.Add_Tick({
                param($sender,$eventArgs)
                $state = $sender.Tag
                switch ($state.Step) {
                    0 { $state.Notification.TrayMenu.Items[0].PerformClick() } # SHOW ALERTS
                    1 { $state.Notification.TrayMenu.Items[2].PerformClick() } # SEND TO SHELF
                    2 { $state.Notification.TrayMenu.Items[1].PerformClick() } # BRING FORWARD
                    3 { $state.Notification.TrayMenu.Items[7].PerformClick() } # PAUSE
                    4 { $state.Notification.TrayMenu.Items[7].PerformClick() } # RESUME
                    5 { $state.Notification.TrayMenu.Items[3].PerformClick() } # HIDE
                    6 { $state.Notification.TrayMenu.Items[1].PerformClick() } # RECOVER
                    7 { $state.Notification.TrayMenu.Items[9].PerformClick(); $sender.Stop(); return } # EXIT
                    default { $sender.Stop(); $global:UyPetExitRequested = $true; [System.Windows.Application]::Current.Shutdown(0); return }
                }
                $state.Step++
            })
            $featureTimer.Start()
            # Exercise the same LocationChanged and movement-completion callbacks
            # used by dragging and wandering, not only the initial window render.
            $petController.TargetLeft = $window.Left - 4
            $petController.MoveStep = -2
            $petController.IsMoving = $true
            $petController.MoveTimer.Start()
        }
        elseif (Test-UyConnectivityConfigured -Config $Config) { $polling.Poll() }
    }).GetNewClosure())

    if ($TrayOnly) {
        # WPF must create the native HWND so tray callbacks can show or attach it,
        # but the launcher leaves the visual pet hidden until a tray command asks for it.
        $window.Visibility = [System.Windows.Visibility]::Hidden
    }

    if ($SmokeTest) {
        $safetyTimer = [System.Windows.Threading.DispatcherTimer]::new()
        $safetyTimer.Interval = [TimeSpan]::FromSeconds(8)
        $safetyTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $global:UyPetExitRequested = $true; [System.Windows.Application]::Current.Shutdown(1) })
        $window.Add_Activated(({ if (-not $safetyTimer.IsEnabled) { $safetyTimer.Start() } }).GetNewClosure())
        if ($TrayOnly) {
            # Reproduce the installed launch path: the HWND has never been shown
            # when BRING FORWARD is first selected from the notification area.
            $trayStartupTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $trayStartupTimer.Interval = [TimeSpan]::FromMilliseconds(400)
            $trayStartupTimer.Tag = $notification
            $trayStartupTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $sender.Tag.TrayMenu.Items[1].PerformClick() })
            $trayStartupTimer.Start()
        }
    }

    return [pscustomobject]@{ Window = $window; Animation = $animation; PetController = $petController; DesktopLayer = $desktopLayer; EventController = $eventController; Notification = $notification; Polling = $polling }
}
