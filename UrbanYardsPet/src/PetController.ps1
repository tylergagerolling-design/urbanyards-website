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
    $returnTimer = [System.Windows.Threading.DispatcherTimer]::new()
    $controller = [pscustomobject]@{
        Window = $Window
        Animation = $Animation
        Config = $Config
        BehaviorTimer = $behaviorTimer
        ReturnTimer = $returnTimer
        LastInteraction = [DateTime]::UtcNow
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
        if (-not $this.IsDragging) { [void]$this.Animation.SetState("idle_blink", "normal", $true) }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Pause -Value {
        param([bool]$Paused)
        $this.Animation.SetPaused($Paused)
    }
    $controller | Add-Member -MemberType ScriptMethod -Name TickBehavior -Value {
        if (-not [bool]$this.Config.animationsEnabled -or $this.Animation.IsPaused -or $this.IsDragging -or $this.TemporaryState -or -not $this.Window.IsVisible) { return }
        $now = [DateTime]::UtcNow
        if (($now - $this.LastInteraction).TotalMinutes -ge [double]$this.Config.idleBeforeSleepMinutes) {
            if ($this.Animation.State -ne "sleep") { [void]$this.Animation.SetState("sleep", "normal", $true) }
            return
        }
        if ($this.Animation.State -eq "sleep") { return }
        $roll = $this.Random.Next(0, 100)
        if ($roll -lt 18) { $this.SetState("thinking", "normal", 6) }
    }

    $behaviorTimer.Interval = [TimeSpan]::FromSeconds(14)
    $behaviorTimer.Tag = $controller
    $behaviorTimer.Add_Tick({ param($sender, $eventArgs); try { $sender.Tag.TickBehavior() } catch { Write-UyPetLog "Behavior timer recovered from an error: $($_.Exception.Message)" "ERROR" } })
    $returnTimer.Tag = $controller
    $returnTimer.Add_Tick({ param($sender, $eventArgs); try { $sender.Tag.ReturnToIdle() } catch { $sender.Stop(); Write-UyPetLog "Idle timer recovered from an error: $($_.Exception.Message)" "ERROR" } })

    $behaviorTimer.Start()
    return $controller
}
