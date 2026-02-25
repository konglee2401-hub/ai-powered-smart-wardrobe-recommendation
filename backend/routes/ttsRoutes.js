/**
 * TTS Routes - Text-to-Speech API endpoints
 */

import express from 'express';
import multer from 'multer';
import TTSController from '../controllers/ttsController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fieldSize: 50 * 1024 * 1024,
    fileSize: 100 * 1024 * 1024, // 100MB max for video
  },
});

/**
 * Generate TTS audio from text
 * POST /api/tts/generate
 * Body: { text, voiceName, language }
 */
router.post('/generate', TTSController.generateAudio);

/**
 * Generate and save TTS audio file
 * POST /api/tts/generate-and-save
 * Body: { text, voiceName, language, fileName }
 */
router.post('/generate-and-save', TTSController.generateAndSaveAudio);

/**
 * Stream audio file
 * GET /api/tts/stream/:filename
 */
router.get('/stream/:filename', TTSController.streamAudio);

/**
 * Download audio file
 * GET /api/tts/download/:filename
 */
router.get('/download/:filename', TTSController.downloadAudio);

/**
 * Analyze video and generate script using ChatGPT
 * POST /api/tts/analyze-and-script
 * Body: { videoPath, platform, productImage, productName, productDescription }
 */
router.post('/analyze-and-script', TTSController.analyzeVideoAndGenerateScript);

/**
 * Estimate audio duration from text
 * POST /api/tts/estimate-duration
 * Body: { text }
 */
router.post('/estimate-duration', TTSController.estimateDuration);

export default router;
