Set-StrictMode -Version Latest

function New-UyBitmapImage {
    param([Parameter(Mandatory = $true)][string]$Path)
    $image = [System.Windows.Media.Imaging.BitmapImage]::new()
    $image.BeginInit()
    $image.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    $image.CreateOptions = [System.Windows.Media.Imaging.BitmapCreateOptions]::IgnoreImageCache
    $image.UriSource = [Uri]::new($Path)
    $image.EndInit()
    $image.Freeze()
    return $image
}

function New-UyAnimationController {
    param(
        [Parameter(Mandatory = $true)][System.Windows.Controls.Image]$ImageControl,
        [Parameter(Mandatory = $true)][string]$ManifestPath,
        [Parameter(Mandatory = $true)][string]$SpriteDirectory,
        [double]$Speed = 1.0
    )

    $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    $cache = @{}
    foreach ($state in $manifest.allowedStates) {
        foreach ($frame in $manifest.animations.$state.frames) {
            if (-not $cache.ContainsKey([string]$frame)) {
                $cache[[string]$frame] = New-UyBitmapImage -Path (Join-Path $SpriteDirectory ([string]$frame))
            }
        }
    }

    $timer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Render)
    $controller = [pscustomobject]@{
        Image = $ImageControl
        Manifest = $manifest
        Cache = $cache
        Timer = $timer
        State = "idle"
        Severity = "normal"
        FrameIndex = 0
        IsPaused = $false
        Speed = [Math]::Min(2.5, [Math]::Max(0.35, $Speed))
        StateChangedAt = [DateTime]::UtcNow
    }

    $controller | Add-Member -MemberType ScriptMethod -Name IsAllowedState -Value {
        param([string]$Name)
        return @($this.Manifest.allowedStates) -contains $Name
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ApplyInterval -Value {
        $animation = $this.Manifest.animations.($this.State)
        $fps = [Math]::Max(1, [double]$animation.fps * [double]$this.Speed)
        $this.Timer.Interval = [TimeSpan]::FromMilliseconds([Math]::Max(55, 1000 / $fps))
    }
    $controller | Add-Member -MemberType ScriptMethod -Name RenderFrame -Value {
        $animation = $this.Manifest.animations.($this.State)
        $frames = @($animation.frames)
        if ($frames.Count -eq 0) { return }
        if ($this.FrameIndex -ge $frames.Count) { $this.FrameIndex = 0 }
        $this.Image.Source = $this.Cache[[string]$frames[$this.FrameIndex]]
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetState -Value {
        param([string]$Name, [string]$Severity = "normal", [bool]$Restart = $true)
        if (-not $this.IsAllowedState($Name)) {
            Write-UyPetLog "Rejected unknown animation state '$Name'." "WARN"
            return $false
        }
        if (@("normal", "attention", "urgent") -notcontains $Severity) { $Severity = "normal" }
        $changed = $this.State -ne $Name -or $this.Severity -ne $Severity
        $this.State = $Name
        $this.Severity = $Severity
        if ($Restart -or $changed) { $this.FrameIndex = 0 }
        $this.StateChangedAt = [DateTime]::UtcNow
        $this.ApplyInterval()
        $this.RenderFrame()
        if (-not $this.IsPaused -and -not $this.Timer.IsEnabled) { $this.Timer.Start() }
        if ($changed) { Write-UyPetLog "Pet state changed to '$Name' ($Severity)." }
        return $true
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetPaused -Value {
        param([bool]$Paused)
        $this.IsPaused = $Paused
        if ($Paused) { $this.Timer.Stop() } else { $this.ApplyInterval(); $this.Timer.Start() }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetSpeed -Value {
        param([double]$Value)
        $this.Speed = [Math]::Min(2.5, [Math]::Max(0.35, $Value))
        $this.ApplyInterval()
    }

    $timer.Tag = $controller
    $timer.Add_Tick({
        param($sender, $eventArgs)
        $instance = $sender.Tag
        try {
            if ($instance.IsPaused) { return }
            $animation = $instance.Manifest.animations.($instance.State)
            $frames = @($animation.frames)
            if ($frames.Count -eq 0) { return }
            $instance.FrameIndex++
            if ($instance.FrameIndex -ge $frames.Count) {
                if ([bool]$animation.loop) {
                    $instance.FrameIndex = 0
                }
                elseif ($animation.PSObject.Properties["returnTo"] -and $animation.returnTo) {
                    [void]$instance.SetState([string]$animation.returnTo, "normal", $true)
                    return
                }
                else {
                    $instance.FrameIndex = $frames.Count - 1
                    $instance.Timer.Stop()
                }
            }
            $instance.RenderFrame()
        }
        catch {
            $sender.Stop()
            Write-UyPetLog "Animation timer stopped safely after an error: $($_.Exception.Message)" "ERROR"
        }
    })

    [void]$controller.SetState("idle", "normal", $true)
    return $controller
}
