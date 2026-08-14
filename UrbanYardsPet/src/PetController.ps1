Set-StrictMode -Version Latest

function Get-UyWorkingArea {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    $dpi = [System.Windows.Media.VisualTreeHelper]::GetDpi($Window)
    $scaleX = if ($dpi.DpiScaleX -gt 0) { $dpi.DpiScaleX } else { 1.0 }
    $scaleY = if ($dpi.DpiScaleY -gt 0) { $dpi.DpiScaleY } else { 1.0 }
    if ([double]::IsNaN($Window.Left) -or [double]::IsNaN($Window.Top)) {
        $area = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
    }
    else {
        $point = [System.Drawing.Point]::new(
            [int](($Window.Left + $Window.Width / 2) * $scaleX),
            [int](($Window.Top + $Window.Height / 2) * $scaleY)
        )
        $area = [System.Windows.Forms.Screen]::FromPoint($point).WorkingArea
    }
    return [pscustomobject]@{
        Left = $area.Left / $scaleX
        Top = $area.Top / $scaleY
        Right = $area.Right / $scaleX
        Bottom = $area.Bottom / $scaleY
    }
}

function Set-UyWindowWithinScreens {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    $area = Get-UyWorkingArea -Window $Window
    if ([double]::IsNaN($Window.Left) -or [double]::IsInfinity($Window.Left)) { $Window.Left = $area.Right - $Window.Width - 24 }
    if ([double]::IsNaN($Window.Top) -or [double]::IsInfinity($Window.Top)) { $Window.Top = $area.Bottom - $Window.Height - 24 }
    $Window.Left = [Math]::Min($area.Right - $Window.Width, [Math]::Max($area.Left, $Window.Left))
    $Window.Top = [Math]::Min($area.Bottom - $Window.Height, [Math]::Max($area.Top, $Window.Top))
}

function Set-UyDefaultWindowPosition {
    param([Parameter(Mandatory = $true)][System.Windows.Window]$Window)
    $area = Get-UyWorkingArea -Window $Window
    $Window.Left = $area.Right - $Window.Width - 24
    $Window.Top = $area.Bottom - $Window.Height - 24
}

