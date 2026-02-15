import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from '../controllers/promptTemplateController.js';

const router = express.Router();

router.use(protect);

// CRUD routes
router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

// Utility route
router.post('/preview', previewTemplate);

export default router;
