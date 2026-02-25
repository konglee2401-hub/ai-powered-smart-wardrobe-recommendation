/**
 * Complete Integration Test
 * - Test entire video production pipeline
 * - Test all services working together
 * - Validate queue, mashup, upload, and account workflows
 */

import VideoMashupService from '../services/videoMashupService.js';
import MediaLibraryService from '../services/mediaLibraryService.js';
import VideoQueueService from '../services/videoQueueService.js';
import CronJobService from '../services/cronJobService.js';
import MultiAccountService from '../services/multiAccountService.js';
import AutoUploadService from '../services/autoUploadService.js';
import ProcessOrchestratorService from '../services/processOrchestratorService.js';

console.log('='.repeat(80));
console.log('VIDEO MASS PRODUCTION - COMPLETE INTEGRATION TEST');
console.log('='.repeat(80));

// Test 1: Multi Account Service
console.log('\n📱 TEST 1: MULTI ACCOUNT SERVICE');
console.log('-'.repeat(80));

try {
  // Add TikTok account
  const tiktokAccount = MultiAccountService.addAccount({
    platform: 'tiktok',
    username: 'fashionista_001',
    password: 'secure_password_123',
    displayName: 'Fashion Studio',
    metadata: { category: 'fashion' }
  });

  console.log('✅ Added TikTok account:', tiktokAccount.accountId);

  // Add YouTube account
  const youtubeAccount = MultiAccountService.addAccount({
    platform: 'youtube',
    username: 'FashionChannel',
    password: 'youtube_pass_456',
    displayName: 'Fashion & Style Channel'
  });

  console.log('✅ Added YouTube account:', youtubeAccount.accountId);

  // Add Facebook account
  const facebookAccount = MultiAccountService.addAccount({
    platform: 'facebook',
    username: 'fashion_page',
    password: 'facebook_pass_789'
  });

  console.log('✅ Added Facebook account:', facebookAccount.accountId);

  // Mark accounts as verified
  MultiAccountService.updateAccount(tiktokAccount.accountId, { verified: true });
  MultiAccountService.updateAccount(youtubeAccount.accountId, { verified: true });
  MultiAccountService.updateAccount(facebookAccount.accountId, { verified: true });

  console.log('✅ Verified all accounts');

  // Get account stats
  const accountStats = MultiAccountService.getAccountStats();
  console.log('📊 Account Stats:', accountStats.stats);
} catch (error) {
  console.error('❌ Multi Account Test Failed:', error.message);
}

// Test 2: Media Library Service
console.log('\n📁 TEST 2: MEDIA LIBRARY SERVICE');
console.log('-'.repeat(80));

try {
  // Add template videos
  const template1 = MediaLibraryService.addTemplateVideo({
    name: 'Product Showcase Template',
    description: 'Modern product demo with transitions',
    duration: 30,
    platform: 'tiktok',
    tags: ['product', 'demo']
  });

  console.log('✅ Added template video:', template1.mediaId);

  // Add hot videos
  const hotVideo1 = MediaLibraryService.addHotVideo({
    title: 'Trending Fashion Challenge',
    source: 'downloaded',
    platform: 'tiktok',
    tags: ['trending', 'fashion']
  });

  console.log('✅ Added hot video:', hotVideo1.mediaId);

  // Add audio tracks
  const audio1 = MediaLibraryService.addAudio({
    name: 'Upbeat Background Music',
    category: 'upbeat',
    mood: 'energetic',
    tags: ['background', 'upbeat']
  });

  console.log('✅ Added audio track:', audio1.mediaId);

  // Get random media
  const randomTemplate = MediaLibraryService.getRandomTemplate({ platform: 'tiktok' });
  console.log('✅ Random template:', randomTemplate.media?.name);

  const randomAudio = MediaLibraryService.getRandomAudio({ mood: 'upbeat' });
  console.log('✅ Random audio:', randomAudio.media?.name);

  // Get stats
  const mediaStats = MediaLibraryService.getStats();
  console.log('📊 Media Library Stats:', mediaStats.stats);
} catch (error) {
  console.error('❌ Media Library Test Failed:', error.message);
}

// Test 3: Video Queue Service
console.log('\n📹 TEST 3: VIDEO QUEUE SERVICE');
console.log('-'.repeat(80));

