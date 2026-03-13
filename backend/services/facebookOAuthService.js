import axios from 'axios';

const apiVersion = process.env.FACEBOOK_API_VERSION || 'v20.0';
const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;
const redirectUri = process.env.FACEBOOK_REDIRECT_URI
  || `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/social-media/facebook/oauth/callback`;

const getScopes = () => (process.env.FACEBOOK_SCOPES || '')
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

const ensureConfig = () => {
  if (!appId || !appSecret) {
    throw new Error('Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
  }
};

const buildQuery = (params = {}) => new URLSearchParams(params).toString();

const getAuthUrl = (state = '') => {
  ensureConfig();
  const scopes = getScopes();
  const query = buildQuery({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(','),
    state
  });

  return `https://www.facebook.com/${apiVersion}/dialog/oauth?${query}`;
};

const exchangeCodeForToken = async (code) => {
  ensureConfig();
  const query = buildQuery({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code
  });

  const url = `https://graph.facebook.com/${apiVersion}/oauth/access_token?${query}`;
  const response = await axios.get(url);
  return response.data;
};

export default {
  getAuthUrl,
  exchangeCodeForToken
};