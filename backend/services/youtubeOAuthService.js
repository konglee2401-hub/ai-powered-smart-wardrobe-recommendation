/**
 * YouTube OAuth Service
 * Handles OAuth 2.0 flow for YouTube account connection
 * 
 * Based on: backend/scripts/utils/youtube/oauth-complete.js
 * 
 * CRITICAL: All three must match exactly in Google Cloud Console:
 * - YOUTUBE_OAUTH_CLIENT_ID
 * - YOUTUBE_OAUTH_CLIENT_SECRET  
 * - YOUTUBE_OAUTH_REDIRECT_URI
 */

import { google } from 'googleapis';
import SocialMediaAccount from '../models/SocialMediaAccount.js';

// YouTube scopes - required permissions
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

class YouTubeOAuthService {
  constructor() {
    this.clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    this.clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    this.redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;
    
    this.validateConfig();
    
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
    
    console.log('��� [YouTube OAuth Service Initialized]');
    console.log(`   ✅ CLIENT_ID: ${this.clientId.substring(0, 30)}...`);
    console.log(`   ✅ REDIRECT_URI: ${this.redirectUri}`);
  }

  validateConfig() {
    if (!this.clientId) {
      throw new Error('❌ YOUTUBE_OAUTH_CLIENT_ID not in .env');
    }
    if (!this.clientSecret) {
      throw new Error('❌ YOUTUBE_OAUTH_CLIENT_SECRET not in .env');
    }
    if (!this.redirectUri) {
      throw new Error('❌ YOUTUBE_OAUTH_REDIRECT_URI not in .env');
    }
  }

  /**
   * Generate OAuth authorization URL
   * @returns {string} Authorization URL
   */
  getAuthUrl() {
    try {
      console.log('��� Generating OAuth authorization URL...');
      
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: YOUTUBE_SCOPES,
        prompt: 'consent'
      });
      
