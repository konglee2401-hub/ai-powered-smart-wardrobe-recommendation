/**
 * Affiliate Video Production System - Comprehensive Demo
 * Shows complete workflow from project creation to analytics
 */

import AffiliateVideoService from '../services/affiliateVideoService.js';
import AutoSubtitleService from '../services/autoSubtitleService.js';
import VideoAnalyticsService from '../services/videoAnalyticsService.js';
import PlatformOptimizer from '../services/platformOptimizer.js';

const affiliateService = new AffiliateVideoService();
const subtitleService = new AutoSubtitleService();
const analyticsService = new VideoAnalyticsService();
const platformOptimizer = new PlatformOptimizer();

// ==================== DEMO UTILITIES ====================

class Log {
  static section(title) {
    console.log('\n' + '='.repeat(80));
    console.log(`📋 ${title}`);
    console.log('='.repeat(80));
  }

  static step(num, title) {
    console.log(`\n[Step ${num}] ${title}`);
    console.log('-'.repeat(60));
  }

  static success(msg) {
    console.log(`✅ ${msg}`);
  }

  static info(msg) {
    console.log(`ℹ️  ${msg}`);
  }

  static error(msg) {
    console.log(`❌ ${msg}`);
  }

  static table(data) {
    console.table(data);
  }

  static json(obj) {
    console.log(JSON.stringify(obj, null, 2));
  }
}

// ==================== DEMO SCENARIOS ====================

async function demo1_CreateProjectAndAddProducts() {
  Log.section('DEMO 1: Create Affiliate Project & Bulk Upload Products');

  Log.step(1, 'Create affiliate video project');
  const projectResult = affiliateService.createProject({
    name: 'Fashion Affiliate Campaign Q1 2026',
    niche: 'fashion',
    platforms: ['instagram-reels', 'youtube-shorts', 'tiktok'],
    affiliateLinks: [
      'https://amzn.to/fashion-deals',
      'https://shop.fashion.com/aff/partner123'
    ],
    duration: 15,
    watermark: 'FashionAffiliate.com',
    music: 'trending-upbeat'
  });

  if (projectResult.success) {
    Log.success(`Created project: ${projectResult.projectId}`);
    Log.info(`Project: ${projectResult.config.name}`);
    Log.info(`Niche: ${projectResult.config.niche}`);
    Log.info(`Target Platforms: ${projectResult.config.targetPlatforms.join(', ')}`);
  }

  const projectId = projectResult.projectId;

  Log.step(2, 'Add products for bulk video generation');
  const products = [
    {
      name: 'Premium Fashion Hoodie',
      url: 'https://shop.example.com/hoodie',
      category: 'Clothing',
      price: '$49.99',
      description: 'High-quality cotton hoodie perfect for casual wear',
      affiliateLink: 'https://amzn.to/fashion-hoodie-123'
    },
    {
      name: 'Designer Sunglasses',
      url: 'https://shop.example.com/sunglasses',
      category: 'Accessories',
      price: '$89.99',
      description: 'UV protection designer sunglasses with polarized lenses',
      affiliateLink: 'https://amzn.to/sunglasses-aff'
    },
    {
      name: 'Vintage Leather Jacket',
      url: 'https://shop.example.com/jacket',
      category: 'Outerwear',
      price: '$199.99',
      description: 'Authentic vintage leather jacket with unique patina',
      affiliateLink: 'https://amzn.to/leather-jacket-deal'
    },
    {
      name: 'Fashion Sneakers',
      url: 'https://shop.example.com/sneakers',
      category: 'Footwear',
      price: '$79.99',
      description: 'Comfortable and stylish everyday sneakers',
      affiliateLink: 'https://amzn.to/sneakers-promo'
    },
    {
      name: 'Wool Cap',
      url: 'https://shop.example.com/cap',
      category: 'Accessories',
      price: '$24.99',
      description: 'Warm winter wool cap in multiple colors',
      affiliateLink: 'https://amzn.to/wool-cap-deal'
    }
  ];

  const batchResult = await affiliateService.addProductsToBatch(projectId, products);

  if (batchResult.success) {
    Log.success(`Created batch: ${batchResult.batchId}`);
    Log.info(`Total products: ${batchResult.totalProducts}`);
    Log.table(
      batchResult.batchData.products.map(p => ({
        productId: p.id,
        name: p.name,
        status: p.status,
        videoPrompt: p.videoPrompt.substring(0, 50) + '...'
      }))
    );
  }

  return { projectId, batchId: batchResult.batchId };
}

