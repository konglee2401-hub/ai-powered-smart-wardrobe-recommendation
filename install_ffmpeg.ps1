# FFmpeg Installation Script for Windows
# Downloads and installs FFmpeg from official sources

$InstallPath = "C:\ffmpeg"
$TempPath = "$env:TEMP\ffmpeg_download"
$DownloadURL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

Write-Host "==============================================="
Write-Host "FFmpeg Installation for Windows"
Write-Host "==============================================="
Write-Host ""

# Check if already installed
Write-Host "Checking if FFmpeg is already installed..."
$existingFFmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($existingFFmpeg) {
    Write-Host "[OK] FFmpeg is already installed!"
    Write-Host "Location: $($existingFFmpeg.Source)"
    & ffmpeg -version | Select-Object -First 1
    exit 0
}

Write-Host "[INFO] FFmpeg not found, downloading..."
Write-Host ""

# Create temp directory
if (-not (Test-Path $TempPath)) {
    New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
}

# Download FFmpeg
Write-Host "[DOWNLOAD] Downloading FFmpeg from: $DownloadURL"

try {
    Invoke-WebRequest -Uri $DownloadURL -OutFile "$TempPath\ffmpeg.zip" -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Download complete!"
} catch {
    Write-Host "[ERROR] Download failed: $_"
    Write-Host ""
    Write-Host "Manual download: https://github.com/BtbN/FFmpeg-Builds/releases"
    exit 1
}

Write-Host ""
Write-Host "[EXTRACT] Extracting FFmpeg files..."

# Expand the zip file
try {
    Expand-Archive -Path "$TempPath\ffmpeg.zip" -DestinationPath $TempPath -Force -ErrorAction Stop
    Write-Host "[OK] Extraction complete!"
} catch {
    Write-Host "[ERROR] Extraction failed: $_"
    exit 1
}

Write-Host ""
Write-Host "[INSTALL] Installing to $InstallPath"

# Find the extracted ffmpeg directory
$extractedDir = Get-ChildItem -Path $TempPath -Directory | Where-Object { $_.Name -match "ffmpeg" } | Select-Object -First 1

if (-not $extractedDir) {
    Write-Host "[ERROR] Could not find extracted FFmpeg directory"
    exit 1
}

# Create install directory
if (Test-Path $InstallPath) {
    Write-Host "[INFO] Removing existing FFmpeg installation..."
    Remove-Item $InstallPath -Recurse -Force
}

New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null

# Copy files
Copy-Item -Path "$($extractedDir.FullName)\*" -Destination $InstallPath -Recurse -Force
Write-Host "[OK] Files installed!"

Write-Host ""
Write-Host "[PATH] Adding to System PATH..."

# Get current PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Check if already in PATH
if ($currentPath -like "*$InstallPath*") {
    Write-Host "[OK] Already in PATH"
} else {
    # Add to PATH
    $newPath = "$InstallPath;$currentPath"
    
    try {
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Host "[OK] Added to system PATH"
    } catch {
        Write-Host "[WARNING] Could not add to system PATH"
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($userPath -notlike "*$InstallPath*") {
            $newUserPath = "$InstallPath;$userPath"
            [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
            Write-Host "[OK] Added to user PATH"
        }
    }
}

Write-Host ""
Write-Host "[CLEANUP] Removing temporary files..."
Remove-Item $TempPath -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Cleanup complete!"

Write-Host ""
Write-Host "==============================================="
Write-Host "[SUCCESS] FFmpeg Installation Complete!"
Write-Host "==============================================="
Write-Host ""
Write-Host "Installation path: $InstallPath"
Write-Host ""
Write-Host "[IMPORTANT] Restart your terminal or IDE for changes to take effect"
Write-Host ""
Write-Host "To verify installation, run:"
Write-Host "  ffmpeg -version"
Write-Host "  ffprobe -version"
Write-Host ""