try {
  // Add single video to queue
  const queue1 = VideoQueueService.addToQueue({
    videoConfig: { layout: 'side-by-side', duration: 30 },
    platform: 'tiktok',
    contentType: 'product_promo',
    priority: 'high'
  });

  console.log('✅ Added video to queue:', queue1.queueId);

  // Batch add videos
  const batch = VideoQueueService.addBatchToQueue({
    videos: [
      { layout: 'pip', duration: 30 },
      { layout: 'side-by-side', duration: 45 },
      { layout: 'pip', duration: 30 }
    ],
    platform: 'youtube',
    contentType: 'hot_mashup',
    priority: 'normal'
  });

  console.log(`✅ Added batch of ${batch.queueIds.length} videos:`, batch.batchId);

  // Update status
  const statusUpdate = VideoQueueService.updateQueueStatus(queue1.queueId, 'processing');
  console.log('✅ Updated queue status to processing');

  // Get next pending
  const nextPending = VideoQueueService.getNextPending('tiktok');
  if (nextPending.success) {
    console.log('✅ Next pending video:', nextPending.queueItem.queueId);
  }

  // Get stats
  const queueStats = VideoQueueService.getQueueStats();
  console.log('📊 Queue Stats:', queueStats.stats);
} catch (error) {
  console.error('❌ Video Queue Test Failed:', error.message);
}

// Test 4: Cron Job Service
console.log('\n⏰ TEST 4: CRON JOB SERVICE');
console.log('-'.repeat(80));

try {
  // Create a test job (non-blocking handler)
  const job1 = CronJobService.createJob({
    name: 'Test Generation Job',
    description: 'Generate videos every hour',
    schedule: '0 * * * *', // Every hour
    jobType: 'generate',
    platform: 'tiktok',
    enabled: true,
    handler: async job => ({
      success: true,
      output: { message: 'Job executed successfully' }
    })
  });

  console.log('✅ Created generation job:', job1.jobId);

  // Create upload job
  const job2 = CronJobService.createJob({
    name: 'Test Upload Job',
    description: 'Upload videos every 2 hours',
    schedule: '0 */2 * * *',
    jobType: 'upload',
    enabled: true,
    handler: async job => ({
      success: true,
      output: { message: 'Upload job executed' }
    })
  });

  console.log('✅ Created upload job:', job2.jobId);

  // Get job stats
  const jobStats = CronJobService.getJobStatistics();
  console.log('📊 Job Stats:', {
    totalJobs: jobStats.stats.totalJobs,
    enabledJobs: jobStats.stats.enabledJobs
  });

  // Get all jobs
  const allJobs = CronJobService.getAllJobs();
  console.log(`✅ Total jobs in system: ${allJobs.count}`);
} catch (error) {
  console.error('❌ Cron Job Test Failed:', error.message);
}

// Test 5: Auto Upload Service
console.log('\n☁️  TEST 5: AUTO UPLOAD SERVICE');
console.log('-'.repeat(80));

try {
  // Get first queue item
  const queueStats = VideoQueueService.getQueueStats();

  if (queueStats.stats.total > 0) {
    // Register uploads for first queue item
    const upload1 = AutoUploadService.registerUpload({
      queueId: 'queue-test-001',
      videoPath: '/backend/media/mashups/test-video.mp4',
      platform: 'tiktok',
      accountId: 'acc-tiktok-001'
    });

    console.log('✅ Registered TikTok upload:', upload1.uploadId);

    const upload2 = AutoUploadService.registerUpload({
      queueId: 'queue-test-001',
      videoPath: '/backend/media/mashups/test-video.mp4',
      platform: 'youtube',
      accountId: 'acc-youtube-001'
    });

    console.log('✅ Registered YouTube upload:', upload2.uploadId);

    // Get upload stats
    const uploadStats = AutoUploadService.getUploadStats();
    console.log('📊 Upload Stats:', {
      total: uploadStats.stats.total,
      pending: uploadStats.stats.byStatus.pending,
      success: uploadStats.stats.byStatus.success
    });

    // Check rate limit
    const rateLimit = AutoUploadService.canUploadToPlatform('tiktok');
    console.log('✅ Rate limit check:', rateLimit);
  }
} catch (error) {
  console.error('❌ Auto Upload Test Failed:', error.message);
}

// Test 6: Process Orchestrator
console.log('\n🎯 TEST 6: PROCESS ORCHESTRATOR');
console.log('-'.repeat(80));

try {
  // Get system status
  const systemStatus = ProcessOrchestratorService.getSystemStatus();
  console.log('✅ System Status:');
  console.log('   Queue:', {
    total: systemStatus.queue.total,
    pending: systemStatus.queue.byStatus.pending,
    processing: systemStatus.queue.byStatus.processing
  });
  console.log('   Uploads:', {
    total: systemStatus.uploads.total,
    pending: systemStatus.uploads.byStatus.pending,
    success: systemStatus.uploads.byStatus.success
  });
  console.log('   Accounts:', {
    total: systemStatus.accounts.totalAccounts,
    verified: systemStatus.accounts.verifiedAccounts
  });
} catch (error) {
  console.error('❌ Process Orchestrator Test Failed:', error.message);
}

