/**
 * Video Mashup Service
 * - Merge 2 videos in split layout (main 2/3, template 1/3)
 * - Add audio tracks with proper timing
 * - Add captions and transitions
 * - Export video with platform-specific optimization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');

class VideoMashupService {
  constructor() {
    this.ensureDirectories();
    this.ffmpegPath = 'ffmpeg'; // Requires ffmpeg installed
  }

  ensureDirectories() {
    const dirs = ['templates', 'hot-videos', 'audio', 'products', 'mashups', 'queue'];
    dirs.forEach(dir => {
      const dirPath = path.join(mediaDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Get video duration using ffmpeg
   */
  getVideoDuration(videoPath) {
    try {
      const cmd = `${this.ffmpegPath} -i "${videoPath}" 2>&1 | grep Duration`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const match = output.match(/Duration: (\d+):(\d+):(\d+)/);
      
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    } catch (error) {
      console.error('Error getting video duration:', error);
      return 0;
    }
  }

  /**
   * Merge 2 videos in split layout
   * Layout: Main video (2/3 width) + Template video (1/3 width)
   */
  mergeVideos(config) {
    try {
      const {
        mainVideoPath,
        templateVideoPath,
        outputPath,
        videoDuration = 30,
        layout = 'side', // side, pip (picture-in-picture), overlay
        mainPosition = 'left', // left or right
        includeAudio = true,
        audioFromMain = true
      } = config;

      if (!fs.existsSync(mainVideoPath)) {
        return {
          success: false,
          error: `Main video not found: ${mainVideoPath}`
        };
      }

      if (!fs.existsSync(templateVideoPath)) {
        return {
          success: false,
          error: `Template video not found: ${templateVideoPath}`
        };
      }

      const mainDuration = this.getVideoDuration(mainVideoPath);
      const templateDuration = this.getVideoDuration(templateVideoPath);

      if (mainDuration < videoDuration) {
        return {
          success: false,
          error: `Main video duration (${mainDuration}s) less than target (${videoDuration}s)`
        };
      }

      // Build FFmpeg complex filter
      let filter = '';
      
      if (layout === 'side') {
        // Split screen: Main (2/3) + Template (1/3)
        if (mainPosition === 'left') {
          // Apply looping to template if needed
          filter = `[0:v]scale=W*2/3:H[main];` +
                   `[1:v]scale=W/3:H[template];` +
                   `[main][template]hstack=inputs=2[v]`;
        } else {
          // Right position
          filter = `[0:v]scale=W*2/3:H[main];` +
                   `[1:v]scale=W/3:H[template];` +
                   `[template][main]hstack=inputs=2[v]`;
        }
      } else if (layout === 'pip') {
        // Picture in picture: template in corner
        filter = `[0:v]scale=W:H[main];` +
                 `[1:v]scale=W/3:H/3[template];` +
                 `[main][template]overlay=W-W/3-10:H-H/3-10[v]`;
      }

      // Audio mapping
      let audioMap = '';
      if (includeAudio) {
        audioMap = audioFromMain ? '-map 0:a:0' : '-map 1:a:0';
      }

      // FFmpeg command
      const cmd = `${this.ffmpegPath} ` +
                  `-i "${mainVideoPath}" ` +
                  `-i "${templateVideoPath}" ` +
                  `-filter_complex "${filter}" ` +
                  `-vf "fps=30" ` +
                  `-t ${videoDuration} ` +
                  `${audioMap} ` +
                  `-c:v libx264 -crf 23 ` +
                  `-c:a aac -b:a 192k ` +
                  `-y "${outputPath}"`;

      console.log(`🎬 Merging videos...`);
      execSync(cmd, { 
        stdio: 'inherit',
        shell: '/bin/bash'
      });

      return {
        success: true,
        outputPath,
        duration: videoDuration,
        layout,
        fileSize: fs.statSync(outputPath).size,
        message: 'Videos merged successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add audio track to video
   */
  addAudioTrack(config) {
    try {
      const {
        videoPath,
        audioPath,
        outputPath,
        fadeDuration = 1, // Fade in/out duration
        volume = 1.0, // Audio volume (0.0-1.0)
        useVideoAudio = true // Mix with existing audio
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }

      if (!fs.existsSync(audioPath)) {
        return { success: false, error: `Audio not found: ${audioPath}` };
      }

      const videoDuration = this.getVideoDuration(videoPath);
      const audioToFit = videoDuration;

      // FFmpeg filter for fade in/out and volume
      const audioFilter = `afade=t=in:st=0:d=${fadeDuration},` +
                         `afade=t=out:st=${audioToFit - fadeDuration}:d=${fadeDuration},` +
                         `volume=${volume}`;

      const audioMap = useVideoAudio ? 
        `[0:a][1:a]amix=inputs=2:duration=first[a]` :
        `[1:a]${audioFilter}[a]`;

      const cmd = `${this.ffmpegPath} ` +
                  `-i "${videoPath}" ` +
                  `-i "${audioPath}" ` +
                  `-filter_complex "${audioMap}" ` +
                  `-map 0:v:0 -map "[a]" ` +
                  `-t ${videoDuration} ` +
                  `-c:v copy ` +
                  `-c:a aac -b:a 192k ` +
                  `-y "${outputPath}"`;

      console.log(`🎵 Adding audio track...`);
      execSync(cmd, { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        duration: videoDuration,
        audioPath,
        volume,
        message: 'Audio added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add captions/subtitles overlay to video
   */
  addCaptions(config) {
    try {
      const {
        videoPath,
        outputPath,
        captions = [], // Array of {text, startTime, endTime, position}
        fontSize = 24,
        fontColor = 'white',
        backgroundColor = 'black@0.5'
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }

      if (captions.length === 0) {
        return { success: false, error: 'No captions provided' };
      }

      // Build SRT file for subtitles
      let srtContent = '';
      captions.forEach((cap, i) => {
        const startTime = this.formatTimestamp(cap.startTime);
        const endTime = this.formatTimestamp(cap.endTime);
        srtContent += `${i + 1}\n${startTime} --> ${endTime}\n${cap.text}\n\n`;
      });

      const srtPath = outputPath.replace('.mp4', '.srt');
      fs.writeFileSync(srtPath, srtContent);

      // FFmpeg filter with subtitles
      const filter = `subtitles=${srtPath}:force_style='FontSize=${fontSize},` +
                    `PrimaryColour=&H${this.colorToHex(fontColor)}&'`;

      const cmd = `${this.ffmpegPath} ` +
                  `-i "${videoPath}" ` +
                  `-vf "${filter}" ` +
                  `-c:v libx264 -crf 23 ` +
                  `-c:a copy ` +
                  `-y "${outputPath}"`;

      console.log(`📝 Adding captions...`);
      execSync(cmd, { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        captionCount: captions.length,
        srtPath,
        message: 'Captions added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply transition between clips
   */
  applyTransition(config) {
    try {
      const {
        videoPath,
        outputPath,
        transitionType = 'fade', // fade, dissolve, wiperight, slideleft, etc.
        transitionDuration = 0.5
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }

      // Note: Full transitions require 2+ video inputs
      // For single video, we apply visual effects instead
      let filter = '';

      switch (transitionType) {
        case 'fade':
          filter = 'fade=t=in:st=0:d=1,fade=t=out:st=-1:d=1';
          break;
        case 'zoom':
          filter = 'scale=ih*16/9:-1,boxblur=luma_radius=min(h\\,w)/20:luma_power=1:chroma_radius=min(cw\\,ch)/20:chroma_power=1:luma_sadct=0';
          break;
        case 'blur':
          filter = 'boxblur=10';
          break;
        default:
          filter = 'fade=t=in:st=0:d=1';
      }

      const cmd = `${this.ffmpegPath} ` +
                  `-i "${videoPath}" ` +
                  `-vf "${filter}" ` +
                  `-c:v libx264 -crf 23 ` +
                  `-c:a copy ` +
                  `-y "${outputPath}"`;

      console.log(`✨ Applying transition: ${transitionType}`);
      execSync(cmd, { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        transitionType,
        message: 'Transition applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate complete mashup video with all effects
   */
  generateMashupVideo(config) {
    try {
      const {
        mainVideoPath,
        templateVideoPath,
        audioPath,
        outputPath,
        captions = [],
        videoDuration = 30,
        layout = 'side',
        transitionType = 'fade',
        volume = 0.8,
        metadata = {}
      } = config;

      console.log(`🎬 === GENERATING MASHUP VIDEO ===`);
      console.log(`   Main: ${path.basename(mainVideoPath)}`);
      console.log(`   Template: ${path.basename(templateVideoPath)}`);
      console.log(`   Duration: ${videoDuration}s`);

      // Step 1: Merge videos
      const mergeOutput = path.join(path.dirname(outputPath), 'merged.mp4');
      const mergeResult = this.mergeVideos({
        mainVideoPath,
        templateVideoPath,
        outputPath: mergeOutput,
        videoDuration,
        layout
      });

      if (!mergeResult.success) {
        return mergeResult;
      }

      // Step 2: Add audio
      let finalOutput = outputPath;
      if (audioPath && fs.existsSync(audioPath)) {
        const audioOutput = path.join(path.dirname(outputPath), 'with-audio.mp4');
        const audioResult = this.addAudioTrack({
          videoPath: mergeOutput,
          audioPath,
          outputPath: audioOutput,
          volume
        });

        if (!audioResult.success) {
          return audioResult;
        }

        finalOutput = audioOutput;
      }

      // Step 3: Add captions
      if (captions.length > 0) {
        const captionOutput = outputPath;
        const captionResult = this.addCaptions({
          videoPath: finalOutput,
          outputPath: captionOutput,
          captions
        });

        if (!captionResult.success) {
          return captionResult;
        }

        finalOutput = captionOutput;
      }

      // Cleanup intermediate files
      if (fs.existsSync(mergeOutput) && mergeOutput !== finalOutput) {
        fs.unlinkSync(mergeOutput);
      }

      const finalSize = fs.statSync(finalOutput).size;
      const finalSizeM = (finalSize / (1024 * 1024)).toFixed(2);

      console.log(`✅ Mashup video created successfully`);
      console.log(`   Output: ${finalOutput}`);
      console.log(`   Size: ${finalSizeM} MB`);

      return {
        success: true,
        outputPath: finalOutput,
        duration: videoDuration,
        fileSize: finalSize,
        layout,
        metadata,
        message: 'Mashup video generated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format seconds to timestamp HH:MM:SS,MS
   */
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Convert color name to hex for FFmpeg
   */
  colorToHex(color) {
    const colors = {
      'white': 'FFFFFF',
      'black': '000000',
      'red': 'FF0000',
      'green': '00FF00',
      'blue': '0000FF',
      'yellow': 'FFFF00',
      'cyan': '00FFFF',
      'magenta': 'FF00FF'
    };
    return colors[color.toLowerCase()] || 'FFFFFF';
  }

  /**
   * Get supported video codecs and formats
   */
  getSupportedFormats() {
    return {
      codecs: ['h264', 'h265', 'vp9', 'av1'],
      formats: ['mp4', 'mkv', 'webm', 'mov'],
      audioCodecs: ['aac', 'libmp3lame', 'libopus'],
      audioFormats: ['mp3', 'aac', 'opus', 'wav']
    };
  }
}

export default new VideoMashupService();