      console.log('✅ Auth URL generated');
      return authUrl;
    } catch (error) {
      console.error('❌ [getAuthUrl Error]', error.message);
      throw error;
    }
  }

  /**
   * Handle OAuth callback - exchange code for tokens
   * @param {string} code - Authorization code from Google
   * @returns {Object} Account data
   */
  async handleOAuthCallback(code) {
    try {
      console.log('\n' + '═'.repeat(60));
      console.log('��� [OAuth Callback] Processing...');
      console.log('═'.repeat(60));
      
      // Step 1: Exchange code for tokens
      console.log('\n1️⃣  Exchanging code for tokens...');
      let tokens;
      try {
        const response = await this.oauth2Client.getToken(code);
        tokens = response.tokens;
        console.log('   ✅ Tokens received');
      } catch (error) {
        console.error(`   ❌ Token exchange failed: ${error.message}`);
        
        if (error.message.includes('invalid_grant')) {
          throw new Error(
            'Code is invalid/expired. Possible causes:\n' +
            '  • Code already used (single-use only)\n' +
            '  • Code expired (valid ~10 minutes)\n' +
            'Solution: Generate new auth URL and try again'
          );
        } else if (error.message.includes('redirect_uri_mismatch')) {
          throw new Error(
            `Redirect URI mismatch!\n` +
            `Expected: ${this.redirectUri}\n` +
            'Verify Google Cloud Console settings'
          );
        }
        throw error;
      }
      
      // Step 2: Set credentials
      console.log('\n2️⃣  Configuring API access...');
      this.oauth2Client.setCredentials(tokens);
      console.log('   ✅ Credentials set');
      
      // Step 3: Get user email
      console.log('\n3️⃣  Fetching account email...');
      let googleEmail;
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        googleEmail = userInfo.data.email;
        console.log(`   ✅ ${googleEmail}`);
      } catch (error) {
        throw new Error(`Failed to get email: ${error.message}`);
      }
      
      // Step 4: Get YouTube channel
      console.log('\n4️⃣  Fetching YouTube channel...');
      let channel;
      try {
        const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
        const response = await youtube.channels.list({
          part: 'snippet,statistics,brandingSettings',
          mine: true
        });
        
        if (!response.data.items?.length) {
          throw new Error('No YouTube channel found');
        }
        
        channel = response.data.items[0];
        console.log(`   ✅ ${channel.snippet.title}`);
        console.log(`   ✅ ID: ${channel.id}`);
      } catch (error) {
        throw new Error(`Failed to get channel: ${error.message}`);
      }
      
      // Step 5: Parse channel data
      console.log('\n5️⃣  Processing channel data...');
      const channelId = channel.id;
      const channelTitle = channel.snippet.title;
      const channelDescription = channel.snippet.description || '';
      const channelThumbnailUrl = 
        channel.snippet.thumbnails?.default?.url || 
        channel.snippet.thumbnails?.medium?.url;
      const channelUrl = `https://www.youtube.com/channel/${channelId}`;
      const channelCustomUrl = channel.brandingSettings?.channel?.customUrl;
      
      // Step 6: Save to database
      console.log('\n6️⃣  Saving to database...');
      let account = await SocialMediaAccount.findOne({
        platform: 'youtube',
        channelId: channelId
      });
      
      if (!account) {
        account = new SocialMediaAccount({
          platform: 'youtube',
          channelId,
          channelTitle,
          channelDescription,
          channelThumbnailUrl,
          channelUrl,
          channelCustomUrl,
          accountName: channelTitle,
          accountId: channelId,
          accountHandle: channelCustomUrl || channelTitle,
          accountUrl: channelUrl,
          accountImage: channelThumbnailUrl,
          email: googleEmail,
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            scope: YOUTUBE_SCOPES,
            platformData: {
              channelTitle,
              channelId,
              subscribers: channel.statistics?.subscriberCount || '0',
              totalViews: channel.statistics?.viewCount || '0',
              videoCount: channel.statistics?.videoCount || '0'
            }
          },
          isActive: true,
          isVerified: true,
          lastVerifiedAt: new Date(),
          connectionStatus: 'connected'
        });
      } else {
        account.credentials = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || account.credentials?.refreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: YOUTUBE_SCOPES,
          platformData: {
            channelTitle,
            channelId,
            subscribers: channel.statistics?.subscriberCount || '0',
            totalViews: channel.statistics?.viewCount || '0',
            videoCount: channel.statistics?.videoCount || '0'
          }
        };
        account.email = googleEmail;
        account.isActive = true;
        account.isVerified = true;
        account.lastVerifiedAt = new Date();
        account.connectionStatus = 'connected';
      }
      
      await account.save();
      console.log('   ✅ Saved');
      
      console.log('\n' + '═'.repeat(60));
      console.log('✅ [OAuth Success]');
      console.log('═'.repeat(60));
      console.log(`Channel: ${channelTitle}`);
      console.log(`Email: ${googleEmail}\n`);
      
      return {
        success: true,
        account: {
          _id: account._id,
          channelId: account.channelId,
          channelTitle: account.channelTitle,
          channelThumbnailUrl: account.channelThumbnailUrl,
          email: account.email,
          platform: 'youtube',
          isActive: account.isActive
        }
      };
    } catch (error) {
      console.error('\n❌ [OAuth Error]', error.message, '\n');
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {Object} account - SocialMediaAccount
   */
  async refreshAccessToken(account) {
    try {
      if (!account.credentials?.refreshToken) {
        throw new Error('No refresh token');
      }
      
      this.oauth2Client.setCredentials({
        refresh_token: account.credentials.refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      account.credentials.accessToken = credentials.access_token;
      if (credentials.refresh_token) {
        account.credentials.refreshToken = credentials.refresh_token;
      }
      account.credentials.expiresAt = credentials.expiry_date 
        ? new Date(credentials.expiry_date) 
        : null;
      
      await account.save();
      return credentials;
    } catch (error) {
      console.error(`❌ Token refresh failed: ${error.message}`);
      account.isActive = false;
      await account.save();
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   * @param {Object} account - SocialMediaAccount
   */
  async getValidAccessToken(account) {
    try {
      if (account.credentials?.expiresAt) {
        const expiresAt = new Date(account.credentials.expiresAt);
        const now = new Date();
        
        if (expiresAt - now < 5 * 60 * 1000) {
          console.log('⏰ Token expiring, refreshing...');
          await this.refreshAccessToken(account);
        }
      }
      
      const latest = await SocialMediaAccount.findById(account._id);
      return latest.credentials.accessToken;
    } catch (error) {
      console.error(`❌ Failed to get access token: ${error.message}`);
      throw error;
    }
  }
}

export default new YouTubeOAuthService();
