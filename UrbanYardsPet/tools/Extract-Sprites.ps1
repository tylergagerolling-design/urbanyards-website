[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [string]$OutputDirectory = "",

    [string]$ManifestPath = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $PSScriptRoot "..\assets\sprites"
}
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = Join-Path $PSScriptRoot "..\config\sprite-manifest.json"
}

if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
    throw "Sprite sheet not found: $Source"
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
$manifestFullPath = [System.IO.Path]::GetFullPath($ManifestPath)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($manifestFullPath)) | Out-Null

# Coordinates are the character cells in the supplied 1295 x 1214 source sheet.
# They deliberately exclude headings, frame numbers, badges, palette swatches, and UI samples.
$rows = @{
    idle      = @{ Centers = @(323, 397, 469, 541, 613, 684); Baseline = 152; HalfWidth = 35; Top = 59 }
    walk      = @{ Centers = @(786, 855, 923, 989, 1055, 1120, 1187, 1253); Baseline = 152; HalfWidth = 34; Top = 59 }
    look      = @{ Centers = @(43, 111, 181, 252, 323, 392); Baseline = 325; HalfWidth = 34; Top = 236 }
    water     = @{ Centers = @(478, 548, 618, 690, 759, 830, 900); Baseline = 325; HalfWidth = 35; Top = 236 }
    plant     = @{ Centers = @(972, 1043, 1114, 1184, 1254); Baseline = 325; HalfWidth = 35; Top = 236 }
    thinking  = @{ Centers = @(48, 125, 202, 278, 348, 397); Baseline = 506; HalfWidth = 37; Top = 412 }
    working   = @{ Centers = @(475, 545, 616, 687, 757, 826); Baseline = 506; HalfWidth = 35; Top = 412 }
    busy      = @{ Centers = @(900, 972, 1044, 1114, 1184, 1255); Baseline = 506; HalfWidth = 38; Top = 412 }
    writing   = @{ Centers = @(50, 120, 190, 262, 334, 400); Baseline = 682; HalfWidth = 37; Top = 586 }
    lead      = @{ Centers = @(475, 544, 616, 686, 757, 827); Baseline = 682; HalfWidth = 36; Top = 586 }
    route     = @{ Centers = @(900, 971, 1044, 1115, 1184, 1255); Baseline = 682; HalfWidth = 37; Top = 586 }
    overdue   = @{ Centers = @(49, 119, 190, 261, 333, 401); Baseline = 857; HalfWidth = 35; Top = 762 }
    payment   = @{ Centers = @(474, 544, 616, 686, 756, 826); Baseline = 857; HalfWidth = 36; Top = 762 }
    weather   = @{ Centers = @(901, 972, 1043, 1113, 1185, 1254); Baseline = 857; HalfWidth = 38; Top = 762 }
    sleep     = @{ Centers = @(50, 121, 192, 264, 335, 406, 477); Baseline = 1021; HalfWidth = 35; Top = 937 }
    celebrate = @{ Centers = @(527, 599, 670, 742, 814, 886, 957); Baseline = 1021; HalfWidth = 36; Top = 937 }
    cursor    = @{ Centers = @(49, 120, 191, 313); Baseline = 1154; HalfWidth = 38; Top = 1084 }
}

$animations = [ordered]@{
    idle           = @{ Row = "idle";      Frames = @(0,1,2,3,4,5); Fps = 4; Loop = $true }
    walk           = @{ Row = "walk";      Frames = @(0,1,2,3,4,5,6,7); Fps = 7; Loop = $true }
    lookAround     = @{ Row = "look";      Frames = @(0,1,2,3,4,5); Fps = 4; Loop = $false; ReturnTo = "idle" }
    sleep          = @{ Row = "sleep";     Frames = @(0,1,2,3,4,5,6); Fps = 3; Loop = $true }
    hover          = @{ Row = "cursor";    Frames = @(0,1); Fps = 5; Loop = $true }
    clicked        = @{ Row = "cursor";    Frames = @(1,2,1); Fps = 8; Loop = $false; ReturnTo = "idle" }
    dragged        = @{ Row = "cursor";    Frames = @(2,3); Fps = 5; Loop = $true }
    thinking       = @{ Row = "thinking";  Frames = @(0,1,2,3,4); Fps = 5; Loop = $true }
    working        = @{ Row = "working";   Frames = @(0,1,2,3,4,5); Fps = 6; Loop = $true }
    writing        = @{ Row = "writing";   Frames = @(0,1,2,3,4,5); Fps = 6; Loop = $true }
    foundSomething = @{ Row = "thinking";  Frames = @(3,4,5,4); Fps = 6; Loop = $false; ReturnTo = "idle" }
    newLead        = @{ Row = "lead";      Frames = @(0,1,2,3,4,5); Fps = 6; Loop = $false; ReturnTo = "idle" }
    overdue        = @{ Row = "overdue";   Frames = @(0,1,2,3,4,5); Fps = 5; Loop = $true }
    route          = @{ Row = "route";     Frames = @(0,1,2,3,4,5); Fps = 5; Loop = $false; ReturnTo = "idle" }
    busyDay        = @{ Row = "busy";      Frames = @(0,1,2,3,4,5); Fps = 7; Loop = $true }
    weather        = @{ Row = "weather";   Frames = @(0,1,2,3,4,5); Fps = 5; Loop = $true }
    payment        = @{ Row = "payment";   Frames = @(0,1,2,3,4,5); Fps = 6; Loop = $false; ReturnTo = "celebrate" }
    celebrate      = @{ Row = "celebrate"; Frames = @(0,1,2,3,4,5,6); Fps = 8; Loop = $false; ReturnTo = "idle" }
    plant          = @{ Row = "plant";     Frames = @(0,1,2,3,4); Fps = 6; Loop = $false; ReturnTo = "idle" }
    water          = @{ Row = "water";     Frames = @(0,1,2,3,4,5,6); Fps = 6; Loop = $false; ReturnTo = "idle" }
}

