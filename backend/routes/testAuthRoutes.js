import express from 'express';
import { testLogin, deleteTestUser } from '../controllers/testAuthController.js';

const router = express.Router();

// Test login route
router.post('/login', testLogin);

// Test delete user route (for cleanup during testing/development)
router.delete('/delete-test-user', deleteTestUser);

export default router;
