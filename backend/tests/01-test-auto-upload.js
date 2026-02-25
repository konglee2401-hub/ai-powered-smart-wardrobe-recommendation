/**
 * Auto Upload Service Test
 * Test upload registration, tracking, and platform-specific uploads
 */

import AutoUploadService from '../services/autoUploadService.js';

console.log('='.repeat(80));
console.log('AUTO UPLOAD SERVICE TEST');
console.log('='.repeat(80));

// Test 1: Register uploads
console.log('\n1️⃣ TEST: Register uploads to queue');
console.log('-'.repeat(80));

const upload1 = AutoUploadService.registerUpload({
  queueId: 'queue-001',
  videoPath: '/backend/media/mashups/video-001.mp4',
  platform: 'tiktok',
  accountId: 'acc-tiktok-001',
  uploadConfig: {
    title: 'Fashion Mashup',
    description: 'Amazing fashion trends',
    hashtags: ['#fashion', '#trends', '#video']
  }
});

console.log('✅ Registered TikTok upload:', upload1.uploadId);
console.log('   Queue ID:', upload1.upload.queueId);
console.log('   Status:', upload1.upload.status);
console.log('   File size:', upload1.upload.fileSize, 'bytes');

const upload2 = AutoUploadService.registerUpload({
  queueId: 'queue-001',
  videoPath: '/backend/media/mashups/video-001.mp4',
  platform: 'youtube',
  accountId: 'acc-youtube-001',
  uploadConfig: {
    title: 'Fashion & Style Mashup',
    description: 'Check out this amazing fashion mashup!',
    tags: ['fashion', 'style', 'trends'],
    privacy: 'public'
  }
});

console.log('✅ Registered YouTube upload:', upload2.uploadId);

const upload3 = AutoUploadService.registerUpload({
  queueId: 'queue-002',
  videoPath: '/backend/media/mashups/video-002.mp4',
  platform: 'facebook',
  accountId: 'acc-facebook-001',
  uploadConfig: {
    caption: 'Love this fashion trend! 💕'
  }
});

console.log('✅ Registered Facebook upload:', upload3.uploadId);

// Test 2: Check rate limits
console.log('\n2️⃣ TEST: Rate limit checking');
console.log('-'.repeat(80));

const tiktokRateLimit = AutoUploadService.canUploadToPlatform('tiktok');
console.log('✅ TikTok rate limit:');
console.log('   Can upload:', tiktokRateLimit.canUpload);
console.log('   Limit (per hour):', tiktokRateLimit.limit);
console.log('   Used in last hour:', tiktokRateLimit.uploadedInLastHour);
console.log('   Remaining slots:', tiktokRateLimit.remainingSlots);

const youtubeRateLimit = AutoUploadService.canUploadToPlatform('youtube');
console.log('✅ YouTube rate limit:');
console.log('   Can upload:', youtubeRateLimit.canUpload);
console.log('   Remaining slots:', youtubeRateLimit.remainingSlots);

// Test 3: Get next upload
console.log('\n3️⃣ TEST: Get next pending upload');
console.log('-'.repeat(80));

const nextUpload = AutoUploadService.getNextUpload();
if (nextUpload.success) {
  console.log('✅ Next pending upload:', nextUpload.upload.uploadId);
  console.log('   Platform:', nextUpload.upload.platform);
  console.log('   Status:', nextUpload.upload.status);
}

const nextTiktok = AutoUploadService.getNextUpload('tiktok');
if (nextTiktok.success) {
  console.log('✅ Next TikTok upload:', nextTiktok.upload.uploadId);
}

// Test 4: Update upload status
console.log('\n4️⃣ TEST: Update upload status');
console.log('-'.repeat(80));

const statusUpdate1 = AutoUploadService.updateUploadStatus(upload1.uploadId, 'uploading');
console.log('✅ Updated to uploading:', statusUpdate1.newStatus);
console.log('   Started at:', statusUpdate1.upload.startedAt);

// Test 5: Record error
console.log('\n5️⃣ TEST: Error recording');
console.log('-'.repeat(80));

const errorRecord = AutoUploadService.recordUploadError(
  upload2.uploadId,
  new Error('Network timeout'),
  'connection'
);

console.log('✅ Error recorded on upload:', upload2.uploadId);
console.log('   Error count:', errorRecord.retries);
console.log('   New status:', errorRecord.upload.status);
console.log('   Will retry:', errorRecord.willRetry);

// Test 6: Simulated platform uploads
console.log('\n6️⃣ TEST: Simulated upload execution');
console.log('-'.repeat(80));

const mockAccount = {
  accountId: 'acc-tiktok-001',
  username: 'fashionista_001',
  displayName: 'Fashion Expert',
  platform: 'tiktok'
};

(async () => {
  // Simulate TikTok upload
  const tiktokUpload = await AutoUploadService.executeUpload(upload1.uploadId, mockAccount);
  if (tiktokUpload.success) {
    console.log('✅ TikTok upload simulated successfully');
    console.log('   Upload URL:', tiktokUpload.uploadUrl);
    console.log('   Duration:', tiktokUpload.duration, 'ms');
  }
})();

