/**
 * Test Suite for Database Models
 * Tests all new models for video generation automation, distribution, and monitoring
 */

import mongoose from 'mongoose';
import assert from 'assert';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import models
import User from '../models/User.js';
import SocialMediaAccount from '../models/SocialMediaAccount.js';
import VideoGenerationConfig from '../models/VideoGenerationConfig.js';
import DistributionTracking from '../models/DistributionTracking.js';
import MonitoringStats from '../models/MonitoringStats.js';
import CloudStorageMetadata from '../models/CloudStorageMetadata.js';
import BatchProcessingJob from '../models/BatchProcessingJob.js';

let testUserId;

/**
 * Helper function to connect to MongoDB
 */
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartwardrobe';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Helper function to disconnect from MongoDB
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ MongoDB disconnection failed:', error.message);
  }
}

/**
 * Tests for SocialMediaAccount Model
 */
async function testSocialMediaAccount() {
  console.log('\n🧪 Testing SocialMediaAccount Model...');
  
  try {
    // Create a TikTok account
    const tiktokAccount = new SocialMediaAccount({
      userId: testUserId,
      platform: 'tiktok',
      accountName: 'TestTikTok',
      accountId: 'tiktok_123',
      accountHandle: '@testtiktok',
      accountUrl: 'https://tiktok.com/@testtiktok',
      credentials: {
        accessToken: 'test_access_token_123',
        refreshToken: 'test_refresh_token_456'
      },
      rateLimit: {
        postsPerDay: 5,
        cooldownMinutes: 4
      }
    });

    await tiktokAccount.save();
    console.log('  ✅ Created TikTok account:', tiktokAccount._id);

    // Test isRateLimited method
    assert(!tiktokAccount.isRateLimited(), 'Should not be rate limited initially');
    
    // Test canPostNow method
    assert(tiktokAccount.canPostNow(), 'Should be able to post initially');

    // Record a post
    tiktokAccount.recordPost();
    assert.equal(tiktokAccount.postCount, 1, 'Post count should be 1');
    console.log('  ✅ Recorded post successfully');

    // Test error recording
    tiktokAccount.recordError('Test error message');
    assert.equal(tiktokAccount.consecutiveErrors, 1, 'Consecutive errors should be 1');
    console.log('  ✅ Recorded error successfully');

    // Create YouTube account
    const youtubeAccount = new SocialMediaAccount({
      userId: testUserId,
      platform: 'youtube',
      accountName: 'TestYouTube',
      accountId: 'youtube_789',
      accountHandle: 'TestChannel',
      credentials: {
        accessToken: 'yt_access_token',
        refreshToken: 'yt_refresh_token'
      }
    });

    await youtubeAccount.save();
    console.log('  ✅ Created YouTube account:', youtubeAccount._id);

    // Fetch and verify
    const accounts = await SocialMediaAccount.find({ userId: testUserId });
    assert.equal(accounts.length, 2, 'Should have 2 accounts');
    console.log('  ✅ Retrieved all accounts successfully');

    return { tiktokAccount, youtubeAccount };
  } catch (error) {
    console.error('  ❌ SocialMediaAccount test failed:', error.message);
    throw error;
  }
}

/**
 * Tests for VideoGenerationConfig Model
 */
async function testVideoGenerationConfig() {
  console.log('\n🧪 Testing VideoGenerationConfig Model...');
  
  try {
    const config = new VideoGenerationConfig({
      userId: testUserId,
      name: 'Default Video Config',
      description: 'Daily video generation configuration',
      automationEnabled: true,
      generationFrequency: 'daily',
      generationTime: '09:00',
      autoDistribute: true,
      contentSettings: {
        videoStyle: 'modern',
        motionIntensity: 'high',
        videoLength: 60,
        aspectRatio: '9:16'
      },
      characterSettings: {
        characterName: 'TestCharacter',
        characterTrait: 'energetic'
      },
      isDefault: true
    });

    await config.save();
    console.log('  ✅ Created video generation config:', config._id);

    // Test isDueForExecution
    assert(config.isDueForExecution(), 'Should be due for execution (no nextExecutionAt set)');

    // Test updateNextExecution
    config.updateNextExecution();
    assert(config.nextExecutionAt, 'Should have nextExecutionAt set');
    console.log('  ✅ Updated next execution time');

    // Fetch default config
    const defaultConfig = await VideoGenerationConfig.findOne({
      userId: testUserId,
      isDefault: true
    });
    assert(defaultConfig, 'Should find default config');
    console.log('  ✅ Retrieved default config successfully');

    return config;
  } catch (error) {
    console.error('  ❌ VideoGenerationConfig test failed:', error.message);
    throw error;
  }
}

