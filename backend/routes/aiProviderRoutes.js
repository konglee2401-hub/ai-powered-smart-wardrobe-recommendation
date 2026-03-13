
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
import { protect } from '../middleware/auth.js';
import { attachAccess, requireRole, requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';
import { requireActiveSubscription } from '../middleware/subscription.js';

const router = express.Router();

// List providers and their models
router.get('/', protect, requireActiveSubscription, requireMenuAccess('generation'), requireApiAccess('generation'), attachAccess, getProvidersWithModels);

// Sync models (Manual trigger) - MUST come before /:id routes
router.post('/sync', protect, requireRole('admin'), syncModels);

// Sync API keys from environment to database - MUST come before /:id routes
router.post('/sync-keys', protect, requireRole('admin'), syncKeys);

// Reorder providers (Drag & Drop) - MUST come before /:id routes
router.post('/reorder', protect, requireRole('admin'), reorderProviders);

// Update provider config (e.g. enable/disable, settings)
router.put('/:id', protect, requireRole('admin'), updateProvider);

// Test provider API connectivity
router.post('/:id/test', protect, requireRole('admin'), testProvider);

// Manage API Keys (Add, Remove, Toggle)
router.post('/:id/keys', protect, requireRole('admin'), manageApiKeys);

export default router;
