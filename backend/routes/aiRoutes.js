import express from 'express';
import aiController from '../controllers/aiController.js';
import optionsController from '../controllers/optionsController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/options', optionsController.getAllOptions);
router.get('/options/:category', optionsController.getOptionsByCategory);
router.get('/export', aiController.exportOptions);
router.get('/models', aiController.getAvailableModels);
router.get('/providers', aiController.getAvailableProviders);
router.get('/use-cases', aiController.getUseCases);
router.get('/focus-areas', aiController.getFocusAreas);

// Image analysis with fallback
router.post('/analyze-character', upload.single('image'), aiController.analyzeCharacterImage);
router.post('/analyze-product', upload.single('image'), aiController.analyzeProductImage);

// Build prompt from analysis
router.post('/build-prompt', aiController.buildPrompt);

// Options management
router.post('/options', optionsController.addOption);
router.post('/options/save-extracted', optionsController.saveExtractedOptions);
router.delete('/options/:category/:value', protect, optionsController.deleteOption);

// Protected routes (cần đăng nhập để thêm/xóa options)
router.post('/discover-options', protect, aiController.discoverOptions);

export default router;
