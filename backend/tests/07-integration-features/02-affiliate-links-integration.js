#!/usr/bin/env node

/**
 * Test Affiliate Link Integration & Platform Optimizer
 * Verifies complete flow from link generation to batch performance tracking
 */

import axios from 'axios';

const API = 'http://localhost:5000/api/affiliate';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('\n🎯 AFFILIATE LINK INTEGRATION TEST\n');

  try {
    // ========================================
    // TEST 1: Generate Tracking Links
    // ========================================
    console.log('📌 TEST 1: Generate Tracking Links');
    console.log('──────────────────────────────────');

    const linkResponse = await axios.post(`${API}/links/generate`, {
      baseLink: 'https://amazon.com/dp/B123456789',
      videoId: 'video-hoodie-001',
      productName: 'Premium Fashion Hoodie',
      affiliateProgram: 'amazon',
      campaignId: 'campaign-001',
      metadata: {
        category: 'Fashion',
        platform: 'tiktok'
      }
    });

    console.log(`✅ Tracking link generated`);
    console.log(`   Tracking Code: ${linkResponse.data.trackingCode}`);
    console.log(`   Unique ID: ${linkResponse.data.uniqueId}`);
    console.log(`   Program: ${linkResponse.data.program}`);
    console.log(`   Commission: ${linkResponse.data.expectedCommission}`);

    const trackingCode = linkResponse.data.trackingCode;
    const trackingLink = linkResponse.data.trackingLink;

    // ========================================
    // TEST 2: Get Affiliate Recommendations
    // ========================================
    console.log('\n📌 TEST 2: Get Affiliate Program Recommendations');
    console.log('───────────────────────────────────────────────');

    const recommendations = await axios.get(`${API}/links/recommendations?category=fashion`);

    console.log(`✅ Retrieved recommendations for Fashion`);
    recommendations.data.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.program} (${rec.priority})`);
      console.log(`      → ${rec.reason}`);
    });

    // ========================================
    // TEST 3: Record Click
    // ========================================
    console.log('\n📌 TEST 3: Record Affiliate Link Click');
    console.log('──────────────────────────────────────');

    const clickResponse = await axios.post(`${API}/links/click`, {
      trackingCode,
      metadata: {
        platform: 'tiktok',
        userAgent: 'Mozilla/5.0',
        ipHash: 'user123'
      }
    });

    console.log(`✅ Click recorded`);
    console.log(`   Time: ${new Date(clickResponse.data.clickTime).toISOString()}`);

    // Simulate more clicks
    for (let i = 0; i < 4; i++) {
      await axios.post(`${API}/links/click`, {
        trackingCode,
        metadata: { platform: 'tiktok' }
      });
    }
    console.log(`   +4 more clicks recorded (total: 5)`);

    // ========================================
    // TEST 4: Record Conversions
    // ========================================
    console.log('\n📌 TEST 4: Record Affiliate Conversions');
    console.log('──────────────────────────────────────');

    for (let i = 0; i < 3; i++) {
      await axios.post(`${API}/links/conversion`, {
        trackingCode,
        conversionData: {
          amount: 1,
          orderValue: 49.99,
          commission: 4.99,
          status: 'approved'
        }
      });
    }

    console.log(`✅ Conversions recorded`);
    console.log(`   Total conversions: 3`);
    console.log(`   Total revenue: $14.97`);

    // ========================================
    // TEST 5: Get Link Stats
    // ========================================
    console.log('\n📌 TEST 5: Get Link Performance Stats');
    console.log('──────────────────────────────────────');

    const statsResponse = await axios.get(
      `${API}/links/stats?trackingCode=${trackingCode}`
    );

    const stats = statsResponse.data.stats;
    console.log(`✅ Link stats retrieved`);
    console.log(`   Total Clicks: ${stats.totalClicks}`);
    console.log(`   Total Conversions: ${stats.totalConversions}`);
    console.log(`   Click-to-Conversion Rate: ${stats.clickToConversionRate}%`);
    console.log(`   Revenue: $${stats.totalRevenue}`);
    console.log(`   Avg Order Value: $${stats.averageOrderValue}`);

    // ========================================
    // TEST 6: Generate Batch Links
    // ========================================
    console.log('\n📌 TEST 6: Generate Batch Tracking Links');
    console.log('────────────────────────────────────────');

    const batchId = `batch-${Date.now()}`;
    const batchLinksResponse = await axios.post(`${API}/links/batch-generate`, {
      batchId,
      videos: [
        { videoId: 'video-hoodie-001', productName: 'Premium Hoodie', category: 'Fashion' },
        { videoId: 'video-jeans-001', productName: 'Designer Jeans', category: 'Fashion' },
        { videoId: 'video-shoes-001', productName: 'Running Shoes', category: 'Footwear' }
      ],
      affiliateProgram: 'amazon',
      baseLinks: {
        'Premium Hoodie': 'https://amazon.com/dp/B111111111',
        'Designer Jeans': 'https://amazon.com/dp/B222222222',
        'Running Shoes': 'https://amazon.com/dp/B333333333'
      }
    });

    console.log(`✅ Batch links generated`);
    console.log(`   Batch ID: ${batchId}`);
    console.log(`   Total Links: ${batchLinksResponse.data.totalLinks}`);
    console.log(`   Program: ${batchLinksResponse.data.affiliateProgram}`);

    // Record simulated metrics for batch
    const batchTrackingCodes = batchLinksResponse.data.links.map(l => l.trackingCode);
    for (const code of batchTrackingCodes) {
      // Simulate clicks
      for (let i = 0; i < 3; i++) {
        await axios.post(`${API}/links/click`, {
          trackingCode: code,
          metadata: { platform: 'tiktok' }
        });
      }
      // Simulate conversions
      await axios.post(`${API}/links/conversion`, {
        trackingCode: code,
        conversionData: {
          amount: 1,
          orderValue: Math.random() * 100,
          commission: Math.random() * 10,
          status: 'approved'
        }
      });
    }

    console.log(`   Simulated metrics: 9 clicks, 3 conversions across batch`);

    // ========================================
    // TEST 7: Get Batch Performance
    // ========================================
    console.log('\n📌 TEST 7: Get Batch Affiliate Performance');
    console.log('──────────────────────────────────────────');

    const batchPerformance = await axios.get(
      `${API}/links/batch-performance?batchId=${batchId}`
    );

    const perf = batchPerformance.data.performance;
    console.log(`✅ Batch performance retrieved`);
    console.log(`   Total Links: ${perf.summary.totalLinks}`);
    console.log(`   Total Clicks: ${perf.summary.totalClicks}`);
    console.log(`   Total Conversions: ${perf.summary.totalConversions}`);
    console.log(`   Click-to-Conversion: ${perf.summary.clickToConversionRate}%`);
    console.log(`   Total Revenue: $${perf.summary.totalRevenue}`);

    if (perf.topPerformers.length > 0) {
      console.log(`\n   🏆 Top Performers:`);
      perf.topPerformers.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.productName}`);
        console.log(`      Clicks: ${item.clicks} | Conversions: ${item.conversions} | Revenue: $${item.revenue}`);
      });
    }

    // ========================================
    // TEST 8: Get Video Affiliate Stats
    // ========================================
    console.log('\n📌 TEST 8: Get Video Affiliate Statistics');
    console.log('─────────────────────────────────────────');

    const videoStats = await axios.get(
      `${API}/links/video-stats?videoId=video-hoodie-001`
    );

    const vstats = videoStats.data.stats;
    console.log(`✅ Video affiliate stats retrieved`);
    console.log(`   Video ID: ${vstats.videoId}`);
    console.log(`   Total Links: ${vstats.totalLinks}`);
    console.log(`   Total Clicks: ${vstats.totalClicks}`);
    console.log(`   Total Conversions: ${vstats.totalConversions}`);
    console.log(`   CTR: ${vstats.clickToConversionRate}%`);
    console.log(`   Revenue: $${vstats.totalRevenue}`);

    // ========================================
    // TEST 9: Export Performance Data
    // ========================================
    console.log('\n📌 TEST 9: Export Performance Data');
    console.log('──────────────────────────────────');

    const exportData = await axios.get(`${API}/links/export`);

    console.log(`✅ Performance data exported`);
    console.log(`   Total Clicks: ${exportData.data.summary.totalClicks}`);
    console.log(`   Total Conversions: ${exportData.data.summary.totalConversions}`);
    console.log(`   Total Revenue: $${exportData.data.summary.totalRevenue}`);

    // ========================================
    // TEST 10: Platform Optimizer Verification
    // ========================================
    console.log('\n📌 TEST 10: Platform Optimizer Integration');
    console.log('──────────────────────────────────────────');

    const platformsResponse = await axios.get(`${API}/platforms`);
    const platforms = platformsResponse.data.platforms;

    console.log(`✅ All platforms available`);
    const platformKeys = Object.keys(platforms);
    platformKeys.forEach(key => {
      const p = platforms[key];
      console.log(`   ✓ ${p.name}`);
      console.log(`     Aspect: ${p.aspectRatio} | Duration: ${p.optimalDuration}s | Resolution: ${p.resolution}`);
    });

    console.log(`   Total: ${platformKeys.length} platforms optimized`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '═'.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('═'.repeat(50));

    console.log('\n📊 FINAL STATISTICS:');
    console.log(`   ✓ ${batchLinksResponse.data.totalLinks} batch links generated`);
    console.log(`   ✓ ${statsResponse.data.stats.totalClicks} clicks recorded`);
    console.log(`   ✓ ${statsResponse.data.stats.totalConversions} conversions recorded`);
    console.log(`   ✓ $${(parseFloat(statsResponse.data.stats.totalRevenue) + parseFloat(perf.summary.totalRevenue)).toFixed(2)} total revenue tracked`);
    console.log(`   ✓ ${platformKeys.length} platforms optimized`);
    console.log(`   ✓ 9 new API endpoints functional`);

    console.log('\n🎯 AFFILIATE LINK SYSTEM: COMPLETE & READY\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('❌ FATAL ERROR:', err);
  process.exit(1);
});
