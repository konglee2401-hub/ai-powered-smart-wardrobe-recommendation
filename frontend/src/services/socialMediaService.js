/**
 * Social Media Service
 * API client for managing social media accounts
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const socialMediaService = {
  /**
   * Get all social media accounts for current user
   */
  getAllAccounts: async () => {
    const response = await fetch(`${API_URL}/social-media`, {
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to fetch accounts');
    return response.json();
  },

  /**
   * Get specific account details
   */
  getAccount: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}`, {
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to fetch account');
    return response.json();
  },

  /**
   * Create new social media account
   */
  createAccount: async (accountData) => {
    const response = await fetch(`${API_URL}/social-media`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(accountData)
    });
    if (!response.ok) throw new Error('Failed to create account');
    return response.json();
  },

  /**
   * Update social media account
   */
  updateAccount: async (accountId, accountData) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(accountData)
    });
    if (!response.ok) throw new Error('Failed to update account');
    return response.json();
  },

  /**
   * Delete social media account
   */
  deleteAccount: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to delete account');
    return response.json();
  },

  /**
   * Test connection for an account
   */
  testConnection: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}/test-connection`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to test connection');
    return response.json();
  },

  /**
   * YouTube OAuth - Start login flow
   */
  youtubeOAuthStart: async () => {
    window.location.href = `${API_URL}/social-media/youtube/oauth/start`;
  },

  /**
   * YouTube - Verify account connection
   */
  verifyYoutubeAccount: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/youtube/verify/${accountId}`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to verify account');
    return response.json();
  },

  /**
   * YouTube - Disconnect account (revoke OAuth tokens)
   */
  disconnectYoutubeAccount: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/youtube/${accountId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to disconnect account');
    return response.json();
  },

  /**
   * YouTube - Upload video to channel
   */
  uploadVideoToYoutube: async (accountId, videoData) => {
    const response = await fetch(`${API_URL}/social-media/youtube/${accountId}/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(videoData)
    });
    if (!response.ok) throw new Error('Failed to upload video');
    return response.json();
  },

  /**
   * Get account stats
   */
  getAccountStats: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}/stats`, {
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  /**
   * Check if account can post now (rate limit check)
   */
  canPostNow: async (accountId) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}/can-post`, {
      headers: getAuthHeader()
    });
    if (!response.ok) throw new Error('Failed to check rate limit');
    return response.json();
  },

  /**
   * Record a post for an account
   */
  recordPost: async (accountId, postData) => {
    const response = await fetch(`${API_URL}/social-media/${accountId}/record-post`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(postData)
    });
    if (!response.ok) throw new Error('Failed to record post');
    return response.json();
  }
};

export default socialMediaService;