$canvasSize = 128
$anchorX = 64
$anchorY = 112
$bitmap = [System.Drawing.Bitmap]::new($sourcePath)

try {
    $manifestAnimations = [ordered]@{}
    foreach ($animationName in $animations.Keys) {
        $spec = $animations[$animationName]
        $row = $rows[$spec.Row]
        $frameFiles = [System.Collections.Generic.List[string]]::new()
        $frameNumber = 0

        foreach ($sourceIndex in $spec.Frames) {
            $frameNumber++
            $centerX = [int]$row.Centers[$sourceIndex]
            $sourceLeft = [Math]::Max(0, $centerX - [int]$row.HalfWidth)
            $sourceTop = [int]$row.Top
            $sourceRight = [Math]::Min($bitmap.Width, $centerX + [int]$row.HalfWidth + 1)
            $sourceBottom = [Math]::Min($bitmap.Height, [int]$row.Baseline + 1)
            $sourceWidth = $sourceRight - $sourceLeft
            $sourceHeight = $sourceBottom - $sourceTop

            $frame = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $graphics = [System.Drawing.Graphics]::FromImage($frame)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                $destinationX = $anchorX - ($centerX - $sourceLeft)
                $destinationY = $anchorY - ([int]$row.Baseline - $sourceTop)
                $destination = [System.Drawing.Rectangle]::new($destinationX, $destinationY, $sourceWidth, $sourceHeight)
                $sourceRect = [System.Drawing.Rectangle]::new($sourceLeft, $sourceTop, $sourceWidth, $sourceHeight)
                $graphics.DrawImage($bitmap, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
            }
            finally {
                $graphics.Dispose()
            }

            $fileName = "{0}_{1:D2}.png" -f $animationName, $frameNumber
            $destinationPath = Join-Path $outputPath $fileName
            $frame.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $frame.Dispose()
            $frameFiles.Add($fileName)
        }

        $entry = [ordered]@{
            fps = [int]$spec.Fps
            loop = [bool]$spec.Loop
            frames = @($frameFiles)
        }
        if ($spec.ContainsKey("ReturnTo")) {
            $entry.returnTo = [string]$spec.ReturnTo
        }
        $manifestAnimations[$animationName] = $entry
    }

    $manifest = [ordered]@{
        schemaVersion = 1
        character = "The Lawnmower Man"
        source = "assets/source/urban-yards-lawnmower-man-sprite-sheet.png"
        canvas = [ordered]@{ width = $canvasSize; height = $canvasSize; anchorX = $anchorX; anchorY = $anchorY }
        allowedStates = @($manifestAnimations.Keys)
        severities = @("normal", "attention", "urgent")
        animations = $manifestAnimations
    }
    $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $manifestFullPath -Encoding UTF8

    $iconDirectory = Join-Path ([System.IO.Path]::GetDirectoryName($outputPath)) "icons"
    [System.IO.Directory]::CreateDirectory($iconDirectory) | Out-Null
    $iconBitmap = [System.Drawing.Bitmap]::new(32, 32, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $iconGraphics = [System.Drawing.Graphics]::FromImage($iconBitmap)
    try {
        $iconGraphics.Clear([System.Drawing.Color]::Transparent)
        $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $idleFrame = [System.Drawing.Image]::FromFile((Join-Path $outputPath "idle_01.png"))
        try { $iconGraphics.DrawImage($idleFrame, [System.Drawing.Rectangle]::new(0, 0, 32, 32)) }
        finally { $idleFrame.Dispose() }
    }
    finally { $iconGraphics.Dispose() }
    $iconHandle = $iconBitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $iconStream = [System.IO.File]::Create((Join-Path $iconDirectory "urban-yards-pet.ico"))
    try { $icon.Save($iconStream) }
    finally { $iconStream.Dispose(); $icon.Dispose(); $iconBitmap.Dispose() }
}
finally {
    $bitmap.Dispose()
}

Write-Host "Extracted $($manifestAnimations.Count) animations to $outputPath"
Write-Host "Manifest: $manifestFullPath"
