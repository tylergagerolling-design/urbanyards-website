Set-StrictMode -Version Latest

function Get-UyPetSessionPath {
    return Join-Path (Get-UyPetDataDirectory) "session.bin"
}

function Get-UyPetSessionEntropy {
    return [Text.Encoding]::UTF8.GetBytes("UrbanYardsPet.Session.v1")
}

function Save-UyPetAuthSession {
    param([Parameter(Mandatory = $true)]$Session)
    $json = $Session | ConvertTo-Json -Depth 8 -Compress
    $plain = [Text.Encoding]::UTF8.GetBytes($json)
    try {
        $protected = [Security.Cryptography.ProtectedData]::Protect(
            $plain,
            (Get-UyPetSessionEntropy),
            [Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        [IO.File]::WriteAllBytes((Get-UyPetSessionPath), $protected)
    }
    finally {
        if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
    }
    Write-UyPetLog "Encrypted desktop session saved for the current Windows user."
}

function Get-UyPetAuthSession {
    $path = Get-UyPetSessionPath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    $plain = $null
    try {
        $protected = [IO.File]::ReadAllBytes($path)
        $plain = [Security.Cryptography.ProtectedData]::Unprotect(
            $protected,
            (Get-UyPetSessionEntropy),
            [Security.Cryptography.DataProtectionScope]::CurrentUser
        )
        return ([Text.Encoding]::UTF8.GetString($plain) | ConvertFrom-Json)
    }
    catch {
        Write-UyPetLog "The saved desktop session could not be read and was discarded." "WARN"
        Remove-UyPetAuthSession
        return $null
    }
    finally {
        if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
    }
}

function Remove-UyPetAuthSession {
    $path = Get-UyPetSessionPath
    if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    Write-UyPetLog "Desktop session disconnected."
}

function Get-UySupabasePublicConfig {
    param([Parameter(Mandatory = $true)]$Config)
    $site = ([Uri]([string]$Config.dashboardUrl)).GetLeftPart([UriPartial]::Authority)
    $scriptText = (Invoke-WebRequest -UseBasicParsing -Uri "$site/dashboard-config.js" -TimeoutSec 15).Content
    if ($scriptText -is [byte[]]) { $scriptText = [Text.Encoding]::UTF8.GetString($scriptText) }
    $urlMatch = [regex]::Match([string]$scriptText, '"supabaseUrl"\s*:\s*"([^"]+)"')
    $keyMatch = [regex]::Match([string]$scriptText, '"supabaseAnonKey"\s*:\s*"([^"]+)"')
    if (-not $urlMatch.Success -or -not $keyMatch.Success) { throw "Urban Yards sign-in configuration is unavailable." }
    $url = $urlMatch.Groups[1].Value.TrimEnd('/')
    $key = $keyMatch.Groups[1].Value
    if (-not $url.StartsWith("https://") -or [string]::IsNullOrWhiteSpace($key)) { throw "Urban Yards sign-in configuration is invalid." }
    return [pscustomobject]@{ Url = $url; Key = $key }
}

function Invoke-UySupabaseAuth {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Body
    )
    $public = Get-UySupabasePublicConfig -Config $Config
    return Invoke-RestMethod -Uri "$($public.Url)$Path" -Method POST -ContentType "application/json" -Headers @{
        apikey = $public.Key
        Authorization = "Bearer $($public.Key)"
        Accept = "application/json"
    } -Body ($Body | ConvertTo-Json -Compress) -TimeoutSec 25 -ErrorAction Stop
}

function ConvertTo-UyPetAuthSession {
    param([Parameter(Mandatory = $true)]$Payload)
    $expiresIn = [Math]::Max(60, [int]$Payload.expires_in)
    return [pscustomobject]@{
        accessToken = [string]$Payload.access_token
        refreshToken = [string]$Payload.refresh_token
        expiresAt = [DateTime]::UtcNow.AddSeconds($expiresIn).ToString("o")
        email = [string]$Payload.user.email
        userId = [string]$Payload.user.id
    }
}

function Connect-UyPetToUrbanYards {
    param(
        [Parameter(Mandatory = $true)]$Config,
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][string]$Password
    )
    if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) {
        throw "Enter your Urban Yards email and password."
    }
    try {
        $payload = Invoke-UySupabaseAuth -Config $Config -Path "/auth/v1/token?grant_type=password" -Body @{
            email = $Email.Trim()
            password = $Password
        }
        if (-not $payload.access_token -or -not $payload.refresh_token) { throw "The sign-in response did not include a session." }
        $session = ConvertTo-UyPetAuthSession -Payload $payload
        Save-UyPetAuthSession -Session $session
        Write-UyPetLog "Urban Yards desktop connection succeeded for $($session.email)."
        return $session
    }
    catch {
        Write-UyPetLog "Urban Yards desktop sign-in failed." "WARN"
        throw "Sign-in failed. Check your Urban Yards email and password, then try again."
    }
}

function Get-UyUsableAccessToken {
    param([Parameter(Mandatory = $true)]$Config)
    $session = Get-UyPetAuthSession
    if (-not $session -or [string]::IsNullOrWhiteSpace([string]$session.accessToken)) { return "" }
    $expires = [DateTime]::MinValue
    if ([DateTime]::TryParse([string]$session.expiresAt, [ref]$expires) -and $expires.ToUniversalTime() -gt [DateTime]::UtcNow.AddMinutes(2)) {
        return [string]$session.accessToken
    }
    if ([string]::IsNullOrWhiteSpace([string]$session.refreshToken)) { Remove-UyPetAuthSession; return "" }
    try {
        $payload = Invoke-UySupabaseAuth -Config $Config -Path "/auth/v1/token?grant_type=refresh_token" -Body @{
            refresh_token = [string]$session.refreshToken
        }
        $refreshed = ConvertTo-UyPetAuthSession -Payload $payload
        Save-UyPetAuthSession -Session $refreshed
        return [string]$refreshed.accessToken
    }
    catch {
        Write-UyPetLog "The desktop session expired and could not be refreshed." "WARN"
        Remove-UyPetAuthSession
        return ""
    }
}

function Get-UyPetConnectedEmail {
    $session = Get-UyPetAuthSession
    return if ($session) { [string]$session.email } else { "" }
}
