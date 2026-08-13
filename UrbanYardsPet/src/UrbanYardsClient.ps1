Set-StrictMode -Version Latest

function Invoke-UyDashboardRecordsRead {
    param([Parameter(Mandatory = $true)]$Config, [Parameter(Mandatory = $true)][string]$Path)
    $token = Get-UyAccessToken -Config $Config
    if (-not $token) { throw "A signed-in Urban Yards user token is required." }
    $base = ([string]$Config.apiBaseUrl).TrimEnd('/')
    return Invoke-UyJsonRequest -Uri "$base/.netlify/functions/dashboard-records" -Method POST -AccessToken $token -Body @{ path = $Path; method = "GET" } -TimeoutSeconds 18
}

function Invoke-UyTicketList {
    param([Parameter(Mandatory = $true)]$Config)
    $token = Get-UyAccessToken -Config $Config
    $base = ([string]$Config.apiBaseUrl).TrimEnd('/')
    return Invoke-UyJsonRequest -Uri "$base/.netlify/functions/dashboard-tickets" -Method POST -AccessToken $token -Body @{ action = "list"; limit = 250 } -TimeoutSeconds 18
}

function Invoke-UyPaymentList {
    param([Parameter(Mandatory = $true)]$Config)
    $token = Get-UyAccessToken -Config $Config
    $base = ([string]$Config.apiBaseUrl).TrimEnd('/')
    return Invoke-UyJsonRequest -Uri "$base/.netlify/functions/dashboard-financial" -Method POST -AccessToken $token -Body @{ action = "list-payments" } -TimeoutSeconds 18
}

function Invoke-UyWeatherAlerts {
    param([Parameter(Mandatory = $true)]$Config)
    $base = ([string]$Config.apiBaseUrl).TrimEnd('/')
    return Invoke-UyJsonRequest -Uri "$base/.netlify/functions/nws-alerts" -Method GET -TimeoutSeconds 12
}

function Get-UyPropertyValue {
    param($InputObject, [string[]]$Names, $Default = $null)
    foreach ($name in $Names) {
        $property = $InputObject.PSObject.Properties[$name]
        if ($null -ne $property -and $null -ne $property.Value -and [string]$property.Value -ne "") { return $property.Value }
    }
    return $Default
}

