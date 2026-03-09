import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
let ffmpegAvailability = null;

export async function isFfmpegAvailable() {
  if (ffmpegAvailability != null) {
    return ffmpegAvailability;
  }

  try {
    await execFileAsync('ffmpeg', ['-version']);
    ffmpegAvailability = true;
  } catch {
    ffmpegAvailability = false;
  }

  return ffmpegAvailability;
}

export async function extractLastFrame(videoPath, outputPath) {
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg || !videoPath || !fs.existsSync(videoPath)) {
    return null;
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .on('end', () => resolve(outputPath))
      .on('error', () => resolve(null))
      .screenshots({
        timestamps: ['99%'],
        filename: path.basename(outputPath),
        folder: outputDir,
        size: '720x1280'
      });
  });
}

export async function concatenateVideos(videoPaths = [], outputPath) {
  const filteredPaths = videoPaths.filter((videoPath) => videoPath && fs.existsSync(videoPath));
  if (filteredPaths.length === 0) {
    return null;
  }

  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg || filteredPaths.length === 1) {
    return filteredPaths[0];
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const listFile = path.join(outputDir, `concat-${Date.now()}.txt`);
  fs.writeFileSync(listFile, filteredPaths.map((videoPath) => `file '${videoPath.replace(/'/g, "''")}'`).join('\n'));

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      outputPath
    ]);
    return outputPath;
  } catch {
    return filteredPaths[0];
  } finally {
    if (fs.existsSync(listFile)) {
      fs.unlinkSync(listFile);
    }
  }
}