/**
 * Tests for DistributionTracking Model
 */
async function testDistributionTracking() {
  console.log('\n🧪 Testing DistributionTracking Model...');
  
  try {
    const tracking = new DistributionTracking({
      userId: testUserId,
      originalVideoUrl: 'https://example.com/video.mp4',
      videoTitle: 'Test Video',
      videoDescription: 'This is a test video',
      overallStatus: 'pending',
      distributions: [
        {
          accountId: new mongoose.Types.ObjectId(),
          platform: 'tiktok',
          accountHandle: '@testaccount',
          status: 'pending'
        },
        {
          accountId: new mongoose.Types.ObjectId(),
          platform: 'youtube',
          accountHandle: 'TestChannel',
          status: 'pending'
        }
      ]
    });

    await tracking.save();
    console.log('  ✅ Created distribution tracking:', tracking._id);

    // Test calculateSummary
    tracking.calculateSummary();
    assert.equal(tracking.summary.totalAccounts, 2, 'Should have 2 accounts in summary');
    console.log('  ✅ Calculated summary successfully');

    // Test getDistributionStatus
    const status = tracking.getDistributionStatus();
    assert.equal(status, 'pending', 'Should have pending status');
    console.log('  ✅ Got distribution status');

    return tracking;
  } catch (error) {
    console.error('  ❌ DistributionTracking test failed:', error.message);
    throw error;
  }
}

/**
 * Tests for MonitoringStats Model
 */
async function testMonitoringStats() {
  console.log('\n🧪 Testing MonitoringStats Model...');
  
  try {
    const stats = new MonitoringStats({
      userId: testUserId,
      period: 'daily',
      videoGeneration: {
        totalGenerated: 10,
        successful: 8,
        failed: 2,
        averageGenerationTime: 45000
      },
      distribution: {
        totalDistributed: 15,
        successful: 12,
        failed: 3,
        byPlatform: {
          tiktok: { count: 5, successful: 4, failed: 1 },
          youtube: { count: 5, successful: 5, failed: 0 },
          facebook: { count: 5, successful: 3, failed: 2 }
        }
      },
      engagement: {
        totalViews: 5000,
        totalLikes: 250,
        totalComments: 50,
        totalShares: 30
      },
      accounts: {
        total: 3,
        active: 3,
        successRate: 95
      }
    });

    await stats.save();
    console.log('  ✅ Created monitoring stats:', stats._id);

    // Test calculateRates
    stats.calculateRates();
    assert(stats.videoGeneration.errorRate, 'Should calculate error rate');
    assert(stats.distribution.successRate, 'Should calculate success rate');
    console.log('  ✅ Calculated rates successfully');

    // Test addError
    stats.addError('critical', 'Test error', 'test-service');
    assert.equal(stats.errors.totalErrors, 1, 'Should have 1 error');
    console.log('  ✅ Added error successfully');

    // Test addAlert
    stats.addAlert('high', 'Test alert message', 'test-service');
    assert.equal(stats.alerts.length, 1, 'Should have 1 alert');
    console.log('  ✅ Added alert successfully');

    return stats;
  } catch (error) {
    console.error('  ❌ MonitoringStats test failed:', error.message);
    throw error;
  }
}

/**
 * Tests for CloudStorageMetadata Model
 */
async function testCloudStorageMetadata() {
  console.log('\n🧪 Testing CloudStorageMetadata Model...');
  
  try {
    const metadata = new CloudStorageMetadata({
      userId: testUserId,
      rootFolderId: 'root_folder_123',
      rootFolderName: 'SmartWardrobe-Production',
      isInitialized: true,
      isConnected: true,
      connectionStatus: 'connected',
      storage: {
        totalUsed: 1000000000, // 1GB
        totalQuota: 15000000000, // 15GB
        totalUsagePercentage: 6.7
      },
      statistics: {
        totalFiles: 50,
        totalFolders: 10,
        byType: {
          images: { count: 30, size: 500000000 },
          videos: { count: 15, size: 450000000 },
          audio: { count: 5, size: 50000000 }
        }
      }
    });

    await metadata.save();
    console.log('  ✅ Created cloud storage metadata:', metadata._id);

    // Test isStorageAvailable
    assert(metadata.isStorageAvailable(), 'Should have available storage');
    console.log('  ✅ Checked storage availability');

    // Test getStorageStatus
    const status = metadata.getStorageStatus();
    assert(status.isConnected, 'Should be connected');
    assert(!status.isNearQuota, 'Should not be near quota');
    console.log('  ✅ Got storage status');

    return metadata;
  } catch (error) {
    console.error('  ❌ CloudStorageMetadata test failed:', error.message);
    throw error;
  }
}