async function demo2_GenerateSubtitles() {
  Log.section('DEMO 2: Auto-Generate Affiliate Subtitles');

  Log.step(1, 'Generate subtitles for video');
  
  const videoContext = `
    Product: Premium Fashion Hoodie
    Price: $49.99
    Features: High-quality cotton, comfortable fit, modern design
    Benefit: Perfect for casual wear and looks amazing
    Call-to-action: Limited time offer with free shipping
  `;

  const affiliateKeywords = ['limited offer', 'free shipping', 'exclusive deal'];

  const subtitleResult = await subtitleService.generateAffiliateSubtitles(
    videoContext,
    {
      duration: 15,
      affiliateKeywords,
      platform: 'instagram-reels',
      style: 'engaging'
    }
  );

  if (subtitleResult.success) {
    Log.success(`Generated ${subtitleResult.subtitles.length} subtitle segments`);
    Log.info(`Platform: ${subtitleResult.platform}`);
    Log.info(`Affiliate terms found: ${subtitleResult.metadata.affiliateTermsUsed}`);
    
    Log.step(2, 'Display subtitle segments');
    Log.table(
      subtitleResult.subtitles.map(s => ({
        time: `${s.startTime}-${s.endTime}s`,
        text: s.text,
        isAffiliate: s.isAffiliateTerm ? '💰' : '-',
        isCallout: s.isCallout ? '🎯' : '-'
      }))
    );

    Log.step(3, 'Convert to different formats');
    
    // SRT Format
    const srtResult = subtitleService.convertToSRT(subtitleResult.subtitles);
    Log.success('SRT format created');
    Log.info(`Sample SRT:\n${srtResult.content.split('\n').slice(0, 8).join('\n')}`);

    // YouTube Format
    const youtubeResult = subtitleService.generateYouTubeFormat(subtitleResult.subtitles);
    Log.success('YouTube format created');
    
    // Social Media with Emojis
    const socialResult = subtitleService.generateSocialMediaCaptions(subtitleResult.subtitles);
    Log.success('Social media captions with emojis generated');
    Log.table(
      socialResult.slice(0, 3).map(s => ({
        original: s.originalText,
        withEmoji: s.textWithEmoji,
        emojiCount: s.emojiCount
      }))
    );
  }
}

