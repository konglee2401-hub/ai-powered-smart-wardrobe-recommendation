import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  analyzeImages,
  generateImageFromAnalysis,
  generateVideoFromImage,
} from '../controllers/pipelineController.js';

const router = express.Router();

router.use(protect);

router.post(
  '/analyze',
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'productImage', maxCount: 1 },
  ]),
  analyzeImages
);

router.post('/generate-image', generateImageFromAnalysis);

router.post('/generate-video', generateVideoFromImage);

export default router;