// Test 7: Get uploads by status
console.log('\n7️⃣ TEST: Get uploads by status');
console.log('-'.repeat(80));

const pendingUploads = AutoUploadService.getUploadsByStatus('pending');
console.log(`✅ Pending uploads: ${pendingUploads.count}`);
if (pendingUploads.uploads.length > 0) {
  pendingUploads.uploads.slice(0, 2).forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.uploadId} - ${u.platform}`);
  });
}

// Test 8: Get uploads for queue
console.log('\n8️⃣ TEST: Get uploads for specific queue');
console.log('-'.repeat(80));

const queueUploads = AutoUploadService.getUploadsForQueue('queue-001');
console.log(`✅ Uploads for queue-001: ${queueUploads.count}`);
console.log('   Successful:', queueUploads.successful);
console.log('   Failed:', queueUploads.failed);

// Test 9: Get uploads for account
console.log('\n9️⃣ TEST: Get uploads for specific account');
console.log('-'.repeat(80));

const accountUploads = AutoUploadService.getUploadsForAccount('acc-tiktok-001');
console.log(`✅ Uploads for acc-tiktok-001: ${accountUploads.count}`);
if (accountUploads.count > 0) {
  accountUploads.uploads.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.uploadId} - Status: ${u.status}`);
  });
}

// Test 10: Statistics
console.log('\n🔟 TEST: Upload statistics');
console.log('-'.repeat(80));

const stats = AutoUploadService.getUploadStats();
console.log('✅ Overall statistics:');
console.log('   Total uploads:', stats.stats.total);
console.log('   By status:');
console.log('      Pending:', stats.stats.byStatus.pending);
console.log('      Uploading:', stats.stats.byStatus.uploading);
console.log('      Success:', stats.stats.byStatus.success);
console.log('      Failed:', stats.stats.byStatus.failed);
console.log('      Retry:', stats.stats.byStatus.retry);
console.log('   Success rate:', stats.stats.successRate + '%');
console.log('   Total size:', (stats.stats.totalSize / 1024 / 1024).toFixed(2), 'MB');

// Test 11: Platform-specific stats
console.log('\n1️⃣1️⃣ TEST: Platform-specific statistics');
console.log('-'.repeat(80));

const tiktokStats = AutoUploadService.getUploadStats('tiktok');
console.log('✅ TikTok uploads:');
console.log('   Total:', tiktokStats.stats.total);
console.log('   Success rate:', tiktokStats.stats.successRate + '%');

const youtubeStats = AutoUploadService.getUploadStats('youtube');
console.log('✅ YouTube uploads:');
console.log('   Total:', youtubeStats.stats.total);
console.log('   Success rate:', youtubeStats.stats.successRate + '%');

// Test 12: Get status
console.log('\n1️⃣2️⃣ TEST: Get single upload status');
console.log('-'.repeat(80));

const uploadStatus = AutoUploadService.getUploadStatus(upload1.uploadId);
if (uploadStatus.success) {
  console.log('✅ Upload status retrieved:', upload1.uploadId);
  console.log('   Current status:', uploadStatus.upload.status);
  console.log('   Retries:', uploadStatus.upload.retries);
  console.log('   Created:', uploadStatus.upload.createdAt);
}

// Test 13: Get platform status
console.log('\n1️⃣3️⃣ TEST: Platform status overview');
console.log('-'.repeat(80));

const platformStatus = AutoUploadService.getPlatformStatus('tiktok');
if (platformStatus.success) {
  console.log('✅ TikTok platform status:');
  console.log('   Can upload:', platformStatus.rateLimit.canUpload);
  console.log('   Recent uploads:', platformStatus.rateLimit.uploadedInLastHour);
  console.log('   Success rate:', platformStatus.stats.successRate + '%');
}

// Test 14: Cleanup old uploads
console.log('\n1️⃣4️⃣ TEST: Cleanup old uploads');
console.log('-'.repeat(80));

const cleanup = AutoUploadService.cleanupUploads(0); // Remove all old items for demo
console.log('✅ Cleanup completed');
console.log('   Deleted:', cleanup.deleted, 'old uploads');

// Test 15: Retry failed uploads
console.log('\n1️⃣5️⃣ TEST: Retry failed uploads');
console.log('-'.repeat(80));

const retry = AutoUploadService.retryFailed(3);
console.log('✅ Failed uploads marked for retry');
console.log('   Retried:', retry.retried, 'uploads');

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL UPLOAD STATE');
console.log('='.repeat(80));

const finalStats = AutoUploadService.getUploadStats();
console.log('\n📊 Upload Summary:');
console.log(`✅ Total uploads: ${finalStats.stats.total}`);
console.log(`✅ Success rate: ${finalStats.stats.successRate}%`);
console.log(`✅ Total data size: ${(finalStats.stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`✅ Uploads with errors: ${finalStats.stats.failedWithErrors}`);

console.log('\n' + '='.repeat(80));
console.log('✅ AUTO UPLOAD SERVICE TEST COMPLETED!');
console.log('='.repeat(80));
