# FFmpeg Installation Guide

## Required for Frame Screenshot Extraction Feature

FFmpeg is required for the VideoSessionManager to extract PNG frames from generated videos. Without FFmpeg, frame extraction will fail.

---

## Installation Options

### Option 1: Download & Install (Recommended for Windows)

1. **Visit FFmpeg Official Site:**
   - Go to: https://ffmpeg.org/download.html
   
2. **Download Windows Build:**
   - Click "Windows builds by BtbN"
   - Download the latest full build (essentials are sufficient)
   - Extract to a folder (e.g., `C:\ffmpeg`)

3. **Add to System PATH:**
   - Open Environment Variables (Windows key + "environment")
   - Click "Environment Variables" button
   - Under "System variables", select "Path" and click "Edit"
   - Click "New" and add: `C:\ffmpeg\bin`
   - Click OK and restart your terminal

4. **Verify Installation:**
   ```bash
   ffmpeg -version
   ffprobe -version
   ```

---

### Option 2: Windows Package Manager (Windows 11+)

If you have Windows 11 with `winget`:

```powershell
winget install ffmpeg
```

Then restart your terminal and verify:
```bash
ffmpeg -version
```

---

### Option 3: Build from Source (Advanced)

If you need specific compilation options:

```bash
git clone https://git.ffmpeg.org/ffmpeg.git ffmpeg
cd ffmpeg
./configure --enable-gpl
make
make install
```

---

## Verification

After installation, verify both components are available:

```bash
# Check FFmpeg
ffmpeg -version

# Check FFprobe (required for getting video duration)
ffprobe -version

# Test frame extraction (if you have a test video)
ffmpeg -ss 0.5 -i input.mp4 -vframes 1 -q:v 2 output.png
```

### Expected Output

FFmpeg version should be 4.0 or higher:
```
ffmpeg version 4.4.2-1~rpmfusion
built with gcc 11.2.1
```

FFprobe should also be available:
```
ffprobe version 4.4.2-1~rpmfusion
```

---

## Troubleshooting

### Error: "ffmpeg: command not found"

**Solution:** 
- Ensure FFmpeg is installed
- Check PATH environment variable includes FFmpeg bin directory
- Restart terminal/IDE after adding to PATH
- Restart VS Code if working in terminal there

### Error: "ffprobe: executable not found"

**Solution:**
- FFprobe comes with FFmpeg, ensure you installed the "full" package, not just essentials
- Verify PATH includes FFmpeg bin directory
- Download latest build from BtbN: https://www.gyan.dev/ffmpeg/builds/

### Error in VideoSessionManager: "Failed to extract frame"

**Check:**
1. FFmpeg and ffprobe both installed and in PATH
2. Video file exists and is readable
3. uploads/sessions/ directory exists and is writable
4. Video format is supported (MP4, WebM, etc.)

**Test:**
```bash
# Manual test to verify your video can be processed
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:nounits=1 your_video.mp4
```

---

## For Docker Deployment

If running in Docker, install FFmpeg in your Dockerfile:

```dockerfile
# For Node.js Alpine image
RUN apk add --no-cache ffmpeg

# For Ubuntu/Debian based image
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
```

---

## System Requirements

- **Disk Space:** ~30-50 MB for FFmpeg installation
- **Memory:** Minimal impact (~5-10 MB per extract operation)
- **Supported Formats:** MP4, WebM, MKV, AVI, MOV, and more
- **Frame Extraction Time:** 2-5 seconds per video

---

## Alternative: Frame Extraction Without System FFmpeg

If you cannot install FFmpeg on your system:

1. **Use Cloud Video Processing:**
   - Integrate with Cloudinary, ImageKit, or AWS MediaConvert
   - They handle extraction server-side

2. **Browser-Based Extraction:**
   - Use ffmpeg.wasm (JavaScript FFmpeg)
   - Slower but works without system FFmpeg
   - Add to frontend: `npm install @ffmpeg/ffmpeg @ffmpeg/util`

3. **Disable Frame Feature:**
   - Remove VideoSessionManager.extractLastFrame() calls
   - Frame extraction will be skipped gracefully

---

## Installation Status Check

Run this command to verify your setup:

```bash
# Should show version info for both
ffmpeg -version && ffprobe -version

# Should show your Node version (v14+)
node --version

# Should show npm packages are installed
cd backend && npm list socket.io fluent-ffmpeg
cd ../frontend && npm list socket.io-client
```

---

## Next Steps After Installation

1. ✅ Verify FFmpeg is installed and in PATH
2. ⏳ Run integration tests in GrokServiceV2
3. ⏳ Test frame extraction with sample video
4. ⏳ Full end-to-end workflow testing

---

**Created:** 2026-02-21  
**Status:** Guide for system setup  
**Requires:** FFmpeg 4.0+ installed and in system PATH
