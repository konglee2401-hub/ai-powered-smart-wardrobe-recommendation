import SocialMediaAccount from '../models/SocialMediaAccount.js';
import { validateRequest, handleError } from '../middleware/errorHandler.js';
import youtubeOAuthService from '../services/youtubeOAuthService.js';

// Get all social media accounts (PUBLIC endpoint - list all connected channels)
export const getAllAccounts = async (req, res) => {
  try {
    // Get all YouTube accounts (filter by platform)
    const { platform, isActive } = req.query;
    
    let query = {};
    if (platform) query.platform = platform;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const accounts = await SocialMediaAccount.find(query)
      .select('-credentials.accessToken -credentials.refreshToken') // Don't expose tokens in list
      .sort({ createdAt: -1 });
    
    console.log(`✅ Retrieved ${accounts.length} accounts`);
    res.json({ 
      success: true, 
      accounts: accounts,
      total: accounts.length
    });
  } catch (err) {
    console.error('getAllAccounts error:', err);
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

// ==================== YouTube OAuth Methods ====================

/**
 * Start YouTube OAuth flow
 * GET /api/social-media/youtube/oauth/start
 * PUBLIC endpoint - no authentication required
 * Returns OAuth URL for frontend to redirect to
 */
export const youtubeOAuthStart = async (req, res) => {
  try {
    // Generate OAuth URL (no userId needed)
    const authUrl = youtubeOAuthService.getAuthUrl();
    
    // Return the URL as JSON so frontend can redirect
    console.log('📝 [OAuth] Generated auth URL');
    res.json({ 
      success: true, 
      authUrl: authUrl,
      message: 'Redirect to the authUrl to connect your YouTube channel'
    });
  } catch (err) {
    console.error('❌ [OAuth Start Error]', err.message);
    handleError(res, err);
  }
};

/**
 * Handle YouTube OAuth callback
 * GET /api/social-media/youtube/oauth/callback?code=X
 * PUBLIC endpoint - no authentication required
 * Exchanges auth code for tokens and creates/updates social account
 */
export const youtubeOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Handle OAuth error from Google
    if (error) {
      console.log(`⚠️ [OAuth Error] ${error}: ${error_description}`);
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/social-accounts?error=${error}&description=${error_description}`;
      return res.redirect(frontendUrl);
    }
    
    if (!code) {
      console.log('❌ [OAuth] Missing authorization code');
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/social-accounts?error=missing_code`;
      return res.redirect(frontendUrl);
    }

    // Handle OAuth callback (code exchange for tokens)
    console.log('🔄 [OAuth] Processing authorization code...');
    const result = await youtubeOAuthService.handleOAuthCallback(code);
    
    if (!result.success) {
      console.log('❌ [OAuth] Failed to handle callback:', result);
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/social-accounts?error=oauth_failed`;
      return res.redirect(frontendUrl);
    }

    // Redirect to frontend with success
    console.log(`✅ [OAuth] Success - Redirecting to frontend`);
    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/social-accounts?connected=youtube&accountId=${result.account._id}&channelId=${result.account.channelId}`;
    res.redirect(frontendUrl);
  } catch (err) {
    console.error('❌ [OAuth Callback Error]', err.message);
    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/social-accounts?error=callback_error`;
    res.redirect(frontendUrl);
  }
};

/**
 * Verify a YouTube account connection
 * POST /api/social-media/youtube/verify/:id
 */
export const verifyYoutubeAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await SocialMediaAccount.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.platform !== 'youtube') {
      return res.status(400).json({ success: false, message: 'Account is not a YouTube account' });
    }

    // Verify the account
    const result = await youtubeOAuthService.verifyAccount(account);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Save updated account
    await account.save();
    
    res.json({ 
      success: true, 
      message: 'Account verified successfully',
      account: {
        id: account._id,
        platform: account.platform,
        username: account.username,
        displayName: account.displayName,
        isVerified: account.isVerified,
        isActive: account.isActive,
        channelInfo: account.platformData?.channelInfo
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * Disconnect a YouTube account (revoke OAuth tokens)
 * DELETE /api/social-media/youtube/:id
 */
export const disconnectYoutubeAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await SocialMediaAccount.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.platform !== 'youtube') {
      return res.status(400).json({ success: false, message: 'Account is not a YouTube account' });
    }

    // Disconnect and revoke token
    const result = await youtubeOAuthService.disconnectAccount(account);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Delete the account
    await SocialMediaAccount.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'YouTube account disconnected and removed successfully'
    });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * Upload a video to YouTube
 * POST /api/social-media/youtube/:id/upload
 * Body: { videoFilePath, title, description, tags, visibility, thumbnail }
 */
export const uploadVideoToYoutube = async (req, res) => {
  try {
    const { id } = req.params;
    const { videoFilePath, title, description, tags = [], visibility = 'private', thumbnail } = req.body;

    if (!videoFilePath || !title) {
      return res.status(400).json({ success: false, message: 'Missing required fields: videoFilePath, title' });
    }

    const account = await SocialMediaAccount.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.platform !== 'youtube') {
      return res.status(400).json({ success: false, message: 'Account is not a YouTube account' });
    }

    if (!account.isActive) {
      return res.status(400).json({ success: false, message: 'Account is not active' });
    }

    // Prepare video data
    const videoData = {
      filePath: videoFilePath,
      title,
      description,
      tags,
      visibility,
      thumbnail
    };

    // Upload video
    const result = await youtubeOAuthService.uploadVideo(account, videoData);
    
    if (!result.success) {
      await account.save();
      return res.status(400).json(result);
    }

    // Save updated account (upload stats updated)
    await account.save();
    
    res.json({ 
      success: true, 
      message: 'Video uploaded successfully',
      videoId: result.videoId,
      videoUrl: `https://www.youtube.com/watch?v=${result.videoId}`,
      account: {
        totalUploads: account.totalUploads,
        lastPostTime: account.lastPostTime
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};