function New-UyPetController {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Window]$Window,
        [Parameter(Mandatory = $true)]$Animation,
        [Parameter(Mandatory = $true)]$Config
    )
    $behaviorTimer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Background)
    $moveTimer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Render)
    $returnTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $controller = [pscustomobject]@{
        Window = $Window
        Animation = $Animation
        Config = $Config
        BehaviorTimer = $behaviorTimer
        MoveTimer = $moveTimer
        ReturnTimer = $returnTimer
        LastInteraction = [DateTime]::UtcNow
        LastWander = [DateTime]::UtcNow
        TargetLeft = 0.0
        MoveStep = 0.0
        IsMoving = $false
        IsDragging = $false
        TemporaryState = $false
        Random = [Random]::new()
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Touch -Value {
        $this.LastInteraction = [DateTime]::UtcNow
        if ($this.Animation.State -eq "sleep") { [void]$this.Animation.SetState("idle_blink", "normal", $true) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetState -Value {
        param([string]$State, [string]$Severity = "normal", [int]$DurationSeconds = 0)
        $this.ReturnTimer.Stop()
        $this.TemporaryState = $DurationSeconds -gt 0
        [void]$this.Animation.SetState($State, $Severity, $true)
        if ($DurationSeconds -gt 0) {
            $this.ReturnTimer.Interval = [TimeSpan]::FromSeconds($DurationSeconds)
            $this.ReturnTimer.Start()
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ReturnToIdle -Value {
        $this.ReturnTimer.Stop()
        $this.TemporaryState = $false
        if (-not $this.IsMoving -and -not $this.IsDragging) { [void]$this.Animation.SetState("idle_blink", "normal", $true) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name BeginWander -Value {
        if (-not [bool]$this.Config.wanderingEnabled -or $this.IsMoving -or $this.IsDragging -or $this.TemporaryState -or -not $this.Window.IsVisible) { return }
        $area = Get-UyWorkingArea -Window $this.Window
        $distance = $this.Random.Next(45, 135) * $(if ($this.Random.Next(0, 2) -eq 0) { -1 } else { 1 })
        $target = [Math]::Min($area.Right - $this.Window.Width, [Math]::Max($area.Left, $this.Window.Left + $distance))
        if ([Math]::Abs($target - $this.Window.Left) -lt 15) { return }
        $this.TargetLeft = $target
        $this.MoveStep = $(if ($target -lt $this.Window.Left) { -2.0 } else { 2.0 })
        $this.IsMoving = $true
        $this.LastWander = [DateTime]::UtcNow
        [void]$this.Animation.SetState("working", "normal", $true)
        $this.MoveTimer.Start()
    }
    $controller | Add-Member -MemberType ScriptMethod -Name StopWander -Value {
        try {
            $this.MoveTimer.Stop()
            $this.IsMoving = $false
            Set-UyWindowWithinScreens -Window $this.Window
            Save-UyPetWindowState -Left $this.Window.Left -Top $this.Window.Top
            if (-not $this.TemporaryState -and -not $this.IsDragging) { [void]$this.Animation.SetState("idle_blink", "normal", $true) }
        }
        catch {
            $this.MoveTimer.Stop()
            $this.IsMoving = $false
            Write-UyPetLog "Wandering stopped safely after a movement error: $($_.Exception.Message)" "ERROR"
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Pause -Value {
        param([bool]$Paused)
        $this.Animation.SetPaused($Paused)
        if ($Paused) { $this.MoveTimer.Stop() } elseif ($this.IsMoving) { $this.MoveTimer.Start() }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name TickBehavior -Value {
        if (-not [bool]$this.Config.animationsEnabled -or $this.Animation.IsPaused -or $this.IsMoving -or $this.IsDragging -or $this.TemporaryState -or -not $this.Window.IsVisible) { return }
        $now = [DateTime]::UtcNow
        if (($now - $this.LastInteraction).TotalMinutes -ge [double]$this.Config.idleBeforeSleepMinutes) {
            if ($this.Animation.State -ne "sleep") { [void]$this.Animation.SetState("sleep", "normal", $true) }
            return
        }
        if ($this.Animation.State -eq "sleep") { return }
        $roll = $this.Random.Next(0, 100)
        if ($roll -lt 22 -and ($now - $this.LastWander).TotalSeconds -gt 45) { $this.BeginWander(); return }
        if ($roll -ge 22 -and $roll -lt 40) { $this.SetState("thinking", "normal", 6) }
    }

    $behaviorTimer.Interval = [TimeSpan]::FromSeconds(14)
    $behaviorTimer.Tag = $controller
    $behaviorTimer.Add_Tick({ param($sender, $eventArgs); try { $sender.Tag.TickBehavior() } catch { Write-UyPetLog "Behavior timer recovered from an error: $($_.Exception.Message)" "ERROR" } })
    $moveTimer.Interval = [TimeSpan]::FromMilliseconds(30)
    $moveTimer.Tag = $controller
    $moveTimer.Add_Tick({
        param($sender, $eventArgs)
        $instance = $sender.Tag
        try {
            if (-not $instance.IsMoving) { $sender.Stop(); return }
            $next = $instance.Window.Left + $instance.MoveStep
            $done = ($instance.MoveStep -gt 0 -and $next -ge $instance.TargetLeft) -or ($instance.MoveStep -lt 0 -and $next -le $instance.TargetLeft)
            $instance.Window.Left = if ($done) { $instance.TargetLeft } else { $next }
            if ($done) { $instance.StopWander() }
        }
        catch {
            $sender.Stop(); $instance.IsMoving = $false
            Write-UyPetLog "Movement timer recovered from an error: $($_.Exception.Message)" "ERROR"
        }
    })
    $returnTimer.Tag = $controller
    $returnTimer.Add_Tick({ param($sender, $eventArgs); try { $sender.Tag.ReturnToIdle() } catch { $sender.Stop(); Write-UyPetLog "Idle timer recovered from an error: $($_.Exception.Message)" "ERROR" } })

    $behaviorTimer.Start()
    return $controller
}
