import uploadToImgBB from './uploaders/imgbbUploader.js';
import uploadToCloudinary, { deleteFromCloudinary } from './uploaders/cloudinaryUploader.js';
import uploadToImgur, { deleteFromImgur } from './uploaders/imgurUploader.js';
import { getKeyManager } from '../utils/keyManager.js';

// Upload providers configuration
const UPLOAD_PROVIDERS = [
  {
    name: 'ImgBB',
    upload: uploadToImgBB,
    priority: 1,
    pricing: 'FREE',
    features: ['unlimited', 'no-expiry', 'fast'],
    checkAvailable: () => {
      try {
        return getKeyManager('imgbb').keys.length > 0;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Cloudinary',
    upload: uploadToCloudinary,
    priority: 2,
    pricing: 'FREE (25GB)',
    features: ['cdn', 'auto-optimize', 'transformations'],
    checkAvailable: () => {
      try {
        return getKeyManager('cloudinary').keys.length > 0;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Imgur',
    upload: uploadToImgur,
    priority: 3,
    pricing: 'FREE',
    features: ['popular', 'reliable', 'community'],
    checkAvailable: () => {
      try {
        return getKeyManager('imgur').keys.length > 0;
      } catch {
        return false;
      }
    }
  }
];

/**
 * Upload image to cloud with automatic fallback
 * @param {string} imagePath - Path to image file
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with URL
 */
export async function uploadImageToCloud(imagePath, options = {}) {
  console.log('\n📤 UPLOADING IMAGE TO CLOUD');
  console.log('='.repeat(80));
  
  // Get available providers
  const availableProviders = UPLOAD_PROVIDERS
    .filter(p => p.checkAvailable())
    .sort((a, b) => a.priority - b.priority);
  
  if (availableProviders.length === 0) {
    throw new Error('No image upload providers configured. Please add API keys to .env');
  }
  
  console.log(`📊 Available providers: ${availableProviders.length}`);
  availableProviders.forEach(p => {
    console.log(`   ${p.priority}. ${p.name} (${p.pricing}) - ${p.features.join(', ')}`);
  });
  console.log('');
  
  // Try each provider
  let lastError = null;
  
  for (const provider of availableProviders) {
    try {
      console.log(`🔄 Trying ${provider.name}...`);
      
      const startTime = Date.now();
      const result = await provider.upload(imagePath, options);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`✅ SUCCESS - ${provider.name}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Size: ${result.size ? (result.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
      console.log(`   Dimensions: ${result.width}x${result.height}`);
      console.log('='.repeat(80) + '\n');
      
      return {
        ...result,
        uploadedAt: new Date().toISOString(),
        uploadDuration: parseFloat(duration)
      };
      
    } catch (error) {
      console.error(`❌ ${provider.name} failed: ${error.message}`);
      lastError = error;
      
      // If we have more providers, continue to next one
      if (provider !== availableProviders[availableProviders.length - 1]) {
        console.log(`⏭️  Trying next provider...\n`);
        continue;
      }
    }
  }
  
  // All providers failed
  console.error('='.repeat(80));
  console.error('❌ ALL UPLOAD PROVIDERS FAILED');
  console.error('='.repeat(80) + '\n');
  
  throw lastError || new Error('All image upload providers failed');
}

/**
 * Get upload statistics
 * @returns {object} Statistics for all providers
 */
export function getUploadStats() {
  const stats = {
    providers: [],
    totalProviders: UPLOAD_PROVIDERS.length,
    availableProviders: 0
  };
  
  for (const provider of UPLOAD_PROVIDERS) {
    const isAvailable = provider.checkAvailable();
    
    if (isAvailable) {
      stats.availableProviders++;
      
      try {
        const keyManager = getKeyManager(provider.name.toLowerCase());
        const keyStats = keyManager.getStats();
        
        stats.providers.push({
          name: provider.name,
          priority: provider.priority,
          pricing: provider.pricing,
          features: provider.features,
          available: true,
          totalKeys: keyStats.totalKeys,
          availableKeys: keyStats.availableKeys,
          failedKeys: keyStats.failedKeys
        });
      } catch (e) {
        stats.providers.push({
          name: provider.name,
          priority: provider.priority,
          pricing: provider.pricing,
          features: provider.features,
          available: true,
          error: e.message
        });
      }
    } else {
      stats.providers.push({
        name: provider.name,
        priority: provider.priority,
        pricing: provider.pricing,
        features: provider.features,
        available: false
      });
    }
  }
  
  return stats;
}

/**
 * Display upload configuration
 */
export function displayUploadConfig() {
  console.log('\n📤 IMAGE UPLOAD CONFIGURATION');
  console.log('='.repeat(80));
  
  const stats = getUploadStats();
  
  console.log(`Total providers: ${stats.totalProviders}`);
  console.log(`Available: ${stats.availableProviders}`);
  console.log(`Unavailable: ${stats.totalProviders - stats.availableProviders}\n`);
  
  stats.providers.forEach(provider => {
    const status = provider.available ? '✅' : '❌';
    console.log(`${status} ${provider.name} (Priority ${provider.priority})`);
    console.log(`   Pricing: ${provider.pricing}`);
    console.log(`   Features: ${provider.features.join(', ')}`);
    
    if (provider.available && provider.totalKeys) {
      console.log(`   Keys: ${provider.availableKeys}/${provider.totalKeys} available`);
    }
    
    console.log('');
  });
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Delete uploaded image from cloud
 * @param {object} uploadResult - Result from uploadImageToCloud
 * @returns {Promise<boolean>} Success status
 */
export async function deleteUploadedImage(uploadResult) {
  if (!uploadResult || !uploadResult.provider) {
    console.log('   ⚠️  No upload result to delete');
    return false;
  }

  console.log(`\n🗑️  CLEANING UP UPLOADED IMAGE`);
  console.log('='.repeat(80));
  console.log(`   Provider: ${uploadResult.provider}`);
  console.log(`   URL: ${uploadResult.url}`);

  try {
    switch (uploadResult.provider) {
      case 'cloudinary':
        if (uploadResult.publicId && uploadResult.cloudName) {
          await deleteFromCloudinary(uploadResult.publicId, uploadResult.cloudName);
          console.log('   ✅ Image deleted from Cloudinary');
          return true;
        }
        break;

      case 'imgur':
        if (uploadResult.deleteHash) {
          await deleteFromImgur(uploadResult.deleteHash);
          console.log('   ✅ Image deleted from Imgur');
          return true;
        }
        break;

      case 'imgbb':
        // ImgBB doesn't support deletion via API
        console.log('   ⚠️  ImgBB does not support API deletion');
        console.log('   💡 Images will expire automatically based on account settings');
        return false;

      default:
        console.log(`   ⚠️  Unknown provider: ${uploadResult.provider}`);
        return false;
    }
  } catch (error) {
    console.error(`   ❌ Delete failed: ${error.message}`);
    return false;
  }

  console.log('='.repeat(80) + '\n');
  return false;
}

/**
 * Delete multiple uploaded images
 * @param {Array<object>} uploadResults - Array of upload results
 * @returns {Promise<object>} Summary of deletions
 */
export async function deleteUploadedImages(uploadResults) {
  const summary = {
    total: uploadResults.length,
    deleted: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (const result of uploadResults) {
    const deleted = await deleteUploadedImage(result);
    
    if (deleted) {
      summary.deleted++;
      summary.details.push({ url: result.url, status: 'deleted' });
    } else if (result.provider === 'imgbb') {
      summary.skipped++;
      summary.details.push({ url: result.url, status: 'skipped (imgbb)' });
    } else {
      summary.failed++;
      summary.details.push({ url: result.url, status: 'failed' });
    }
  }

  console.log('\n📊 CLEANUP SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Total: ${summary.total}`);
  console.log(`   ✅ Deleted: ${summary.deleted}`);
  console.log(`   ⏭️  Skipped: ${summary.skipped}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log('='.repeat(80) + '\n');

  return summary;
}

// Export both as default and named export
export default uploadImageToCloud;
export { uploadImageToCloud as uploadToImageHost };
