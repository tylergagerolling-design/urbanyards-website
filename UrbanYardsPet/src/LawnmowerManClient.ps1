Set-StrictMode -Version Latest

function Invoke-UyJsonRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [ValidateSet("GET", "POST")][string]$Method = "GET",
        [string]$AccessToken = "",
        $Body,
        [int]$TimeoutSeconds = 20
    )
    $headers = @{ Accept = "application/json"; "User-Agent" = "UrbanYardsPet/1.0" }
    if ($AccessToken) { $headers.Authorization = "Bearer $AccessToken" }
    $arguments = @{
        Uri = $Uri
        Method = $Method
        Headers = $headers
        TimeoutSec = $TimeoutSeconds
        ErrorAction = "Stop"
    }
    if ($Method -eq "POST") {
        $arguments.ContentType = "application/json"
        $arguments.Body = $Body | ConvertTo-Json -Depth 12 -Compress
    }
    return Invoke-RestMethod @arguments
}

function Test-UyAllowedPetMetadata {
    param($Metadata, [Parameter(Mandatory = $true)][string[]]$AllowedStates)
    if ($null -eq $Metadata) { return $null }
    $state = [string]$Metadata.state
    if ($AllowedStates -notcontains $state) { return $null }
    $severity = [string]$Metadata.severity
    if (@("normal", "attention", "urgent") -notcontains $severity) { $severity = "normal" }
    return [pscustomobject]@{
        state = $state
        severity = $severity
        speech = ([string]$Metadata.speech).Substring(0, [Math]::Min(240, ([string]$Metadata.speech).Length))
    }
}

function Test-UyAllowedAiAction {
    param($Action)
    if ($null -eq $Action) { return $null }
    $routeMap = Get-UyRouteMap
    $route = [string]$Action.route
    if (-not ($routeMap.Contains($route) -or $routeMap.Values -contains $route)) { return $null }
    return [pscustomobject]@{
        label = ([string]$Action.label).Substring(0, [Math]::Min(60, ([string]$Action.label).Length))
        route = $route
    }
}

function Invoke-UyLawnmowerMan {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$Message,
        [array]$History = @(),
        [Parameter(Mandatory = $true)][string[]]$AllowedStates
    )

    $messageValue = $Message.Trim()
    if (-not $messageValue) { throw "Message is required." }
    if ($messageValue.Length -gt 1400) { throw "Please keep messages under 1400 characters." }
    $token = Get-UyAccessToken -Config $Config
    if (-not $token) {
        throw "Urban Yards sign-in is not configured for the desktop pet. Add a short-lived user access token through the environment variable named in Settings, or open the full dashboard AI."
    }
    $base = ([string]$Config.apiBaseUrl).TrimEnd('/')
    if (-not $base) { $base = ([Uri]$Config.dashboardUrl).GetLeftPart([UriPartial]::Authority) }
    $historyValues = @($History | Select-Object -Last 10 | ForEach-Object {
        [pscustomobject]@{ role = [string]$_.role; content = ([string]$_.content).Substring(0, [Math]::Min(1200, ([string]$_.content).Length)) }
    })
    $payload = [ordered]@{
        action = "chat"
        message = $messageValue
        page = "The Lawnmower Man Windows Desktop Pet"
        history = $historyValues
        context = [ordered]@{
            operation = "desktop-pet"
            externalResearchSettings = [ordered]@{
                externalSearchEnabled = $false
                allowSuggestedRecordUpdates = $false
                requireConfirmationBeforeSaving = $true
                showSourcesByDefault = $true
                sourceScope = "internal"
            }
        }
    }
    Write-UyPetLog "Sending an authenticated request to The Lawnmower Man."
    $response = Invoke-UyJsonRequest -Uri "$base/.netlify/functions/lawnmower-man-chat" -Method POST -AccessToken $token -Body $payload -TimeoutSeconds 60
    $reply = [string]$response.reply
    if (-not $reply) { throw "The Lawnmower Man returned an empty response." }
    return [pscustomobject]@{
        reply = $reply
        pet = Test-UyAllowedPetMetadata -Metadata $response.pet -AllowedStates $AllowedStates
        action = Test-UyAllowedAiAction -Action $response.action
        requestId = [string]$response.requestId
        raw = $response
    }
}
