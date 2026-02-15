import express from 'express';
import { buildVideoPrompt, generateVideo } from '../controllers/videoController.js';

const router = express.Router();

// Build video prompt
router.post('/build-prompt', buildVideoPrompt);

// Generate video
router.post('/generate', generateVideo);

export default router;