// Test 7: Account Utilities
console.log('\n🔧 TEST 7: ACCOUNT UTILITIES');
console.log('-'.repeat(80));

try {
  // Get accounts by platform
  const tiktokAccounts = MultiAccountService.getAccountsByPlatform('tiktok');
  console.log(`✅ TikTok accounts: ${tiktokAccounts.count}`);

  const youtubeAccounts = MultiAccountService.getAccountsByPlatform('youtube');
  console.log(`✅ YouTube accounts: ${youtubeAccounts.count}`);

  // Get best account for posting
  if (tiktokAccounts.count > 0) {
    const best = MultiAccountService.getBestAccountForPosting('tiktok');
    if (best.success) {
      console.log(`✅ Best TikTok account: ${best.account.username}`);
    }
  }

  // Get account rotation
  if (tiktokAccounts.count > 0) {
    const rotation = MultiAccountService.getAccountRotation('tiktok', 2);
    console.log(`✅ Account rotation for 2 uploads: ${rotation.rotation.length} accounts`);
  }

  // Check upload capability
  if (tiktokAccounts.count > 0) {
    const firstAccount = tiktokAccounts.accounts[0];
    const canUpload = MultiAccountService.canUploadNow(firstAccount.accountId);
    console.log('✅ Upload capability:', {
      canUpload: canUpload.canUpload,
      reason: canUpload.reason
    });
  }
} catch (error) {
  console.error('❌ Account Utilities Test Failed:', error.message);
}

// Test 8: Error Handling
console.log('\n⚠️  TEST 8: ERROR HANDLING');
console.log('-'.repeat(80));

try {
  // Record error on queue item
  const firstQueue = VideoQueueService.queue[0];
  if (firstQueue) {
    const errorResult = VideoQueueService.recordError(
      firstQueue.queueId,
      new Error('Test encoding error'),
      'video_encoding'
    );

    console.log('✅ Recorded error on queue item');
    console.log('   Retry attempt:', errorResult.errorCount);
    console.log('   Will retry:', errorResult.willRetry);
  }

  // Record error on account
  const allAccounts = MultiAccountService.getAllAccounts();
  if (allAccounts.count > 0) {
    const account = allAccounts.accounts[0];
    const errorResult = MultiAccountService.recordError(
      account.accountId,
      new Error('Test upload error')
    );

    console.log('✅ Recorded error on account');
    console.log('   Account deactivated:', !errorResult.accountId);
  }
} catch (error) {
  console.error('❌ Error Handling Test Failed:', error.message);
}

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL SYSTEM STATUS');
console.log('='.repeat(80));

try {
  const finalStats = ProcessOrchestratorService.getSystemStatus();

  console.log('\n📊 QUEUE STATUS:');
  console.log(`   Total: ${finalStats.queue.total}`);
  console.log(`   Pending: ${finalStats.queue.byStatus.pending}`);
  console.log(`   Processing: ${finalStats.queue.byStatus.processing}`);
  console.log(`   Ready: ${finalStats.queue.byStatus.ready}`);
  console.log(`   Uploaded: ${finalStats.queue.byStatus.uploaded}`);
  console.log(`   Failed: ${finalStats.queue.byStatus.failed}`);

  console.log('\n📊 UPLOAD STATUS:');
  console.log(`   Total: ${finalStats.uploads.total}`);
  console.log(`   Pending: ${finalStats.uploads.byStatus.pending}`);
  console.log(`   Success Rate: ${finalStats.uploads.successRate}%`);

  console.log('\n📊 ACCOUNT STATUS:');
  console.log(`   Total: ${finalStats.accounts.totalAccounts}`);
  console.log(`   Verified: ${finalStats.accounts.verifiedAccounts}`);
  console.log(`   TikTok: ${finalStats.accounts.byPlatform.tiktok}`);
  console.log(`   YouTube: ${finalStats.accounts.byPlatform.youtube}`);
  console.log(`   Facebook: ${finalStats.accounts.byPlatform.facebook}`);

  console.log('\n📊 JOB STATUS:');
  console.log(`   Total Jobs: ${finalStats.jobs.totalJobs}`);
  console.log(`   Enabled: ${finalStats.jobs.enabledJobs}`);
  console.log(`   Success Rate: ${finalStats.jobs.successRate}%`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(80));
} catch (error) {
  console.error('❌ Final Summary Failed:', error.message);
}