function Get-UyOperationalSnapshot {
    param([Parameter(Mandatory = $true)]$Config)
    if (-not (Test-UyConnectivityConfigured -Config $Config)) {
        return [pscustomobject]@{ configured = $false; online = $false; events = @(); counts = @{}; error = "No user access token configured." }
    }

    try {
        $ticketResult = Invoke-UyTicketList -Config $Config
        $tickets = @($ticketResult.tickets)
        $leads = @((Invoke-UyDashboardRecordsRead -Config $Config -Path "quote_submissions?select=id,status,created_at,updated_at&order=created_at.desc&limit=100").data)
        $reminders = @((Invoke-UyDashboardRecordsRead -Config $Config -Path "follow_up_reminders?select=id,status,due_at,due_date,completed_at,updated_at&order=due_at.asc.nullslast&limit=100").data)
        $jobs = @((Invoke-UyDashboardRecordsRead -Config $Config -Path "scheduled_jobs?select=id,status,visit_date,scheduled_date,updated_at&order=visit_date.asc.nullslast&limit=100").data)
        $payments = @((Invoke-UyPaymentList -Config $Config).data)
        $weatherResult = $null
        try { $weatherResult = Invoke-UyWeatherAlerts -Config $Config } catch { Write-UyPetLog "Weather polling skipped: $($_.Exception.Message)" "WARN" }

        $now = [DateTime]::UtcNow
        $today = [DateTime]::Today
        $activeTicketStages = @("closed", "paid", "cancelled", "canceled", "trash", "deleted")
        $overdueTickets = @($tickets | Where-Object {
            $stage = [string](Get-UyPropertyValue $_ @("stage", "status") "")
            $due = Get-UyPropertyValue $_ @("due_date", "dueDate", "scheduled_date", "visit_date") ""
            $dueDate = [DateTime]::MinValue
            $due -and [DateTime]::TryParse([string]$due, [ref]$dueDate) -and $dueDate.Date -lt $today -and ($activeTicketStages -notcontains $stage.ToLowerInvariant())
        })
        $overdueReminders = @($reminders | Where-Object {
            $status = [string](Get-UyPropertyValue $_ @("status") "")
            $due = Get-UyPropertyValue $_ @("due_at", "due_date") ""
            $dueDate = [DateTime]::MinValue
            $due -and [DateTime]::TryParse([string]$due, [ref]$dueDate) -and $dueDate -lt $now -and $status -notmatch "(?i)complete|done|closed"
        })
        $todayJobs = @($jobs | Where-Object {
            $date = Get-UyPropertyValue $_ @("visit_date", "scheduled_date") ""
            $parsed = [DateTime]::MinValue
            $date -and [DateTime]::TryParse([string]$date, [ref]$parsed) -and $parsed.Date -eq $today
        })
        $newLeads = @($leads | Where-Object {
            $created = Get-UyPropertyValue $_ @("created_at") ""
            $parsed = [DateTime]::MinValue
            $created -and [DateTime]::TryParse([string]$created, [ref]$parsed) -and $parsed -gt $now.AddMinutes(-10)
        })
        $newPayments = @($payments | Where-Object {
            $created = Get-UyPropertyValue $_ @("created_at", "payment_date") ""
            $parsed = [DateTime]::MinValue
            $created -and [DateTime]::TryParse([string]$created, [ref]$parsed) -and $parsed -gt $now.AddMinutes(-10)
        })
        $weatherAlerts = @($weatherResult.alerts)

        $events = [System.Collections.Generic.List[object]]::new()
        if ($weatherAlerts.Count) { $events.Add((New-UyPetEvent -Type "weather" -Severity "urgent" -Message "An active Portland weather alert needs a look." -EntityType "weather" -ActionLabel "VIEW HOME" -Route "overview")) }
        if ($overdueTickets.Count) { $events.Add((New-UyPetEvent -Type "overdue" -Severity "attention" -Message "$($overdueTickets.Count) ticket$($(if($overdueTickets.Count -eq 1){''}else{'s'})) need attention." -EntityType "ticket" -ActionLabel "VIEW TICKETS" -Route "tickets")) }
        if ($overdueReminders.Count) { $events.Add((New-UyPetEvent -Type "overdue" -Severity "attention" -Message "$($overdueReminders.Count) follow-up$($(if($overdueReminders.Count -eq 1){''}else{'s'})) are waiting." -EntityType "lead" -ActionLabel "VIEW LEADS" -Route "leads")) }
        if ($newLeads.Count) { $events.Add((New-UyPetEvent -Type "newLead" -Message "A new quote request arrived." -EntityType "lead" -EntityId ([string]$newLeads[0].id) -ActionLabel "VIEW LEADS" -Route "leads")) }
        if ($newPayments.Count) { $events.Add((New-UyPetEvent -Type "payment" -Message "Payment received." -EntityType "payment" -EntityId ([string]$newPayments[0].id) -ActionLabel "VIEW MONEY" -Route "money")) }
        if ($todayJobs.Count -ge [int]$Config.scheduleHeavyThreshold) { $events.Add((New-UyPetEvent -Type "busyDay" -Severity "attention" -Message "Today has $($todayJobs.Count) scheduled visits." -EntityType "schedule" -ActionLabel "VIEW WORK" -Route "work")) }

        return [pscustomobject]@{
            configured = $true
            online = $true
            events = @($events)
            counts = [pscustomobject]@{ tickets = $tickets.Count; overdueTickets = $overdueTickets.Count; overdueFollowUps = $overdueReminders.Count; todayJobs = $todayJobs.Count; weatherAlerts = $weatherAlerts.Count }
            checkedAt = $now.ToString("o")
            error = ""
        }
    }
    catch {
        Write-UyPetLog "Operational polling failed: $($_.Exception.Message)" "WARN"
        return [pscustomobject]@{ configured = $true; online = $false; events = @(); counts = @{}; checkedAt = [DateTime]::UtcNow.ToString("o"); error = $_.Exception.Message }
    }
}

function New-UyPollingController {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][scriptblock]$OnSnapshot
    )
    $timer = [System.Windows.Threading.DispatcherTimer]::new([System.Windows.Threading.DispatcherPriority]::Background)
    $controller = [pscustomobject]@{
        Config = $Config
        Timer = $timer
        OnSnapshot = $OnSnapshot
        IsBusy = $false
        Failures = 0
        IsPaused = $false
    }
    $controller | Add-Member -MemberType ScriptMethod -Name ApplyInterval -Value {
        $baseSeconds = [Math]::Min(300, [Math]::Max(30, [int]$this.Config.pollIntervalSeconds))
        $seconds = [Math]::Min(900, $baseSeconds * [Math]::Pow(2, [Math]::Min(4, $this.Failures)))
        $this.Timer.Interval = [TimeSpan]::FromSeconds($seconds)
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Poll -Value {
        if ($this.IsBusy -or $this.IsPaused) { return }
        $this.IsBusy = $true
        try {
            $snapshot = Get-UyOperationalSnapshot -Config $this.Config
            if ($snapshot.online) { $this.Failures = 0 } elseif ($snapshot.configured) { $this.Failures++ }
            & $this.OnSnapshot $snapshot
        }
        finally {
            $this.IsBusy = $false
            $this.ApplyInterval()
        }
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Start -Value { $this.ApplyInterval(); $this.Timer.Start() }
    $controller | Add-Member -MemberType ScriptMethod -Name Stop -Value { $this.Timer.Stop() }
    $controller | Add-Member -MemberType ScriptMethod -Name SetPaused -Value { param([bool]$Paused); $this.IsPaused = $Paused }
    $timer.Tag = $controller
    $timer.Add_Tick({ param($sender, $eventArgs); $sender.Tag.Poll() })
    return $controller
}
