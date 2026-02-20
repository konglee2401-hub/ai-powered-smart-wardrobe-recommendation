@echo off
REM FFmpeg Installation for Windows - Manual Setup
REM This script downloads, extracts, and configures FFmpeg for Windows

echo.
echo ===============================================
echo FFmpeg Installation Helper for Windows
echo ===============================================
echo.

REM Check if FFmpeg is already installed
where ffmpeg >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] FFmpeg is already installed!
    ffmpeg -version | findstr /B "ffmpeg"
    exit /b 0
)

echo [INFO] FFmpeg will be installed to: C:\ffmpeg
echo.
echo Choose installation method:
echo 1. Automatic download (requires internet)
echo 2. Manual download instructions
echo.

REM Since we're using a script, let's go with the automatic approach
echo [INFO] Starting automatic download...
echo.

REM Create temp directory
if not exist "%TEMP%\ffmpeg_install" mkdir "%TEMP%\ffmpeg_install"

REM Download using PowerShell
echo [DOWNLOAD] Downloading FFmpeg...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile '%TEMP%\ffmpeg_install\ffmpeg.zip' -UseBasicParsing" 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Download failed!
    echo.
    echo Manual installation:
    echo 1. Visit: https://github.com/BtbN/FFmpeg-Builds/releases
    echo 2. Download: ffmpeg-master-latest-win64-gpl.zip
    echo 3. Extract to: C:\ffmpeg
    echo 4. Add C:\ffmpeg to system PATH
    echo.
    pause
    exit /b 1
)

echo [OK] Download complete!
echo.

echo [EXTRACT] Extracting FFmpeg...
powershell -Command "Expand-Archive -Path '%TEMP%\ffmpeg_install\ffmpeg.zip' -DestinationPath '%TEMP%\ffmpeg_install' -Force" 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Extraction failed!
    pause
    exit /b 1
)

echo [OK] Extraction complete!
echo.

echo [INSTALL] Installing FFmpeg to C:\ffmpeg...
if exist "C:\ffmpeg" (
    echo [INFO] Removing existing installation...
    rmdir /s /q "C:\ffmpeg" 2>nul
)

mkdir C:\ffmpeg

REM Find and copy FFmpeg files
for /d %%D in ("%TEMP%\ffmpeg_install\*ffmpeg*") do (
    echo [INFO] Found FFmpeg directory, copying files...
    xcopy "%%D\*" "C:\ffmpeg" /E /H /Y >nul 2>&1
    goto :found
)

:found
if exist "C:\ffmpeg\bin\ffmpeg.exe" (
    echo [OK] FFmpeg installed successfully!
) else (
    echo [ERROR] FFmpeg executable not found after installation!
    pause
    exit /b 1
)

echo.
echo [PATH] Updating system PATH...

REM Add to PATH using setx (permanent)
setx PATH "C:\ffmpeg;%PATH%" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Added to system PATH (permanent)
) else (
    echo [WARNING] Could not update system PATH
    echo Please manually add C:\ffmpeg to your PATH environment variable
)

echo.
echo [CLEANUP] Removing temporary files...
rmdir /s /q "%TEMP%\ffmpeg_install" 2>nul
echo [OK] Cleanup complete!

echo.
echo ===============================================
echo [SUCCESS] FFmpeg Installation Complete!
echo ===============================================
echo.
echo Installation path: C:\ffmpeg
echo.
echo [IMPORTANT] Restart your terminal or IDE for changes to take effect
echo.
echo To verify installation, run:
echo   ffmpeg -version
echo   ffprobe -version
echo.

pause
