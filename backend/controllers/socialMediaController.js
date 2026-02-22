import SocialMediaAccount from '../models/SocialMediaAccount.js';
import { validateRequest, handleError } from '../middleware/errorHandler.js';

// Get all social media accounts for a user
export const getAllAccounts = async (req, res) => {
  try {
    validateRequest(req, ['userId']);
    const accounts = await SocialMediaAccount.find({ userId: req.user.id });
    res.json({ success: true, accounts });
  } catch (err) {
    handleError(res, err);
  }
};

// Create a new social media account
export const createAccount = async (req, res) => {
  try {
    validateRequest(req, ['platform', 'username']);
    
    const account = new SocialMediaAccount({
      userId: req.user.id,
      platform: req.body.platform,
      username: req.body.username,
      displayName: req.body.displayName || req.body.username,
      accessToken: req.body.accessToken,
      refreshToken: req.body.refreshToken,
      tokenExpiresAt: req.body.tokenExpiresAt,
      apiKey: req.body.apiKey,
      apiSecret: req.body.apiSecret
    });

    const savedAccount = await account.save();
    res.status(201).json({ 
      success: true, 
      message: `${req.body.platform} account created successfully`,
      account: savedAccount 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get a specific account
export const getAccount = async (req, res) => {
  try {
    const account = await SocialMediaAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    res.json({ success: true, account });
  } catch (err) {
    handleError(res, err);
  }
};

// Update an account
export const updateAccount = async (req, res) => {
  try {
    const account = await SocialMediaAccount.findByIdAndUpdate(
      req.params.id,
      {
        displayName: req.body.displayName,
        accessToken: req.body.accessToken,
        refreshToken: req.body.refreshToken,
        tokenExpiresAt: req.body.tokenExpiresAt,
        apiKey: req.body.apiKey,
        apiSecret: req.body.apiSecret,
        statusMessage: req.body.statusMessage
      },
      { new: true }
    );
    
    res.json({ success: true, message: 'Account updated successfully', account });
  } catch (err) {
    handleError(res, err);
  }
};

// Delete an account
export const deleteAccount = async (req, res) => {
  try {
    await SocialMediaAccount.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    handleError(res, err);
  }
};

// Test connection for an account
export const testConnection = async (req, res) => {
  try {
    const account = await SocialMediaAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    // Implementation would depend on each platform's API
    // This is a placeholder structure
    const isConnected = account.status === 'verified';
    
    res.json({ 
      success: true, 
      connected: isConnected,
      platform: account.platform,
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Record a post for an account
export const recordPost = async (req, res) => {
  try {
    validateRequest(req, ['videoId']);
    
    const account = await SocialMediaAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    account.recordPost(req.body.videoId, req.body.postUrl, req.body.timestamp);
    await account.save();
    
    res.json({ success: true, message: 'Post recorded successfully', account });
  } catch (err) {
    handleError(res, err);
  }
};

// Check if account can post
export const canPostNow = async (req, res) => {
  try {
    const account = await SocialMediaAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    const canPost = account.canPostNow();
    const rateLimitInfo = {
      can_post: canPost,
      platform: account.platform,
      daily_limit: account.rateLimit.dailyPostLimit,
      posts_today: account.rateLimit.postsToday,
      cooldown_minutes: account.rateLimit.cooldownMinutes,
      next_available_at: account.rateLimit.lastPostTime
    };
    
    res.json({ success: true, ...rateLimitInfo });
  } catch (err) {
    handleError(res, err);
  }
};

// Get account statistics
export const getStats = async (req, res) => {
  try {
    const account = await SocialMediaAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    
    const stats = {
      platform: account.platform,
      username: account.username,
      status: account.status,
      total_posts: account.postHistory.length,
      posts_today: account.rateLimit.postsToday,
      consecutive_errors: account.consecutiveErrors,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
      last_post: account.postHistory[account.postHistory.length - 1] || null
    };
    
    res.json({ success: true, stats });
  } catch (err) {
    handleError(res, err);
  }
};
