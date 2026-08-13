Set-StrictMode -Version Latest

function New-UyPetEvent {
    param(
        [Parameter(Mandatory = $true)][string]$Type,
        [ValidateSet("normal", "attention", "urgent")][string]$Severity = "normal",
        [string]$Message = "",
        [string]$EntityType = "",
        [string]$EntityId = "",
        [string]$ActionLabel = "",
        [string]$Route = "overview",
        [hashtable]$Data = @{}
    )
    return [pscustomobject][ordered]@{
        type = $Type
        severity = $Severity
        message = $Message
        entityType = $EntityType
        entityId = $EntityId
        action = [pscustomobject]@{ label = $ActionLabel; route = $Route }
        data = $Data
        timestamp = [DateTime]::UtcNow.ToString("o")
    }
}

function New-UyEventController {
    param(
        [Parameter(Mandatory = $true)][string[]]$AllowedStates,
        [Parameter(Mandatory = $true)][scriptblock]$OnEvent,
        [int]$CooldownMinutes = 15
    )
    $controller = [pscustomobject]@{
        AllowedStates = $AllowedStates
        OnEvent = $OnEvent
        LastEvents = @{}
        Cooldown = [TimeSpan]::FromMinutes([Math]::Max(1, $CooldownMinutes))
    }
    $controller | Add-Member -MemberType ScriptMethod -Name Publish -Value {
        param($Event, [bool]$BypassCooldown = $false)
        if ($null -eq $Event -or $this.AllowedStates -notcontains [string]$Event.type) {
            Write-UyPetLog "Rejected pet event with an unknown type." "WARN"
            return $false
        }
        if (@("normal", "attention", "urgent") -notcontains [string]$Event.severity) {
            $Event.severity = "normal"
        }
        $routeMap = Get-UyRouteMap
        $route = [string]$Event.action.route
        if (-not ($routeMap.Contains($route) -or $routeMap.Values -contains $route)) {
            $Event.action.route = "overview"
        }
        $fingerprint = "{0}|{1}|{2}|{3}" -f $Event.type, $Event.entityType, $Event.entityId, $Event.message
        $now = [DateTime]::UtcNow
        if (-not $BypassCooldown -and $this.LastEvents.ContainsKey($fingerprint) -and ($now - $this.LastEvents[$fingerprint]) -lt $this.Cooldown) {
            Write-UyPetLog "Duplicate pet event suppressed: $($Event.type)." "DEBUG"
            return $false
        }
        $this.LastEvents[$fingerprint] = $now
        Write-UyPetLog "Pet event received: $($Event.type) / $($Event.severity)."
        try {
            & $this.OnEvent $Event
            return $true
        }
        catch {
            Write-UyPetLog "Pet event '$($Event.type)' could not be displayed: $($_.Exception.Message)" "ERROR"
            return $false
        }
    }
    return $controller
}

function Send-PetEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]$Controller,
        [Parameter(Mandatory = $true)][string]$Type,
        [ValidateSet("normal", "attention", "urgent")][string]$Severity = "normal",
        [string]$Message = "",
        [string]$EntityType = "",
        [string]$EntityId = "",
        [string]$ActionLabel = "",
        [string]$Route = "overview",
        [hashtable]$Data = @{},
        [switch]$Force
    )
    $event = New-UyPetEvent -Type $Type -Severity $Severity -Message $Message -EntityType $EntityType -EntityId $EntityId -ActionLabel $ActionLabel -Route $Route -Data $Data
    return $Controller.Publish($event, [bool]$Force)
}
