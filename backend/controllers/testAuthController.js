/**
 * Test authentication controller
 * Provides simple login for testing without registration
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const testLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // For testing, also accept plain text password check
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token - never expires for testing
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: undefined } // Never expires
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteTestUser = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to delete test user'
      });
    }

    const result = await User.deleteOne({ email });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test user not found'
      });
    }

    res.json({
      success: true,
      message: `Test user ${email} deleted successfully`
    });
  } catch (error) {
    console.error('Delete test user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
