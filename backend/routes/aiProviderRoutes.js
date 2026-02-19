
import express from 'express';
import { 
  getProvidersWithModels, 
  updateProvider, 
  reorderProviders, 
  manageApiKeys,
  syncModels
} from '../controllers/aiProviderController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// List providers and their models
router.get('/', optionalAuth, getProvidersWithModels);

// Update provider config (e.g. enable/disable, settings)
router.put('/:id', protect, updateProvider);

// Reorder providers (Drag & Drop)
router.post('/reorder', protect, reorderProviders);

// Manage API Keys (Add, Remove, Toggle)
router.post('/:id/keys', protect, manageApiKeys);

// Sync models (Manual trigger)
router.post('/sync', protect, syncModels);

export default router;
