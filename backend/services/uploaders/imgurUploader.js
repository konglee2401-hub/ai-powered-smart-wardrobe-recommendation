import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import { getKeyManager } from '../../utils/keyManager.js';

/**
 * Upload image to Imgur
 * @param {string} imagePath - Path to image file
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with URL
 */
export async function uploadToImgur(imagePath, options = {}) {
  const keyManager = getKeyManager('imgur');
  const keyInfo = keyManager.getNextKey();
  
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    
    if (options.title) {
      form.append('title', options.title);
    }
    
    if (options.description) {
      form.append('description', options.description);
    }
    
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${keyInfo.key}`
      },
      body: form,
      timeout: 30000
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check for rate limit
      if (response.status === 429) {
        keyManager.markKeyFailed(keyInfo.name, new Error('Rate limited'));
        throw new Error('Imgur rate limit exceeded');
      }
      
      throw new Error(`Imgur error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.data?.error || 'Imgur upload failed');
    }
    
    return {
      url: data.data.link,
      deleteHash: data.data.deletehash,
      width: data.data.width,
      height: data.data.height,
      size: data.data.size,
      provider: 'imgur',
      keyUsed: keyInfo.name
    };
    
  } catch (error) {
    // Network errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      keyManager.markKeyFailed(keyInfo.name, error);
    }
    
    throw error;
  }
}

/**
 * Delete image from Imgur
 * @param {string} deleteHash - Imgur delete hash
 */
export async function deleteFromImgur(deleteHash) {
  try {
    const keyManager = getKeyManager('imgur');
    const keyInfo = keyManager.getCurrentKey();
    
    const response = await fetch(`https://api.imgur.com/3/image/${deleteHash}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Client-ID ${keyInfo.key}`
      }
    });
    
    if (response.ok) {
      console.log(`   🗑️  Deleted from Imgur: ${deleteHash}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Imgur delete failed:`, error.message);
    // Don't throw - deletion is not critical
  }
}

export default uploadToImgur;
