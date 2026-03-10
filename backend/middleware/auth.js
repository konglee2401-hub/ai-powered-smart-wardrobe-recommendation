import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('⚠️ No token provided');
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    console.log('🔐 Token found, verifying...', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✓ Token valid, decoded user id:', decoded.id);
    
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.log('❌ User not found in database for id:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        message: 'User not found',
        error: 'User ID in token does not exist in database'
      });
    }
    
    // Add 'id' property for backward compatibility (map _id to id)
    req.user.id = req.user._id.toString();
    
    console.log('✅ Auth success for user:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
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
    } else {
      req.user = undefined;
    }
    next();
  } catch (error) {
    // Continue without user on error
    req.user = undefined;
    next();
  }
};

// Alias export for convenience
export const auth = protect;

export default { protect, auth, optionalAuth };
