import express from 'express';
import { testLogin } from '../controllers/testAuthController.js';

const router = express.Router();

// Test login route
router.post('/login', testLogin);

export default router;
