import axios from 'axios';
import fs from 'fs';
import path from 'path';

const apiVersion = process.env.FACEBOOK_API_VERSION || 'v20.0';

const graphBase = `https://graph.facebook.com/${apiVersion}`;

const createReelUploadSession = async (pageAccessToken) => {
  const url = `${graphBase}/me/video_reels`;
  const response = await axios.post(url, null, {
    params: {
      upload_phase: 'start',
      access_token: pageAccessToken
    }
  });
  return response.data;
};

const uploadLocalReel = async (uploadUrl, pageAccessToken, videoFilePath) => {
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video file not found: ${videoFilePath}`);
  }

  const fileSize = fs.statSync(videoFilePath).size;
  const stream = fs.createReadStream(videoFilePath);
  const headers = {
    Authorization: `OAuth ${pageAccessToken}`,
    offset: 0,
    file_size: fileSize,
    'Content-Type': 'application/octet-stream'
  };

  const response = await axios.post(uploadUrl, stream, { headers });
  return response.data;
};

const uploadHostedReel = async (uploadUrl, pageAccessToken, videoUrl) => {
  const headers = {
    Authorization: `OAuth ${pageAccessToken}`,
    file_url: videoUrl
  };

  const response = await axios.post(uploadUrl, null, { headers });
  return response.data;
};

const getReelStatus = async (videoId, pageAccessToken) => {
  const url = `${graphBase}/${videoId}`;
  const response = await axios.get(url, {
    params: {
      fields: 'status',
      access_token: pageAccessToken
    }
  });
  return response.data;
};

const finishReelUpload = async (pageAccessToken, videoId, { description, title, videoState = 'PUBLISHED' } = {}) => {
  const url = `${graphBase}/me/video_reels`;
  const response = await axios.post(url, null, {
    params: {
      upload_phase: 'finish',
      video_id: videoId,
      video_state: videoState,
      description,
      title,
      access_token: pageAccessToken
    }
  });
  return response.data;
};

export default {
  createReelUploadSession,
  uploadLocalReel,
  uploadHostedReel,
  getReelStatus,
  finishReelUpload
};