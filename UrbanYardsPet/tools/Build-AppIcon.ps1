[CmdletBinding()]
param(
    [string]$Source = "",
    [string]$Destination = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Drawing

if ([string]::IsNullOrWhiteSpace($Source)) { $Source = Join-Path $PSScriptRoot "..\assets\icons\lawnmower-man-app-icon.png" }
if ([string]::IsNullOrWhiteSpace($Destination)) { $Destination = Join-Path $PSScriptRoot "..\assets\icons\lawnmower-man-app.ico" }

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "App icon source not found: $sourcePath"
}

$sizes = @(16, 20, 24, 32, 40, 48, 64, 96, 128, 256)
$frames = [System.Collections.Generic.List[byte[]]]::new()
$sourceBitmap = [System.Drawing.Bitmap]::new($sourcePath)
try {
    foreach ($size in $sizes) {
        $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $bitmap.SetResolution(96, 96)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.DrawImage($sourceBitmap, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
            }
            finally { $graphics.Dispose() }

            $stream = [System.IO.MemoryStream]::new()
            try {
                $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
                $frames.Add($stream.ToArray())
            }
            finally { $stream.Dispose() }
        }
        finally { $bitmap.Dispose() }
    }
}
finally { $sourceBitmap.Dispose() }

[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
$file = [System.IO.File]::Create($destinationPath)
$writer = [System.IO.BinaryWriter]::new($file)
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$frames.Count)
    $offset = 6 + (16 * $frames.Count)
    for ($index = 0; $index -lt $frames.Count; $index++) {
        $size = $sizes[$index]
        $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
        $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$frames[$index].Length)
        $writer.Write([uint32]$offset)
        $offset += $frames[$index].Length
    }
    foreach ($frame in $frames) { $writer.Write($frame) }
}
finally {
    $writer.Dispose()
    $file.Dispose()
}

Write-Host "Built $destinationPath with $($frames.Count) icon sizes." -ForegroundColor Green
