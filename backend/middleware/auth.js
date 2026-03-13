import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User is disabled',
      });
    }

    req.user.id = req.user._id.toString();
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized', error: error.message });
  }
};

// Optional auth - allows anonymous but sets req.user if token provided
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user?.status !== 'active') {
        req.user = undefined;
      }
    } else {
      req.user = undefined;
    }
    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
};

// Alias export for convenience
export const auth = protect;
export const authMiddleware = protect;

export default { protect, auth, optionalAuth, authMiddleware };
