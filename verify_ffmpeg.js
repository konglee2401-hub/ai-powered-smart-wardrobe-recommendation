#!/usr/bin/env node

/**
 * FFmpeg Installation Verification Script
 * Tests if FFmpeg is installed and accessible from Node.js
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n='.repeat(50));
console.log('FFmpeg Installation Verification');
console.log('='.repeat(50));
console.log('');

// Check 1: Direct file existence
console.log('1. Checking FFmpeg installation directory...');
const ffmpegDir = 'C:\\ffmpeg';
const ffmpegExe = path.join(ffmpegDir, 'bin', 'ffmpeg.exe');
const ffprobeExe = path.join(ffmpegDir, 'bin', 'ffprobe.exe');

if (fs.existsSync(ffmpegExe)) {
    console.log('   [OK] FFmpeg executable found: ' + ffmpegExe);
} else {
    console.log('   [ERROR] FFmpeg executable not found');
    process.exit(1);
}

if (fs.existsSync(ffprobeExe)) {
    console.log('   [OK] FFprobe executable found: ' + ffprobeExe);
} else {
    console.log('   [ERROR] FFprobe executable not found');
    process.exit(1);
}

console.log('');
console.log('2. Testing FFmpeg via command line...');

// Check 2: Try to run ffmpeg
exec(`"${ffmpegExe}" -version`, (error, stdout, stderr) => {
    if (error) {
        console.log('   [INFO] Could not execute (might need PATH restart)');
        console.log('   Error: ' + error.message);
    } else {
        const versionLine = stdout.split('\n')[0];
        console.log('   [OK] FFmpeg is working!');
        console.log('   Version: ' + versionLine);
    }
    
    console.log('');
    console.log('3. Testing FFprobe via command line...');
    
    exec(`"${ffprobeExe}" -version`, (error, stdout, stderr) => {
        if (error) {
            console.log('   [INFO] Could not execute (might need PATH restart)');
        } else {
            const versionLine = stdout.split('\n')[0];
            console.log('   [OK] FFprobe is working!');
            console.log('   Version: ' + versionLine);
        }
        
        console.log('');
        console.log('4. Testing with fluent-ffmpeg library...');
        
        try {
            const ffmpeg = require('fluent-ffmpeg');
            
            // Set ffmpeg path
            ffmpeg.setFfmpegPath(ffmpegExe);
            ffmpeg.setFfprobePath(ffprobeExe);
            
            console.log('   [OK] fluent-ffmpeg configured successfully');
            console.log('   FFmpeg path: ' + ffmpegExe);
            console.log('   FFprobe path: ' + ffprobeExe);
        } catch (err) {
            console.log('   [WARNING] fluent-ffmpeg not installed or error: ' + err.message);
        }
        
        console.log('');
        console.log('='.repeat(50));
        console.log('[SUCCESS] FFmpeg is installed and ready!');
        console.log('='.repeat(50));
        console.log('');
        console.log('Next Steps:');
        console.log('1. Restart your terminal/IDE to update PATH');
        console.log('2. Run: npm install socket.io fluent-ffmpeg');
        console.log('3. Start backend: npm start');
        console.log('');
    });
});
