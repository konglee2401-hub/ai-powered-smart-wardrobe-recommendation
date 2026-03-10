
import express from 'express';
import { 
  getProvidersWithModels, 
  updateProvider, 
  reorderProviders, 
  manageApiKeys,
  testProvider,
  syncModels,
  syncKeys
} from '../controllers/aiProviderController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// List providers and their models
router.get('/', optionalAuth, getProvidersWithModels);

// Sync models (Manual trigger) - MUST come before /:id routes
router.post('/sync', protect, syncModels);

// Sync API keys from environment to database - MUST come before /:id routes
router.post('/sync-keys', protect, syncKeys);

// Reorder providers (Drag & Drop) - MUST come before /:id routes
router.post('/reorder', protect, reorderProviders);

// Update provider config (e.g. enable/disable, settings)
router.put('/:id', protect, updateProvider);

// Test provider API connectivity
router.post('/:id/test', protect, testProvider);

// Manage API Keys (Add, Remove, Toggle)
router.post('/:id/keys', protect, manageApiKeys);

export default router;
