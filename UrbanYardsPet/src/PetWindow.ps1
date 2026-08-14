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

function Show-UySettingsWindow {
    param(
        [Parameter(Mandatory = $true)][string]$ProjectRoot,
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)]$Window,
        [Parameter(Mandatory = $true)]$Animation,
        [Parameter(Mandatory = $true)]$PetController,
        [Parameter(Mandatory = $true)]$DesktopLayer,
        [Parameter(Mandatory = $true)][string[]]$AllowedStates
    )
    $settings = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\SettingsWindow.xaml")
    Set-UyWindowIcon -Window $settings -ProjectRoot $ProjectRoot
    $get = { param($name) $settings.FindName($name) }
    $launch = & $get "LaunchWithWindows"
    $top = & $get "AlwaysOnTop"
    $displayMode = & $get "DisplayMode"
    $animations = & $get "AnimationsEnabled"
    $speed = & $get "AnimationSpeed"
    $debug = & $get "DebugState"

    $launch.IsChecked = [bool]$Config.launchWithWindows
    $top.IsChecked = [bool]$Config.alwaysOnTop
    foreach ($item in $displayMode.Items) {
        if ([string]$item.Tag -eq [string]$Config.displayMode) { $displayMode.SelectedItem = $item; break }
    }
    if ($displayMode.SelectedIndex -lt 0) { $displayMode.SelectedIndex = 0 }
    $animations.IsChecked = [bool]$Config.animationsEnabled
    $speed.Value = [double]$Config.animationSpeed
    foreach ($state in $AllowedStates) { [void]$debug.Items.Add($state) }
    $debug.SelectedItem = "idle_blink"

    (& $get "ResetPosition").Add_Click(({
        Reset-UyPetPosition
        Set-UyDefaultWindowPosition -Window $Window
        Set-UyWindowWithinScreens -Window $Window
        Save-UyPetWindowState -Left $Window.Left -Top $Window.Top
    }).GetNewClosure())
    (& $get "TestAnimation").Add_Click(({
        if ($debug.SelectedItem) { $PetController.SetState([string]$debug.SelectedItem, "normal", 7) }
    }).GetNewClosure())
    (& $get "CancelSettings").Add_Click(({ $settings.Close() }).GetNewClosure())
    (& $get "SaveSettings").Add_Click(({
        $Config.launchWithWindows = [bool]$launch.IsChecked
        $Config.alwaysOnTop = [bool]$top.IsChecked
        $Config.displayMode = [string]$displayMode.SelectedItem.Tag
        $Config.animationsEnabled = [bool]$animations.IsChecked
        $Config.animationSpeed = [double]$speed.Value
        Save-UyPetConfig -Config $Config
        Set-UyStartupRegistration -Enabled ([bool]$Config.launchWithWindows) -LauncherPath (Join-Path $ProjectRoot "Launch Urban Yards Pet.cmd") -IconPath (Join-Path $ProjectRoot "assets\icons\lawnmower-man-app.ico")
        $Window.Topmost = [bool]$Config.alwaysOnTop
        if ($Config.displayMode -eq "shelf") { $DesktopLayer.ReturnToShelf($false) } else { $DesktopLayer.BringForward($false) }
        $Animation.SetSpeed([double]$Config.animationSpeed)
        $Animation.SetPaused(-not [bool]$Config.animationsEnabled)
        $settings.Close()
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
    $menuPopup = $window.FindName("MenuPopup")
    $menu = Import-UyXaml -Path (Join-Path $ProjectRoot "ui\PetMenu.xaml")
    $menuPopup.Child = $menu

    $manifestPath = Join-Path $ProjectRoot "config\sprite-manifest.json"
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $allowedStates = @($manifest.allowedStates | ForEach-Object { [string]$_ })
    $animation = New-UyAnimationController -ImageControl $petImage -ManifestPath $manifestPath -SpriteDirectory (Join-Path $ProjectRoot "assets\sprites") -Speed ([double]$Config.animationSpeed)
    $petController = New-UyPetController -Window $window -Animation $animation -Config $Config
    $desktopLayer = New-UyDesktopLayerController -Window $window -Config $Config
    $window.Topmost = [bool]$Config.alwaysOnTop
    if (-not [bool]$Config.animationsEnabled) { $animation.SetPaused($true) }
    $global:UyPetExitRequested = $false

    $runtimeContext = [pscustomobject]@{
        ProjectRoot = $ProjectRoot
        Config = $Config
        Window = $window
        Animation = $animation
        PetController = $petController
        DesktopLayer = $desktopLayer
        AllowedStates = $allowedStates
        MenuPopup = $menuPopup
        PetGlow = $petGlow
        Notification = $null
        MouseState = $null
        BringForwardEvent = $BringForwardEvent
    }
    $script:UyPetRuntimeState = $runtimeContext

    $exit = {
        $global:UyPetExitRequested = $true
        $script:UyPetRuntimeState.Window.Close()
        [System.Windows.Forms.Application]::ExitThread()
    }
    $bringForwardTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $bringForwardTimer.Interval = [TimeSpan]::FromMilliseconds(250)
    $bringForwardTimer.Tag = $runtimeContext
    $bringForwardTimer.Add_Tick({
        param($sender,$eventArgs)
        $state = $sender.Tag
        if ($state.BringForwardEvent -and $state.BringForwardEvent.WaitOne(0)) { $state.DesktopLayer.BringForward($true) }
    })
    $bringForwardTimer.Start()

    $bringForward = { $script:UyPetRuntimeState.DesktopLayer.BringForward($true) }
    $returnToShelf = { $script:UyPetRuntimeState.DesktopLayer.ReturnToShelf($true) }
    $restore = { $script:UyPetRuntimeState.DesktopLayer.BringForward($false) }
    $togglePause = { param([bool]$paused); $script:UyPetRuntimeState.PetController.Pause($paused) }
    $settingsAction = {
        $state = $script:UyPetRuntimeState
        $state.DesktopLayer.BringForward($false)
        Show-UySettingsWindow -ProjectRoot $state.ProjectRoot -Config $state.Config -Window $state.Window -Animation $state.Animation -PetController $state.PetController -DesktopLayer $state.DesktopLayer -AllowedStates $state.AllowedStates
    }
    $trayIconPath = Join-Path $ProjectRoot "assets\icons\lawnmower-man-app.ico"
    $notification = New-UyNotificationController -Window $window -Config $Config -TrayIconPath $trayIconPath -Restore $restore -Settings $settingsAction -BringForward $bringForward -ReturnToShelf $returnToShelf -TogglePause $togglePause -Exit $exit
    $runtimeContext.Notification = $notification

    $savedState = Get-UyPetWindowState
    if ($savedState -and $savedState.PSObject.Properties["left"] -and $savedState.PSObject.Properties["top"]) {
        $window.Left = [double]$savedState.left
        $window.Top = [double]$savedState.top
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
        if (-not $state.PetController.IsDragging -and -not $state.PetController.TemporaryState) {
            [void]$state.Animation.SetState("idle_blink", "normal", $true)
            $state.PetGlow.Opacity = 0
        }
    })
    $petImage.Add_MouseLeftButtonDown({
        param($sender,$eventArgs)
        $state = $script:UyPetRuntimeState
        $state.MouseState.LeftDownAt = [DateTime]::UtcNow
        $state.MouseState.DragStarted = $false
        $state.MouseState.DoubleClick = $eventArgs.ClickCount -ge 2
        if ($state.MouseState.DoubleClick) {
            $state.MenuPopup.IsOpen = $false
            $state.PetController.SetState("celebrate", "normal", 4)
            $eventArgs.Handled = $true
            return
        }
        $state.PetController.Touch()
        $state.PetController.IsDragging = $true
        [void]$state.Animation.SetState("working", "normal", $true)
        try {
            $state.Window.DragMove()
            $state.MouseState.DragStarted = ([DateTime]::UtcNow - $state.MouseState.LeftDownAt).TotalMilliseconds -gt 180
        }
        catch {}
        $state.PetController.IsDragging = $false
        Set-UyWindowWithinScreens -Window $state.Window
        Save-UyPetWindowState -Left $state.Window.Left -Top $state.Window.Top
        if ($state.MouseState.DragStarted) { [void]$state.Animation.SetState("idle_blink", "normal", $true) }
    })
    $petImage.Add_MouseLeftButtonUp({
        $state = $script:UyPetRuntimeState
        if (-not $state.MouseState.DoubleClick -and -not $state.MouseState.DragStarted -and ([DateTime]::UtcNow - $state.MouseState.LeftDownAt).TotalMilliseconds -lt 550) {
            $state.PetController.SetState("attention", "normal", 2)
            $state.MenuPopup.IsOpen = -not $state.MenuPopup.IsOpen
        }
    })

    $menu.FindName("BringForwardButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("BringForwardAction") })
    $menu.FindName("ReturnToShelfButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("ReturnToShelfAction") })
    $menu.FindName("SettingsButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.InvokeAction("SettingsAction") })
    $menu.FindName("MinimizeButton").Add_Click({ $state = $script:UyPetRuntimeState; $state.MenuPopup.IsOpen = $false; $state.Notification.MinimizeToTray() })

    $context = [System.Windows.Controls.ContextMenu]::new()
    function Add-ContextItem([string]$Label, [string]$ActionName, [bool]$Checkable = $false, [bool]$Checked = $false) {
        $item = [System.Windows.Controls.MenuItem]::new()
        $item.Header = $Label
        $item.IsCheckable = $Checkable
        $item.IsChecked = $Checked
        $item.Tag = $ActionName
        $item.Add_Click({
            param($sender,$eventArgs)
            $state = $script:UyPetRuntimeState
            switch ([string]$sender.Tag) {
                "bring" { $state.Notification.InvokeAction("BringForwardAction") }
                "shelf" { $state.Notification.InvokeAction("ReturnToShelfAction") }
                "top" { $state.Config.alwaysOnTop = -not [bool]$state.Config.alwaysOnTop; $state.Window.Topmost = [bool]$state.Config.alwaysOnTop; $sender.IsChecked = [bool]$state.Config.alwaysOnTop; Save-UyPetConfig -Config $state.Config }
                "pause" { $paused = -not $state.Animation.IsPaused; $state.Notification.InvokeAction("TogglePauseAction", $paused, $true); $sender.IsChecked = $paused }
                "hide" { $state.Notification.MinimizeToTray() }
                "settings" { $state.Notification.InvokeAction("SettingsAction") }
                "exit" { $state.Notification.InvokeAction("ExitAction") }
            }
        })
        [void]$context.Items.Add($item)
        return $item
    }
    [void](Add-ContextItem "Bring Forward" "bring")
    [void](Add-ContextItem "Send to Desktop Shelf" "shelf")
    [void]$context.Items.Add([System.Windows.Controls.Separator]::new())
    [void](Add-ContextItem "Keep On Top" "top" $true ([bool]$Config.alwaysOnTop))
    [void](Add-ContextItem "Pause Animations" "pause" $true $false)
    [void](Add-ContextItem "Hide to Tray" "hide")
    [void](Add-ContextItem "Settings" "settings")
    [void](Add-ContextItem "Exit" "exit")
    $petImage.ContextMenu = $context

    $window.Add_SourceInitialized(({
        try {
            $helper = [System.Windows.Interop.WindowInteropHelper]::new($window)
            $source = [System.Windows.Interop.HwndSource]::FromHwnd($helper.Handle)
            if ($source) { $source.CompositionTarget.BackgroundColor = [System.Windows.Media.Colors]::Transparent }
        }
        catch {}
    }).GetNewClosure())
    $window.Add_LocationChanged({
        $state = $script:UyPetRuntimeState
        if ($state.DesktopLayer.Mode -ne "shelf" -and -not $state.PetController.IsDragging) { Set-UyWindowWithinScreens -Window $state.Window }
    })
    $window.Add_Closing(({
        param($sender,$eventArgs)
        if (-not $global:UyPetExitRequested -and -not $SmokeTest) {
            $eventArgs.Cancel = $true
            $notification.MinimizeToTray()
        }
    }).GetNewClosure())
    $window.Add_Closed(({
        $bringForwardTimer.Stop()
        $petController.BehaviorTimer.Stop()
        $petController.ReturnTimer.Stop()
        $animation.Timer.Stop()
        $notification.Dispose()
        $desktopLayer.DetachForExit()
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        Write-UyPetLog "The Lawnmower Man exited."
    }).GetNewClosure())
    $window.Add_Loaded(({
        Write-UyPetLog "Pet window loaded."
        Set-UyWindowWithinScreens -Window $window
        Save-UyPetWindowState -Left $window.Left -Top $window.Top
        if (-not $TrayOnly) { $desktopLayer.ApplySavedMode() }
        $window.Tag = [pscustomobject]@{ loaded = $true; loadedAt = [DateTime]::UtcNow.ToString("o") }
        if ($SmokeTest) {
            $featureState = [pscustomobject]@{ Step = 0; Notification = $notification }
            $featureTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $featureTimer.Tag = $featureState
            $featureTimer.Interval = [TimeSpan]::FromMilliseconds(500)
            $featureTimer.Add_Tick({
                param($sender,$eventArgs)
                $state = $sender.Tag
                switch ($state.Step) {
                    0 { $state.Notification.TrayMenu.Items[0].PerformClick() } # BRING FORWARD
                    1 { $state.Notification.TrayMenu.Items[1].PerformClick() } # SEND TO SHELF
                    2 { $state.Notification.TrayMenu.Items[0].PerformClick() } # BRING FORWARD
                    3 { $state.Notification.TrayMenu.Items[5].PerformClick() } # PAUSE
                    4 { $state.Notification.TrayMenu.Items[5].PerformClick() } # RESUME
                    5 { $state.Notification.TrayMenu.Items[2].PerformClick() } # HIDE
                    6 { $state.Notification.TrayMenu.Items[0].PerformClick() } # RECOVER
                    7 { $state.Notification.TrayMenu.Items[7].PerformClick(); $sender.Stop(); return } # EXIT
                    default { $sender.Stop(); $global:UyPetExitRequested = $true; [System.Windows.Application]::Current.Shutdown(0); return }
                }
                $state.Step++
            })
            $featureTimer.Start()
            $window.Left = $window.Left - 4
            Set-UyWindowWithinScreens -Window $window
        }
    }).GetNewClosure())

    if ($TrayOnly) { $window.Visibility = [System.Windows.Visibility]::Hidden }
    if ($SmokeTest) {
        $safetyTimer = [System.Windows.Threading.DispatcherTimer]::new()
        $safetyTimer.Interval = [TimeSpan]::FromSeconds(8)
        $safetyTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $global:UyPetExitRequested = $true; [System.Windows.Application]::Current.Shutdown(1) })
        $window.Add_Activated(({ if (-not $safetyTimer.IsEnabled) { $safetyTimer.Start() } }).GetNewClosure())
        if ($TrayOnly) {
            $trayStartupTimer = [System.Windows.Threading.DispatcherTimer]::new()
            $trayStartupTimer.Interval = [TimeSpan]::FromMilliseconds(400)
            $trayStartupTimer.Tag = $notification
            $trayStartupTimer.Add_Tick({ param($sender,$eventArgs); $sender.Stop(); $sender.Tag.TrayMenu.Items[0].PerformClick() })
            $trayStartupTimer.Start()
        }
    }

    return [pscustomobject]@{ Window = $window; Animation = $animation; PetController = $petController; DesktopLayer = $desktopLayer; Notification = $notification }
}
