import { v2 as cloudinary } from 'cloudinary';
import { getKeyManager } from '../../utils/keyManager.js';

/**
 * Upload image to Cloudinary
 * @param {string} imagePath - Path to image file
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with URL
 */
export async function uploadToCloudinary(imagePath, options = {}) {
  const keyManager = getKeyManager('cloudinary');
  const keyInfo = keyManager.getNextKey();
  
  // Parse key info (format: cloudName|apiKey|apiSecret)
  const [cloudName, apiKey, apiSecret] = keyInfo.key.split('|');
  
  // Configure Cloudinary for this request
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  
  try {
    const uploadOptions = {
      folder: options.folder || 'smart-wardrobe',
      resource_type: 'image',
      transformation: [
        { width: 2000, crop: 'limit' }, // Max 2000px width
        { quality: 'auto:good' }, // Auto quality
        { fetch_format: 'auto' } // Auto format (WebP if supported)
      ],
      ...options.cloudinaryOptions
    };
    
    const result = await cloudinary.uploader.upload(imagePath, uploadOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      provider: 'cloudinary',
      keyUsed: keyInfo.name,
      cloudName: cloudName
    };
    
  } catch (error) {
    // Check for rate limit or quota errors
    if (
      error.message.includes('rate limit') ||
      error.message.includes('quota') ||
      error.message.includes('429')
    ) {
      keyManager.markKeyFailed(keyInfo.name, error);
    }
    
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} cloudName - Cloud name used for upload
 */
export async function deleteFromCloudinary(publicId, cloudName) {
  try {
    const keyManager = getKeyManager('cloudinary');
    
    // Find key with matching cloud name
    const keyInfo = keyManager.keys.find(k => k.key.startsWith(cloudName));
    
    if (!keyInfo) {
      throw new Error(`No Cloudinary key found for cloud: ${cloudName}`);
    }
    
    const [, apiKey, apiSecret] = keyInfo.key.split('|');
    
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    
    await cloudinary.uploader.destroy(publicId);
    console.log(`   🗑️  Deleted from Cloudinary: ${publicId}`);
    
  } catch (error) {
    console.error(`   ❌ Cloudinary delete failed:`, error.message);
    // Don't throw - deletion is not critical
  }
}

export default uploadToCloudinary;