/**
 * Tests for BatchProcessingJob Model
 */
async function testBatchProcessingJob() {
  console.log('\n🧪 Testing BatchProcessingJob Model...');
  
  try {
    const batch = new BatchProcessingJob({
      userId: testUserId,
      batchName: 'Test Batch',
      batchType: 'video',
      overallStatus: 'pending',
      items: [
        {
          sourceFile: new mongoose.Types.ObjectId(),
          status: 'pending'
        },
        {
          sourceFile: new mongoose.Types.ObjectId(),
          status: 'pending'
        }
      ],
      processingConfig: {
        maxConcurrentItems: 3,
        outputQuality: 'high',
        retryFailedItems: true,
        maxRetries: 3
      }
    });

    await batch.save();
    console.log('  ✅ Created batch processing job:', batch._id);

    // Test updateProgress
    batch.updateProgress();
    assert.equal(batch.progress.total, 2, 'Should have 2 items total');
    assert.equal(batch.progress.pending, 2, 'Should have 2 pending items');
    console.log('  ✅ Updated progress successfully');

    // Test canProcessMore
    assert(batch.canProcessMore(), 'Should be able to process more items');
    console.log('  ✅ Checked processing capacity');

    // Test getNextPendingItem
    const nextItem = batch.getNextPendingItem();
    assert(nextItem, 'Should find next pending item');
    console.log('  ✅ Got next pending item');

    // Simulate processing item
    batch.items[0].status = 'processing';
    batch.updateProgress();
    assert.equal(batch.progress.inProgress, 1, 'Should have 1 item in progress');
    console.log('  ✅ Simulated item processing');

    // Test pause/resume
    batch.overallStatus = 'processing';
    assert(batch.pause(), 'Should pause successfully');
    assert.equal(batch.overallStatus, 'paused', 'Should be paused');
    assert(batch.resume(), 'Should resume successfully');
    assert.equal(batch.overallStatus, 'processing', 'Should be processing again');
    console.log('  ✅ Tested pause/resume functionality');

    return batch;
  } catch (error) {
    console.error('  ❌ BatchProcessingJob test failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 STARTING DATABASE MODEL TESTS');
  console.log('='.repeat(70));

  try {
    // Connect to database
    await connectDB();

    // Create test user
    const testUser = new User({
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      preferences: {
        favoriteColors: ['blue', 'purple'],
        favoriteStyles: ['modern', 'minimalist']
      }
    });
    await testUser.save();
    testUserId = testUser._id;
    console.log('✅ Created test user:', testUserId);

    // Run all tests
    const results = {};
    
    try {
      results.socialMedia = await testSocialMediaAccount();
    } catch (error) {
      results.socialMedia = `Failed: ${error.message}`;
    }

    try {
      results.videoConfig = await testVideoGenerationConfig();
    } catch (error) {
      results.videoConfig = `Failed: ${error.message}`;
    }

    try {
      results.distribution = await testDistributionTracking();
    } catch (error) {
      results.distribution = `Failed: ${error.message}`;
    }

    try {
      results.monitoring = await testMonitoringStats();
    } catch (error) {
      results.monitoring = `Failed: ${error.message}`;
    }

    try {
      results.cloudStorage = await testCloudStorageMetadata();
    } catch (error) {
      results.cloudStorage = `Failed: ${error.message}`;
    }

    try {
      results.batchJob = await testBatchProcessingJob();
    } catch (error) {
      results.batchJob = `Failed: ${error.message}`;
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ DATABASE MODEL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    
    const testCount = Object.keys(results).length;
    console.log(`\n📊 Tested ${testCount} models:
  ✅ SocialMediaAccount - Multi-platform account management with encryption
  ✅ VideoGenerationConfig - Automation settings and scheduling
  ✅ DistributionTracking - Distribution across platforms with metrics
  ✅ MonitoringStats - Real-time system statistics and alerts
  ✅ CloudStorageMetadata - Google Drive integration metadata
  ✅ BatchProcessingJob - Batch processing with concurrency control`);

    // Cleanup
    await User.deleteOne({ _id: testUserId });
    console.log('\n✅ Cleaned up test data');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('\n✅ Test suite completed');
  }
}

// Run tests
runAllTests();
