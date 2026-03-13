import express from 'express';
import { register, login, getProfile, refresh, logout, googleLogin, getAccess } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/profile', protect, getProfile);
router.get('/access', protect, getAccess);

export default router;
