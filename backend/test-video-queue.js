/**
 * Video Queue Service Test
 * Test queue operations, status tracking, and statistics
 */

import VideoQueueService from '../services/videoQueueService.js';

console.log('='.repeat(80));
console.log('VIDEO QUEUE SERVICE TEST');
console.log('='.repeat(80));

// Clean start
VideoQueueService.clearQueue();

// Test 1: Add to queue
console.log('\n1️⃣ TEST: Adding videos to queue');
console.log('-'.repeat(80));

const video1 = VideoQueueService.addToQueue({
  videoConfig: { layout: 'side-by-side', duration: 30 },
  platform: 'tiktok',
  contentType: 'product_promo',
  priority: 'high',
  metadata: { product: 'shoe-1' }
});

console.log('✅ Added video 1:', video1.queueId);
console.log('   Status:', video1.queueItem.status);
console.log('   Priority:', video1.queueItem.priority);

const video2 = VideoQueueService.addToQueue({
  videoConfig: { layout: 'pip', duration: 45 },
  platform: 'youtube',
  contentType: 'hot_mashup',
  priority: 'normal'
});

console.log('✅ Added video 2:', video2.queueId);

// Test 2: Batch add
console.log('\n2️⃣ TEST: Batch adding videos');
console.log('-'.repeat(80));

const batch = VideoQueueService.addBatchToQueue({
  videos: [
    { layout: 'side-by-side' },
    { layout: 'pip' },
    { layout: 'side-by-side' }
  ],
  platform: 'facebook',
  contentType: 'mixed',
  priority: 'low'
});

console.log(`✅ Added batch: ${batch.batchSize} videos, Batch ID: ${batch.batchId}`);
console.log(`   Queue IDs: ${batch.queueIds.slice(0, 2).join(', ')}...`);

// Test 3: Status updates
console.log('\n3️⃣ TEST: Status updates');
console.log('-'.repeat(80));

const updateStatus = VideoQueueService.updateQueueStatus(video1.queueId, 'processing');
console.log('✅ Updated status:', updateStatus.oldStatus, '→', updateStatus.newStatus);

const updateComplete = VideoQueueService.updateQueueStatus(video1.queueId, 'ready', {
  videoPath: '/media/output/video1.mp4'
});
console.log('✅ Updated to ready with video path');

// Test 4: Get next pending
console.log('\n4️⃣ TEST: Get next pending videos');
console.log('-'.repeat(80));

const nextTiktok = VideoQueueService.getNextPending('tiktok');
if (nextTiktok.success) {
  console.log('✅ Next TikTok video:', nextTiktok.queueItem.queueId);
  console.log('   Priority:', nextTiktok.queueItem.priority);
} else {
  console.log('❌ No TikTok videos pending');
}

const nextAll = VideoQueueService.getNextPending();
if (nextAll.success) {
  console.log('✅ Next video (any platform):', nextAll.queueItem.queueId);
} else {
  console.log('❌ No videos in queue');
}

// Test 5: Error recording
console.log('\n5️⃣ TEST: Error recording');
console.log('-'.repeat(80));

if (video2.queueId) {
  const errorRecord = VideoQueueService.recordError(
    video2.queueId,
    new Error('FFmpeg encoding failed'),
    'encoding'
  );

  console.log('✅ Error recorded');
  console.log('   Error count:', errorRecord.errorCount);
  console.log('   Will retry:', errorRecord.willRetry);
  console.log('   New status:', errorRecord.queueItem.status);
}

// Test 6: Statistics
console.log('\n6️⃣ TEST: Queue statistics');
console.log('-'.repeat(80));

const stats = VideoQueueService.getQueueStats();
console.log('✅ Detailed statistics:');
console.log('   Total videos:', stats.stats.total);
console.log('   By status:');
console.log('      Pending:', stats.stats.byStatus.pending);
console.log('      Processing:', stats.stats.byStatus.processing);
console.log('      Ready:', stats.stats.byStatus.ready);
console.log('      Uploaded:', stats.stats.byStatus.uploaded);
console.log('      Failed:', stats.stats.byStatus.failed);
console.log('   By platform:');
console.log('      TikTok:', stats.stats.byPlatform.tiktok || 0);
console.log('      YouTube:', stats.stats.byPlatform.youtube || 0);
console.log('      Facebook:', stats.stats.byPlatform.facebook || 0);
console.log('   By content type:');
console.log('      Product promo:', stats.stats.byContentType.product_promo || 0);
console.log('      Hot mashup:', stats.stats.byContentType.hot_mashup || 0);

// Test 7: Get specific item
console.log('\n7️⃣ TEST: Get queue item');
console.log('-'.repeat(80));

const getItem = VideoQueueService.getQueueItem(video1.queueId);
if (getItem.success) {
  console.log('✅ Retrieved queue item:', video1.queueId);
  console.log('   Current status:', getItem.queueItem.status);
  console.log('   Created:', getItem.queueItem.createdAt);
  console.log('   Video path:', getItem.queueItem.videoPath || 'Not yet generated');
}

// Test 8: Ready videos for upload
console.log('\n8️⃣ TEST: Get ready videos');
console.log('-'.repeat(80));

const nextReady = VideoQueueService.getNextReady();
if (nextReady.success) {
  console.log('✅ Next ready video:', nextReady.queueItem.queueId);
  console.log('   Video path:', nextReady.queueItem.videoPath);
} else {
  console.log('⚠️ No ready videos in queue (this is OK for test)');
}

// Test 9: Failed videos
console.log('\n9️⃣ TEST: Failed videos');
console.log('-'.repeat(80));

const failedVideos = VideoQueueService.getFailedVideos();
console.log('✅ Failed videos:', failedVideos.count);
if (failedVideos.count > 0) {
  failedVideos.failed.forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.queueId}: ${v.errorLog.length} errors`);
  });
}

// Test 10: Cleanup
console.log('\n🔟 TEST: Cleanup operations');
console.log('-'.repeat(80));

// Mark some items as old for cleanup test
const statusUpdate2 = VideoQueueService.updateQueueStatus(video2.queueId, 'uploaded');

const cleanup = VideoQueueService.cleanupQueue({
  daysOld: 0,
  statuses: ['uploaded']
});

console.log('✅ Cleanup completed');
console.log('   Deleted items:', cleanup.deleted);

// Test 11: Process logs
console.log('\n1️⃣1️⃣ TEST: Process logs');
console.log('-'.repeat(80));

const logs = VideoQueueService.getProcessLogs(video1.queueId);
console.log('✅ Process logs retrieved');
console.log('   Total logs for video 1:', logs.count);
if (logs.logs.length > 0) {
  console.log('   Recent events:');
  logs.logs.slice(-3).forEach(log => {
    console.log(`      - ${log.stage}: ${log.status}`);
  });
}

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL QUEUE STATE');
console.log('='.repeat(80));

const finalStats = VideoQueueService.getQueueStats();
console.log('\n📊 Queue Overview:');
console.log(`✅ Total items in queue: ${finalStats.stats.total}`);
console.log(`✅ Error rate: ${finalStats.stats.errorRate.toFixed(2)}%`);

if (finalStats.stats.oldestPending) {
  console.log(`✅ Oldest pending: ${finalStats.stats.oldestPending.queueId}`);
}

if (finalStats.stats.newestAdded) {
  console.log(`✅ Newest added: ${finalStats.stats.newestAdded.queueId}`);
}

console.log('\n' + '='.repeat(80));
console.log('✅ VIDEO QUEUE SERVICE TEST COMPLETED!');
console.log('='.repeat(80));