async function demo3_VideoTemplatesAndMetadata() {
  Log.section('DEMO 3: Video Templates & Auto-Generated Metadata');

  Log.step(1, 'Get video templates for fashion niche');
  const templates = affiliateService.getTemplates('fashion');
  
  Log.success(`Found ${templates.length} templates for fashion niche`);
  Log.table(
    templates.map(t => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
      segments: t.segments.length,
      music: t.music
    }))
  );

  Log.step(2, 'Display template details');
  const template = templates[0];
  Log.info(`\nTemplate: ${template.name}`);
  Log.info(`Duration: ${template.duration}s`);
  Log.info('Segments:');
  template.segments.forEach(seg => {
    console.log(`  ${seg.time}: ${seg.action}`);
  });

  Log.step(3, 'Generate platform-optimized metadata');
  const metadataResult = affiliateService.generateMetadata(
    'Premium Fashion Hoodie',
    'Clothing',
    ['limited offer', 'free shipping']
  );

  if (metadataResult.success) {
    Log.success('Metadata generated for all platforms');
    
    Object.entries(metadataResult.metadata).forEach(([platform, data]) => {
      Log.info(`\n${platform}:`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Hashtags: ${data.hashtags.split(' ').length} tags`);
      console.log(`  Caption: ${data.caption.substring(0, 60)}...`);
    });
  }
}

async function demo4_PlatformOptimization() {
  Log.section('DEMO 4: Multi-Platform Video Optimization');

  Log.step(1, 'Get available platforms');
  const platforms = platformOptimizer.platformConfigs;
  
  Log.success(`Found ${Object.keys(platforms).length} supported platforms`);
  Log.table(
    Object.entries(platforms).map(([platform, config]) => ({
      platform: platform.replace('-', ' ').toUpperCase(),
      ratio: config.aspectRatio,
      duration: `${config.duration.min}-${config.duration.max}s`,
      resolution: `${config.resolution.width}x${config.resolution.height}`,
      format: config.fileFormat.toUpperCase()
    }))
  );

  Log.step(2, 'Get upload checklist for YouTube Shorts');
  const checklist = platformOptimizer.getUploadChecklist('youtube-shorts');
  
  Log.info('Pre-Upload Technical Checklist:');
  checklist.preUploadChecklist.forEach(item => {
    console.log(`  ☐ ${item.task}: ${item.value}`);
  });

  Log.info('\nContent Guidelines Checklist:');
  checklist.contentGuidelinesChecklist.forEach(item => {
    console.log(`  ☐ ${item.guideline}`);
  });

  Log.step(3, 'Get metadata requirements for TikTok');
  const tiktokMeta = platformOptimizer.getPlatformMetadataRequirements('tiktok');
  
  Log.info('TikTok Metadata Requirements:');
  console.log(`  Title: ${tiktokMeta.title.minLength}-${tiktokMeta.title.maxLength} chars`);
  console.log(`  Hashtags: Max ${tiktokMeta.hashtags.maxCount}`);
  console.log(`  Sound: ${tiktokMeta.sound.required ? 'Required' : 'Optional'}`);
  console.log(`  Music: ${tiktokMeta.sound.licensing}`);
}

async function demo5_AnalyticsAndInsights() {
  Log.section('DEMO 5: Video Analytics & Performance Tracking');

  Log.step(1, 'Record sample video metrics');
  
  const mockMetrics = {
    views: {
      instagram: 24500,
      youtube: 18300,
      tiktok: 156000
    },
    likes: {
      instagram: 2450,
      youtube: 1830,
      tiktok: 15600
    },
    comments: {
      instagram: 321,
      youtube: 892,
      tiktok: 3400
    },
    shares: {
      instagram: 450,
      youtube: 620,
      tiktok: 2100
    },
    affiliateClicks: 1250,
    conversions: 87,
    revenue: 2175.00
  };

  const metricsResult = analyticsService.recordVideoMetrics('video-fashion-hoodie-001', mockMetrics);
  
  if (metricsResult.success) {
    Log.success('Metrics recorded');
    Log.info('Performance Summary:');
    Log.table({
      'Total Views': Object.values(mockMetrics.views).reduce((a, b) => a + b, 0),
      'Total Engagement': 
        Object.values(mockMetrics.likes).reduce((a, b) => a + b, 0) +
        Object.values(mockMetrics.comments).reduce((a, b) => a + b, 0),
      'Affiliate Clicks': mockMetrics.affiliateClicks,
      'Conversions': mockMetrics.conversions,
      'Revenue': `$${mockMetrics.revenue.toFixed(2)}`
    });

    console.log('\nPlatform Breakdown:');
    Object.entries(metricsResult.metrics.platformMetrics).forEach(([platform, data]) => {
      const engagement = ((data.likes + data.comments + data.shares) / data.views * 100).toFixed(2);
      console.log(`  ${platform}: ${data.views} views, ${engagement}% engagement`);
    });
  }

  Log.step(2, 'Get latest metrics for video');
  const latestMetrics = analyticsService.getLatestMetrics('video-fashion-hoodie-001');
  
  if (latestMetrics.success) {
    Log.success('Retrieved latest metrics');
    Log.info('Current Performance:');
    Log.table(latestMetrics.currentMetrics);
  }
}

async function demo6_BulkBatchReport() {
  Log.section('DEMO 6: Batch Processing Report');

  Log.step(1, 'Generate comprehensive batch report');
  
  // Create mock video data
  const mockVideos = [
    { videoId: 'video-001', name: 'Hoodie Showcase' },
    { videoId: 'video-002', name: 'Sunglasses Review' },
    { videoId: 'video-003', name: 'Jacket Styling' },
    { videoId: 'video-004', name: 'Sneakers Unboxing' }
  ];

  // Record metrics for each video
  for (const video of mockVideos) {
    const randomClicks = Math.floor(Math.random() * 1000) + 200;
    const randomConversions = Math.floor(randomClicks * 0.07);
    
    analyticsService.recordVideoMetrics(video.videoId, {
      views: {
        instagram: Math.floor(Math.random() * 30000) + 5000,
        youtube: Math.floor(Math.random() * 20000) + 3000,
        tiktok: Math.floor(Math.random() * 200000) + 20000
      },
      likes: {
        instagram: Math.floor(Math.random() * 3000) + 500,
        youtube: Math.floor(Math.random() * 2000) + 300,
        tiktok: Math.floor(Math.random() * 20000) + 2000
      },
      comments: {
        instagram: Math.floor(Math.random() * 400) + 50,
        youtube: Math.floor(Math.random() * 1000) + 100,
        tiktok: Math.floor(Math.random() * 5000) + 500
      },
      shares: {
        instagram: Math.floor(Math.random() * 500) + 100,
        youtube: Math.floor(Math.random() * 800) + 100,
        tiktok: Math.floor(Math.random() * 3000) + 300
      },
      affiliateClicks: randomClicks,
      conversions: randomConversions,
      revenue: randomConversions * 25 // $25 average per conversion
    });
  }

  const batchReport = analyticsService.generateBatchReport('batch-fashion-001', mockVideos);

  if (batchReport.success) {
    Log.success('Batch report generated');
    Log.info('\nBatch Summary:');
    Log.table(batchReport.report.summary);

    Log.step(2, 'Top Performing Videos');
    Log.table(
      batchReport.report.topPerformers.map(v => ({
        videoId: v.videoId,
        views: v.views.toLocaleString(),
        engagement: v.engagement,
        conversions: v.conversions,
        revenue: `$${v.revenue.toFixed(2)}`
      }))
    );

    Log.step(3, 'Recommendations');
    batchReport.report.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
  }

  Log.step(4, 'Get content insights');
  const insights = analyticsService.getContentInsights('batch-fashion-001');

  if (insights.success) {
    Log.success('Generated insights');
    console.log(`\n📊 Best Performing Platform: ${insights.insights.bestPerformingPlatform.toUpperCase()}`);
    console.log(`\n🎯 Content Tips:`);
    insights.insights.contentTips.forEach((tip, idx) => {
      console.log(`  ${idx + 1}. ${tip}`);
    });
    console.log(`\n📈 Next Steps:`);
    insights.insights.nextSteps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step}`);
    });
  }
}

