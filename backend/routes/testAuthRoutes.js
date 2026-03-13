import express from 'express';
import { testLogin, deleteTestUser } from '../controllers/testAuthController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('admin'));

// Test login route
router.post('/login', testLogin);

// Test delete user route (for cleanup during testing/development)
router.delete('/delete-test-user', deleteTestUser);

export default router;
