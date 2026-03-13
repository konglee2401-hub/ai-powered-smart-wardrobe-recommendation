import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import {
  listUsers,
  updateUser,
  getSystemSettingsController,
  updateSystemSettings,
} from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

router.get('/users', listUsers);
router.patch('/users/:id', updateUser);

router.get('/system-settings', getSystemSettingsController);
router.put('/system-settings', updateSystemSettings);

export default router;