// ==================== MAIN EXECUTION ====================

async function runCompleteDemo() {
  try {
    Log.section('🎥 AFFILIATE VIDEO PRODUCTION SYSTEM - COMPLETE DEMO');
    
    console.log(`
This demo covers:
1. ✅ Create affiliate projects with multi-platform targeting
2. ✅ Bulk upload products for video generation
3. ✅ Auto-generate engagement-focused subtitles
4. ✅ Get pre-designed templates and auto-generated metadata
5. ✅ Optimize videos for multiple platforms
6. ✅ Track analytics and generate insights
7. ✅ Process entire batches and generate performance reports
    `);

    // Run demos
    const { projectId, batchId } = await demo1_CreateProjectAndAddProducts();
    await demo2_GenerateSubtitles();
    await demo3_VideoTemplatesAndMetadata();
    await demo4_PlatformOptimization();
    await demo5_AnalyticsAndInsights();
    await demo6_BulkBatchReport();

    // Final summary
    Log.section('✨ DEMO COMPLETE');
    console.log(`
🎯 Key Capabilities Demonstrated:

PROJECT MANAGEMENT
  ✅ Create affiliate-focused projects
  ✅ Bulk add products with auto-prompt generation
  ✅ Flexible platform targeting

CONTENT GENERATION
  ✅ AI-powered subtitle generation with affiliate optimization
  ✅ Video templates for different niches
  ✅ Platform-optimized metadata (titles, hashtags, descriptions)
  ✅ Social media caption generation with emojis

PLATFORM OPTIMIZATION
  ✅ Single video → Multi-platform adaptation
  ✅ Aspect ratio, duration, resolution optimization
  ✅ Platform-specific requirements and checklists
  ✅ Upload readiness verification

ANALYTICS & INSIGHTS
  ✅ Record video performance metrics
  ✅ Track affiliate conversions and revenue
  ✅ Generate performance insights
  ✅ Identify top performers and optimization areas

🚀 READY FOR PRODUCTION USE:
  - Affiliate link tracking
  - Bulk video scheduling
  - Multi-language support (upcoming)
  - Real-time analytics dashboard
  - A/B testing framework
    `);

  } catch (error) {
    Log.error(`Demo failed: ${error.message}`);
    console.error(error);
  }
}

// Run the demo
runCompleteDemo();
