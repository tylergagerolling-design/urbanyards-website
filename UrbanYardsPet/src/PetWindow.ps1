Set-StrictMode -Version Latest

function Import-UyXaml {
    param([Parameter(Mandatory = $true)][string]$Path)
    [xml]$xaml = Get-Content -LiteralPath $Path -Raw
    return [System.Windows.Markup.XamlReader]::Load([System.Xml.XmlNodeReader]::new($xaml))
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
    $header = $window.FindName("ChatHeader")
    $close = $window.FindName("ChatClose")
    $input = $window.FindName("ChatInput")
    $send = $window.FindName("ChatSend")
    $openFull = $window.FindName("OpenFullAi")
    $messages = $window.FindName("MessagesPanel")
    $scroll = $window.FindName("ChatScroll")
    $history = [System.Collections.Generic.List[object]]::new()
    $header.Add_MouseLeftButtonDown(({ param($sender,$eventArgs); if ($eventArgs.ChangedButton -eq [System.Windows.Input.MouseButton]::Left) { $window.DragMove() } }).GetNewClosure())
    $close.Add_Click(({ $window.Close() }).GetNewClosure())
    $openFull.Add_Click(({ Open-UyDashboardRoute -Config $Config -Route "ai" }).GetNewClosure())
    $sendAction = {
        $text = $input.Text.Trim()
        if (-not $text -or -not $send.IsEnabled) { return }
        [void](Add-UyChatMessage -Panel $messages -Text $text -Role "user")
        $history.Add([pscustomobject]@{ role = "user"; content = $text })
        $input.Clear()
        $send.IsEnabled = $false
        $input.IsEnabled = $false
        [void]$PetController.SetState("thinking", "normal", 0)
        $status = Add-UyChatMessage -Panel $messages -Text "Checking Urban Yards…" -Role "assistant"
        $scroll.ScrollToEnd()
        try {
            $response = Invoke-UyLawnmowerMan -Config $Config -Message $text -History @($history) -AllowedStates $AllowedStates
            [void]$messages.Children.Remove($status)
            [void](Add-UyChatMessage -Panel $messages -Text $response.reply -Role "assistant")
            $history.Add([pscustomobject]@{ role = "assistant"; content = $response.reply })
            if ($response.pet) {
                [void](Send-PetEvent -Controller $EventController -Type $response.pet.state -Severity $response.pet.severity -Message $response.pet.speech -ActionLabel $(if ($response.action) { $response.action.label } else { "OPEN URBAN YARDS" }) -Route $(if ($response.action) { $response.action.route } else { "overview" }) -Force)
            }
            else { $PetController.SetState("foundSomething", "normal", 5) }
        }
        catch {
            [void]$messages.Children.Remove($status)
            [void](Add-UyChatMessage -Panel $messages -Text $_.Exception.Message -Role "error")
            Write-UyPetLog "AI request failed: $($_.Exception.Message)" "WARN"
            $PetController.ReturnToIdle()
        }
        finally {
            $send.IsEnabled = $true
            $input.IsEnabled = $true
            $input.Focus()
            $scroll.ScrollToEnd()
        }
    }.GetNewClosure()
    $send.Add_Click($sendAction)
    $input.Add_KeyDown(({ param($sender,$eventArgs); if ($eventArgs.Key -eq [System.Windows.Input.Key]::Enter -and [System.Windows.Input.Keyboard]::Modifiers -ne [System.Windows.Input.ModifierKeys]::Shift) { $eventArgs.Handled = $true; & $sendAction } }).GetNewClosure())
    $window.Add_Closed(({ $PetController.ReturnToIdle() }).GetNewClosure())
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
        [Parameter(Mandatory = $true)]$Notification,
        [Parameter(Mandatory = $true)]$Polling,
        [Parameter(Mandatory = $true)][string[]]$AllowedStates
    )
    $settings = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\SettingsWindow.xaml")
    $get = { param($name) $settings.FindName($name) }
    $launch = & $get "LaunchWithWindows"
    $top = & $get "AlwaysOnTop"
    $animations = & $get "AnimationsEnabled"
    $wander = & $get "WanderingEnabled"
    $speech = & $get "SpeechEnabled"
    $sounds = & $get "SoundsEnabled"
    $speed = & $get "AnimationSpeed"
    $poll = & $get "PollingInterval"
    $dashboard = & $get "DashboardUrl"
    $notice = & $get "ConnectionNoticeText"
    $debug = & $get "DebugState"
    $launch.IsChecked = [bool]$Config.launchWithWindows
    $top.IsChecked = [bool]$Config.alwaysOnTop
    $animations.IsChecked = [bool]$Config.animationsEnabled
    $wander.IsChecked = [bool]$Config.wanderingEnabled
    $speech.IsChecked = [bool]$Config.speechEnabled
    $sounds.IsChecked = [bool]$Config.soundsEnabled
    $speed.Value = [double]$Config.animationSpeed
    $poll.Text = [string]$Config.pollIntervalSeconds
    $dashboard.Text = [string]$Config.dashboardUrl
    $notice.Text = if (Test-UyConnectivityConfigured -Config $Config) { "Authenticated connectivity is configured through $($Config.accessTokenEnvironmentVariable). Secrets are never stored in this file." } else { "Local/demo mode is active. To enable Urban Yards data and compact chat, set the short-lived user access token environment variable $($Config.accessTokenEnvironmentVariable), then restart. The full dashboard AI remains available without copying credentials into this app." }
    foreach ($state in $AllowedStates) { [void]$debug.Items.Add($state) }
    $debug.SelectedItem = "idle"
    (& $get "ResetPosition").Add_Click(({ Reset-UyPetPosition; Set-UyDefaultWindowPosition -Window $Window; $Notification.ShowSpeech("Position reset.", "", "", 4) }).GetNewClosure())
    (& $get "TestNotification").Add_Click(({ $Notification.ShowSpeech("Three follow-ups need attention.", "VIEW LEADS", "leads", 8) }).GetNewClosure())
    (& $get "TestAnimation").Add_Click(({ if ($debug.SelectedItem) { $PetController.SetState([string]$debug.SelectedItem, "normal", 7) } }).GetNewClosure())
    (& $get "CancelSettings").Add_Click(({ $settings.Close() }).GetNewClosure())
    (& $get "SaveSettings").Add_Click(({
        $interval = 45
        if (-not [int]::TryParse($poll.Text, [ref]$interval)) { $interval = 45 }
        $Config.launchWithWindows = [bool]$launch.IsChecked
        $Config.alwaysOnTop = [bool]$top.IsChecked
        $Config.animationsEnabled = [bool]$animations.IsChecked
        $Config.wanderingEnabled = [bool]$wander.IsChecked
        $Config.speechEnabled = [bool]$speech.IsChecked
        $Config.soundsEnabled = [bool]$sounds.IsChecked
        $Config.animationSpeed = [double]$speed.Value
        $Config.pollIntervalSeconds = [Math]::Min(300, [Math]::Max(30, $interval))
        if (-not [string]::IsNullOrWhiteSpace($dashboard.Text)) { $Config.dashboardUrl = $dashboard.Text.Trim() }
        Save-UyPetConfig -Config $Config
        Set-UyStartupRegistration -Enabled ([bool]$Config.launchWithWindows) -LauncherPath (Join-Path $ProjectRoot "Launch Urban Yards Pet.cmd")
        $Window.Topmost = [bool]$Config.alwaysOnTop
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
        [switch]$SmokeTest
    )
    $window = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\PetWindow.xaml")
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

    $manifestPath = Join-Path $ProjectRoot "config\sprite-manifest.json"
    $spriteDirectory = Join-Path $ProjectRoot "assets\sprites"
    $animation = New-UyAnimationController -ImageControl $petImage -ManifestPath $manifestPath -SpriteDirectory $spriteDirectory -Speed ([double]$Config.animationSpeed)
    if (-not [bool]$Config.animationsEnabled) { $animation.SetPaused($true) }
    $petController = New-UyPetController -Window $window -Animation $animation -Config $Config
    $manifest = $animation.Manifest
    $allowedStates = @($manifest.allowedStates)
    $script:UyPetExitRequested = $false
    $script:UyChatWindow = $null
    $polling = $null
    $notification = $null
    $eventController = $null
    $runtimeContext = [hashtable]::Synchronized(@{ EventController = $null; Polling = $null })

    $openRoute = { param([string]$route) Open-UyDashboardRoute -Config $Config -Route $route }.GetNewClosure()
    $ask = {
        if ($null -ne $script:UyChatWindow -and $script:UyChatWindow.IsVisible) { $script:UyChatWindow.Activate(); return }
        $script:UyChatWindow = Show-UyChatWindow -ProjectRoot $ProjectRoot -Config $Config -PetController $petController -AllowedStates $allowedStates -EventController $runtimeContext.EventController
    }.GetNewClosure()
    $togglePause = { param([bool]$paused) $petController.Pause($paused); if ($runtimeContext.Polling) { $runtimeContext.Polling.SetPaused($paused) } }.GetNewClosure()
    $restore = { if ($runtimeContext.Polling) { $runtimeContext.Polling.SetPaused($false) } }.GetNewClosure()
    $exit = { $script:UyPetExitRequested = $true; $window.Close() }.GetNewClosure()

    $trayIconPath = Join-Path $ProjectRoot "assets\icons\urban-yards-pet.ico"
    $notification = New-UyNotificationController -Window $window -SpeechPopup $speechPopup -SpeechText $speechText -SpeechAction $speechAction -Config $Config -TrayIconPath $trayIconPath -OpenRoute $openRoute -Restore $restore -Ask $ask -TogglePause $togglePause -Exit $exit
    $eventController = New-UyEventController -AllowedStates $allowedStates -CooldownMinutes ([int]$Config.notificationCooldownMinutes) -OnEvent {
        param($event)
        $duration = if ($event.type -in @("overdue", "weather", "busyDay")) { 12 } else { 8 }
        $petController.SetState([string]$event.type, [string]$event.severity, $duration)
        if ($event.message) { $notification.ShowSpeech([string]$event.message, [string]$event.action.label, [string]$event.action.route, $duration) }
        if ($event.type -eq "payment") {
            $celebrateTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $celebrateTimer.Interval = [TimeSpan]::FromSeconds(5)
            $celebrateTimer.Add_Tick({ param($s,$e); $s.Stop(); $petController.SetState("celebrate", "normal", 7) })
            $celebrateTimer.Start()
        }
    }.GetNewClosure()
    $runtimeContext.EventController = $eventController

    $polling = New-UyPollingController -Config $Config -OnSnapshot {
        param($snapshot)
        $connectionText = $menu.FindName("ConnectionStatus")
        $connectionText.Text = if (-not $snapshot.configured) { "LOCAL MODE" } elseif ($snapshot.online) { "ONLINE" } else { "RECONNECTING" }
        foreach ($event in @($snapshot.events)) { [void]$eventController.Publish($event, $false) }
        if (-not $snapshot.online -and $snapshot.configured -and $polling.Failures -eq 1) { $notification.ShowSpeech("Urban Yards is offline. I’ll keep trying.", "", "", 7) }
    }.GetNewClosure()
    $runtimeContext.Polling = $polling
    $polling.Start()

    $savedState = Get-UyPetWindowState
    if ($savedState -and $savedState.PSObject.Properties["left"] -and $savedState.PSObject.Properties["top"]) {
        $window.Left = [double]$savedState.left
        $window.Top = [double]$savedState.top
        Set-UyWindowWithinScreens -Window $window
    }
    else { Set-UyDefaultWindowPosition -Window $window }

    $mouseState = [hashtable]::Synchronized(@{ LeftDownAt = [DateTime]::MinValue; DragStarted = $false; DoubleClick = $false })
    $petImage.Add_MouseEnter(({ if (-not $petController.IsDragging) { [void]$animation.SetState("hover", "normal", $false); $petGlow.Opacity = 0.9 } }).GetNewClosure())
    $petImage.Add_MouseLeave(({ if (-not $petController.IsDragging -and -not $petController.TemporaryState) { [void]$animation.SetState("idle", "normal", $true); $petGlow.Opacity = 0 } }).GetNewClosure())
    $petImage.Add_MouseLeftButtonDown(({
        param($sender,$eventArgs)
        $mouseState.LeftDownAt = [DateTime]::UtcNow
        $mouseState.DragStarted = $false
        $mouseState.DoubleClick = $eventArgs.ClickCount -ge 2
        if ($mouseState.DoubleClick) {
            $menuPopup.IsOpen = $false
            & $ask
            $eventArgs.Handled = $true
            return
        }
        $petController.Touch()
        $petController.IsDragging = $true
        [void]$animation.SetState("dragged", "normal", $true)
        try { $window.DragMove(); $mouseState.DragStarted = ([DateTime]::UtcNow - $mouseState.LeftDownAt).TotalMilliseconds -gt 180 } catch {}
        $petController.IsDragging = $false
        Set-UyWindowWithinScreens -Window $window
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        if ($mouseState.DragStarted) { [void]$animation.SetState("idle", "normal", $true) }
    }).GetNewClosure())
    $petImage.Add_MouseLeftButtonUp(({
        param($sender,$eventArgs)
        if (-not $mouseState.DoubleClick -and -not $mouseState.DragStarted -and ([DateTime]::UtcNow - $mouseState.LeftDownAt).TotalMilliseconds -lt 550) {
            $petController.SetState("clicked", "normal", 2)
            $menuPopup.IsOpen = -not $menuPopup.IsOpen
        }
    }).GetNewClosure())

    $menuButtonRoutes = @{ AttentionButton = "tickets"; ScheduleButton = "work"; RoutesButton = "routes"; LeadsButton = "leads"; DashboardButton = "overview" }
    foreach ($pair in $menuButtonRoutes.GetEnumerator()) {
        $button = $menu.FindName($pair.Key)
        $button.Tag = $pair.Value
        $button.Add_Click(({ param($sender,$eventArgs); $menuPopup.IsOpen = $false; & $openRoute ([string]$sender.Tag) }).GetNewClosure())
    }
    $menu.FindName("AskButton").Add_Click(({ $menuPopup.IsOpen = $false; & $ask }).GetNewClosure())
    $menu.FindName("MinimizeButton").Add_Click(({ $menuPopup.IsOpen = $false; $polling.SetPaused($true); $notification.MinimizeToTray() }).GetNewClosure())

    $context = [System.Windows.Controls.ContextMenu]::new()
    function Add-ContextItem([string]$Label, [scriptblock]$Action, [bool]$Checkable = $false, [bool]$Checked = $false) {
        $item = [System.Windows.Controls.MenuItem]::new(); $item.Header = $Label; $item.IsCheckable = $Checkable; $item.IsChecked = $Checked; $item.Add_Click($Action.GetNewClosure()); [void]$context.Items.Add($item); return $item
    }
    [void](Add-ContextItem "Ask Lawnmower Man" { & $ask })
    [void](Add-ContextItem "Open Urban Yards" { & $openRoute "overview" })
    [void](Add-ContextItem "Today's Work" { & $openRoute "work" })
    [void](Add-ContextItem "Leads" { & $openRoute "leads" })
    [void](Add-ContextItem "Tickets" { & $openRoute "tickets" })
    [void](Add-ContextItem "Routes" { & $openRoute "routes" })
    [void](Add-ContextItem "Money" { & $openRoute "money" })
    [void]$context.Items.Add([System.Windows.Controls.Separator]::new())
    $topItem = Add-ContextItem "Keep On Top" { $Config.alwaysOnTop = -not [bool]$Config.alwaysOnTop; $window.Topmost = [bool]$Config.alwaysOnTop; $topItem.IsChecked = [bool]$Config.alwaysOnTop; Save-UyPetConfig -Config $Config } $true ([bool]$Config.alwaysOnTop)
    $pauseItem = Add-ContextItem "Pause Animations" { $paused = -not $animation.IsPaused; & $togglePause $paused; $pauseItem.IsChecked = $paused } $true $false
    [void](Add-ContextItem "Minimize to Tray" { $polling.SetPaused($true); $notification.MinimizeToTray() })
    [void](Add-ContextItem "Settings" { Show-UySettingsWindow -ProjectRoot $ProjectRoot -Config $Config -Window $window -Animation $animation -PetController $petController -Notification $notification -Polling $polling -AllowedStates $allowedStates })
    [void](Add-ContextItem "Exit" { & $exit })
    $petImage.ContextMenu = $context

    $window.Add_SourceInitialized(({
        try {
            $helper = [System.Windows.Interop.WindowInteropHelper]::new($window)
            $source = [System.Windows.Interop.HwndSource]::FromHwnd($helper.Handle)
            if ($source) { $source.CompositionTarget.BackgroundColor = [System.Windows.Media.Colors]::Transparent }
        } catch {}
    }).GetNewClosure())
    $window.Add_LocationChanged(({ if (-not $petController.IsMoving -and -not $petController.IsDragging) { Set-UyWindowWithinScreens -Window $window } }).GetNewClosure())
    $window.Add_Closing(({
        param($sender,$eventArgs)
        if (-not $script:UyPetExitRequested -and -not $SmokeTest) {
            $eventArgs.Cancel = $true
            $polling.SetPaused($true)
            $notification.MinimizeToTray()
        }
    }).GetNewClosure())
    $window.Add_Closed(({
        $polling.Stop(); $petController.BehaviorTimer.Stop(); $petController.MoveTimer.Stop(); $petController.ReturnTimer.Stop(); $animation.Timer.Stop(); $notification.Dispose()
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        Write-UyPetLog "The Lawnmower Man exited."
    }).GetNewClosure())
    $window.Add_Loaded(({
        Write-UyPetLog "Pet window loaded."
        $window.Tag = [pscustomobject]@{ loaded = $true; loadedAt = [DateTime]::UtcNow.ToString("o") }
        if (-not (Test-UyConnectivityConfigured -Config $Config)) { $notification.ShowSpeech("Local mode is ready. Open Settings to connect Urban Yards.", "SETTINGS", "settings", 9) }
        if ($SmokeTest) {
            $notification.ShowSpeech("Smoke test: pet window, animation, and notification are working.", "", "", 3)
            $smokeTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $smokeTimer.Interval = [TimeSpan]::FromSeconds(3)
            $smokeTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $script:UyPetExitRequested = $true; $window.Close() })
            $smokeTimer.Start()
        }
        elseif (Test-UyConnectivityConfigured -Config $Config) { $polling.Poll() }
    }).GetNewClosure())

    if ($SmokeTest) {
        $safetyTimer = [System.Windows.Threading.DispatcherTimer]::new()
        $safetyTimer.Interval = [TimeSpan]::FromSeconds(5)
        $safetyTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $script:UyPetExitRequested = $true; if ($window.IsVisible) { $window.Close() } })
        $window.Add_Activated(({ if (-not $safetyTimer.IsEnabled) { $safetyTimer.Start() } }).GetNewClosure())
    }

    return [pscustomobject]@{ Window = $window; Animation = $animation; PetController = $petController; EventController = $eventController; Notification = $notification; Polling = $polling }
}
