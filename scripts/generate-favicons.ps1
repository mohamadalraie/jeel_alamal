Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Administrator\Desktop\logo.png"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = "d:\jeel_alamal\frontend\public\logo.png"
}

Write-Host "Source image: $sourcePath"
$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image {
    param(
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$outputPath
    )

    $target = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Clear background with transparent
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($img, 0, 0, $width, $height)

    # Save format
    if ($outputPath.EndsWith(".ico")) {
        $icon = [System.Drawing.Icon]::FromHandle($target.GetHicon())
        $stream = [System.IO.File]::Create($outputPath)
        $icon.Save($stream)
        $stream.Close()
        $icon.Dispose()
    } else {
        $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $graphics.Dispose()
    $target.Dispose()
    Write-Host "Generated: $outputPath ($width x $height)"
}

# 1. Favicon 32x32 ICO & PNG
Resize-Image -img $sourceImg -width 32 -height 32 -outputPath "d:\jeel_alamal\frontend\public\favicon.ico"
Resize-Image -img $sourceImg -width 32 -height 32 -outputPath "d:\jeel_alamal\frontend\src\app\favicon.ico"
Resize-Image -img $sourceImg -width 32 -height 32 -outputPath "d:\jeel_alamal\frontend\src\app\icon.png"

# 2. App Icons & Apple Touch Icon
Resize-Image -img $sourceImg -width 180 -height 180 -outputPath "d:\jeel_alamal\frontend\public\icons\apple-touch-icon.png"
Resize-Image -img $sourceImg -width 192 -height 192 -outputPath "d:\jeel_alamal\frontend\public\icons\icon-192.png"
Resize-Image -img $sourceImg -width 512 -height 512 -outputPath "d:\jeel_alamal\frontend\public\icons\icon-512.png"

$sourceImg.Dispose()
Write-Host "Favicons generated successfully!"
