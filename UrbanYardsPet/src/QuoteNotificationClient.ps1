Set-StrictMode -Version Latest

function Get-UyQuoteNotificationStatePath {
    return Join-Path (Get-UyPetDataDirectory) "quote-notification-state.json"
}

function Get-UyQuoteNotificationState {
    $path = Get-UyQuoteNotificationStatePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return [pscustomobject]@{ initialized = $false; seenIds = @(); lastCheckedAt = "" }
    }
    try {
        $saved = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        return [pscustomobject]@{
            initialized = [bool]$saved.initialized
            seenIds = @($saved.seenIds | ForEach-Object { [string]$_ })
            lastCheckedAt = [string]$saved.lastCheckedAt
        }
    }
    catch {
        Write-UyPetLog "Quote notification state was invalid and will be rebuilt." "WARN"
        return [pscustomobject]@{ initialized = $false; seenIds = @(); lastCheckedAt = "" }
    }
}

function Save-UyQuoteNotificationState {
    param([Parameter(Mandatory = $true)][string[]]$SeenIds)
    [pscustomobject]@{
        initialized = $true
        seenIds = @($SeenIds | Select-Object -Unique -First 200)
        lastCheckedAt = [DateTime]::UtcNow.ToString("o")
    } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Get-UyQuoteNotificationStatePath) -Encoding UTF8
}

function Get-UyUnseenQuoteRequests {
    param(
        [Parameter(Mandatory = $true)][object[]]$Rows,
        [string[]]$SeenIds = @()
    )
    $seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($id in @($SeenIds)) {
        if (-not [string]::IsNullOrWhiteSpace([string]$id)) { [void]$seen.Add([string]$id) }
    }
    return @($Rows | Where-Object { $_.id -and -not $seen.Contains([string]$_.id) })
}

function Invoke-UyQuoteRequestList {
    param([Parameter(Mandatory = $true)]$Config)
    $token = Get-UyUsableAccessToken -Config $Config
    if ([string]::IsNullOrWhiteSpace($token)) { throw "Connect the pet to your Urban Yards account in Settings." }
    $site = ([Uri]([string]$Config.dashboardUrl)).GetLeftPart([UriPartial]::Authority).TrimEnd('/')
    $path = "quote_submissions?select=id,name,service,city,created_at&order=created_at.desc&limit=40"
    try {
        $response = Invoke-RestMethod -Uri "$site/.netlify/functions/dashboard-records" -Method POST -ContentType "application/json" -Headers @{
            Authorization = "Bearer $token"
            Accept = "application/json"
        } -Body (@{ path = $path; method = "GET" } | ConvertTo-Json -Compress) -TimeoutSec 20 -ErrorAction Stop
        return @($response.data)
    }
    catch {
        $statusCode = 0
        try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        if ($statusCode -eq 401) { Remove-UyPetAuthSession }
        throw
    }
}

function New-UyQuotePollingController {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][scriptblock]$OnNewQuotes,
        [Parameter(Mandatory = $true)][scriptblock]$OnStatusChanged
    )
    $timer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Background)
    $controller = [pscustomobject]@{
        Config = $Config
        Timer = $timer
        OnNewQuotes = $OnNewQuotes
        OnStatusChanged = $OnStatusChanged
        IsBusy = $false
        IsStarted = $false
        Failures = 0
        Status = "Not connected"
    }
    $controller | Add-Member -MemberType ScriptMethod -Name SetStatus -Value {
        param([string]$Status)
        if ($this.Status -eq $Status) { return }
        $this.Status = $Status
        try { & $this.OnStatusChanged $Status } catch { Write-UyPetLog "Quote status display failed: $($_.Exception.Message)" "WARN" }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ApplyInterval -Value {
        $baseSeconds = [Math]::Min(300, [Math]::Max(60, [int]$this.Config.quotePollIntervalSeconds))
        $seconds = [Math]::Min(600, $baseSeconds * [Math]::Pow(2, [Math]::Min(3, $this.Failures)))
        $this.Timer.Interval = [TimeSpan]::FromSeconds($seconds)
    }
    $controller | Add-Member -MemberType ScriptMethod -Name PollNow -Value {
        if ($this.IsBusy) { return }
        if (-not [bool]$this.Config.quoteNotificationsEnabled) { $this.SetStatus("Notifications paused"); return }
        if ([string]::IsNullOrWhiteSpace((Get-UyPetConnectedEmail))) { $this.SetStatus("Not connected"); return }
        $this.IsBusy = $true
        $this.SetStatus("Checking quote requests...")
        try {
            $rows = @(Invoke-UyQuoteRequestList -Config $this.Config)
            $state = Get-UyQuoteNotificationState
            $currentIds = @($rows | ForEach-Object { [string]$_.id } | Where-Object { $_ })
            if (-not $state.initialized) {
                Save-UyQuoteNotificationState -SeenIds $currentIds
                Write-UyPetLog "Quote notification baseline established without replaying old requests."
            }
            else {
                $newRows = @(Get-UyUnseenQuoteRequests -Rows $rows -SeenIds @($state.seenIds))
                Save-UyQuoteNotificationState -SeenIds @($currentIds + @($state.seenIds))
                if ($newRows.Count -gt 0) {
                    try { & $this.OnNewQuotes $newRows } catch { Write-UyPetLog "A new quote alert could not be displayed: $($_.Exception.Message)" "ERROR" }
                }
            }
            $this.Failures = 0
            $this.SetStatus("Connected - last checked $([DateTime]::Now.ToString('h:mm tt'))")
        }
        catch {
            $this.Failures++
            $message = if ([string]::IsNullOrWhiteSpace((Get-UyPetConnectedEmail))) { "Not connected" } else { "Connection problem - retrying" }
            $this.SetStatus($message)
            Write-UyPetLog "Quote request check failed: $($_.Exception.Message)" "WARN"
        }
        finally {
            $this.IsBusy = $false
            $this.ApplyInterval()
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Start -Value {
        $this.ApplyInterval()
        if (-not $this.Timer.IsEnabled) { $this.Timer.Start() }
        $this.IsStarted = $true
        $this.PollNow()
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Stop -Value { $this.Timer.Stop(); $this.IsStarted = $false }
    $timer.Tag = $controller
    $timer.Add_Tick({ param($sender,$eventArgs); $sender.Tag.PollNow() })
    return $controller
}
