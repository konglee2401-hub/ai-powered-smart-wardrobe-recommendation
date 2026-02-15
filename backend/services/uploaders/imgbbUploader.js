import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import { getKeyManager } from '../../utils/keyManager.js';

/**
 * Upload image to ImgBB
 * @param {string} imagePath - Path to image file
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with URL
 */
export async function uploadToImgBB(imagePath, options = {}) {
  const keyManager = getKeyManager('imgbb');
  
  return new Promise((resolve, reject) => {
    const keyInfo = keyManager.getNextKey();
    
    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      
      if (options.name) {
        form.append('name', options.name);
      }
      
      if (options.expiration) {
        form.append('expiration', options.expiration);
      }
      
      fetch(`https://api.imgbb.com/1/upload?key=${keyInfo.key}`, {
        method: 'POST',
        body: form,
        timeout: 30000
      })
        .then(async response => {
          if (!response.ok) {
            const errorText = await response.text();
            
            // Check for rate limit
            if (response.status === 429 || errorText.includes('rate limit')) {
              keyManager.markKeyFailed(keyInfo.name, new Error('Rate limited'));
              reject(new Error('ImgBB rate limit exceeded'));
              return;
            }
            
            reject(new Error(`ImgBB error: ${response.status} - ${errorText}`));
            return;
          }
          
          const data = await response.json();
          
          if (!data.success) {
            reject(new Error(data.error?.message || 'ImgBB upload failed'));
            return;
          }
          
          resolve({
            url: data.data.url,
            displayUrl: data.data.display_url,
            deleteUrl: data.data.delete_url,
            size: data.data.size,
            width: data.data.width,
            height: data.data.height,
            provider: 'imgbb',
            keyUsed: keyInfo.name
          });
        })
        .catch(error => {
          // Network errors
          if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            keyManager.markKeyFailed(keyInfo.name, error);
          }
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export default uploadToImgBB;
