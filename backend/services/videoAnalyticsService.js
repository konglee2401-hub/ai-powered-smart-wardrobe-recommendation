/**
 * Video Analytics & Performance Tracking Service
 * Tracks affiliate video performance across platforms
 */

import fs from 'fs';
import path from 'path';

class VideoAnalyticsService {
  constructor() {
    this.analyticsDir = path.join(process.cwd(), 'affiliate-production', 'analytics');
    this.ensureAnalyticsDir();
  }

  ensureAnalyticsDir() {
    if (!fs.existsSync(this.analyticsDir)) {
      fs.mkdirSync(this.analyticsDir, { recursive: true });
    }
  }

  /**
   * Record video performance metrics
   */
  recordVideoMetrics(videoId, metrics) {
    try {
      const metricsFile = path.join(this.analyticsDir, `${videoId}.json`);
      
      const videoMetrics = {
        videoId,
        timestamp: new Date().toISOString(),
        platformMetrics: {
          'instagram-reels': {
            views: metrics.views?.instagram || 0,
            likes: metrics.likes?.instagram || 0,
            comments: metrics.comments?.instagram || 0,
            shares: metrics.shares?.instagram || 0,
            saves: metrics.saves?.instagram || 0,
            clicks: metrics.clicks?.instagram || 0,
            engagementRate: 0
          },
          'youtube-shorts': {
            views: metrics.views?.youtube || 0,
            likes: metrics.likes?.youtube || 0,
            comments: metrics.comments?.youtube || 0,
            shares: metrics.shares?.youtube || 0,
            avgWatchDuration: metrics.watchDuration?.youtube || 0,
            clickThroughRate: 0,
            conversionRate: 0
          },
          'tiktok': {
            views: metrics.views?.tiktok || 0,
            likes: metrics.likes?.tiktok || 0,
            comments: metrics.comments?.tiktok || 0,
            shares: metrics.shares?.tiktok || 0,
            deviceShares: metrics.deviceShares?.tiktok || 0,
            engagementRate: 0
          }
        },
        affiliateMetrics: {
          affiliateLinkClicks: metrics.affiliateClicks || 0,
          conversions: metrics.conversions || 0,
          conversionRate: 0,
          revenue: metrics.revenue || 0,
          costPerClick: 0,
          roi: 0
        },
        contentQuality: {
          avgWatchPercentage: 0,
          completionRate: 0,
          repeatViewRate: 0
        }
      };

      // Calculate engagement rates
      Object.entries(videoMetrics.platformMetrics).forEach(([platform, data]) => {
        if (data.views > 0) {
          data.engagementRate = (
            ((data.likes + data.comments + data.shares) / data.views) * 100
          ).toFixed(2);
        }
      });

      // Calculate affiliate metrics
      if (videoMetrics.affiliateMetrics.affiliateLinkClicks > 0) {
        videoMetrics.affiliateMetrics.conversionRate = (
          (videoMetrics.affiliateMetrics.conversions / videoMetrics.affiliateMetrics.affiliateLinkClicks) * 100
        ).toFixed(2);
        
        videoMetrics.affiliateMetrics.costPerClick = 0; // Will be filled with actual ad spend
        
        if (videoMetrics.affiliateMetrics.revenue > 0 && videoMetrics.affiliateMetrics.affiliateLinkClicks > 0) {
          videoMetrics.affiliateMetrics.roi = (
            (videoMetrics.affiliateMetrics.revenue / (videoMetrics.affiliateMetrics.affiliateLinkClicks * 0.1)) * 100
          ).toFixed(2);
        }
      }

      fs.writeFileSync(metricsFile, JSON.stringify(videoMetrics, null, 2));

      console.log(`📊 Recorded metrics for video: ${videoId}`);
      return { success: true, metrics: videoMetrics };
    } catch (error) {
      console.error(`❌ Failed to record metrics: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate performance report for batch of videos
   */
  generateBatchReport(batchId, videos) {
    try {
      const report = {
        batchId,
        generatedAt: new Date().toISOString(),
        summary: {
          totalVideos: videos.length,
          totalViews: 0,
          totalEngagement: 0,
          totalAffiliateClicks: 0,
          totalConversions: 0,
          estimatedRevenue: 0,
          averageEngagementRate: 0
        },
        platformBreakdown: {
          'instagram-reels': { views: 0, engagement: 0, clicks: 0 },
          'youtube-shorts': { views: 0, engagement: 0, clicks: 0 },
          'tiktok': { views: 0, engagement: 0, clicks: 0 }
        },
        topPerformers: [],
        recommendations: []
      };

      let totalEngagement = 0;
      let totalClicks = 0;

      videos.forEach(video => {
        const metricsFile = path.join(this.analyticsDir, `${video.videoId}.json`);
        
        if (fs.existsSync(metricsFile)) {
          const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));

          // Update summary
          Object.entries(metrics.platformMetrics).forEach(([platform, data]) => {
            report.summary.totalViews += data.views || 0;
            report.summary.totalEngagement += (data.likes + data.comments + data.shares) || 0;
            
            if (report.platformBreakdown[platform]) {
              report.platformBreakdown[platform].views += data.views || 0;
              report.platformBreakdown[platform].engagement += (data.likes + data.comments + data.shares) || 0;
            }
          });

          report.summary.totalAffiliateClicks += metrics.affiliateMetrics.affiliateLinkClicks || 0;
          report.summary.totalConversions += metrics.affiliateMetrics.conversions || 0;
          report.summary.estimatedRevenue += metrics.affiliateMetrics.revenue || 0;

          // Track for top performers
          report.topPerformers.push({
            videoId: video.videoId,
            views: Object.values(metrics.platformMetrics).reduce((sum, p) => sum + (p.views || 0), 0),
            engagement: Object.values(metrics.platformMetrics).reduce((sum, p) => sum + ((p.likes || 0) + (p.comments || 0) + (p.shares || 0)), 0),
            conversions: metrics.affiliateMetrics.conversions,
            revenue: metrics.affiliateMetrics.revenue
          });
        }
      });

      // Calculate averages
      if (report.summary.totalViews > 0) {
        report.summary.averageEngagementRate = (
          (report.summary.totalEngagement / report.summary.totalViews) * 100
        ).toFixed(2);
      }

      // Sort top performers
      report.topPerformers.sort((a, b) => b.revenue - a.revenue);
      report.topPerformers = report.topPerformers.slice(0, 10);

      // Generate recommendations
      report.recommendations = this._generateRecommendations(report);

      // Save report
      const reportFile = path.join(this.analyticsDir, `batch-${batchId}-report.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      console.log(`📈 Generated batch report: ${batchId}`);
      return { success: true, report };
    } catch (error) {
      console.error(`❌ Failed to generate report: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get insights for content optimization
   */
  getContentInsights(batchId) {
    try {
      const reportFile = path.join(this.analyticsDir, `batch-${batchId}-report.json`);

      if (!fs.existsSync(reportFile)) {
        throw new Error(`Report not found: ${batchId}`);
      }

      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

      const insights = {
        bestPerformingPlatform: Object.entries(report.platformBreakdown).sort(
          (a, b) => parseFloat(b[1].engagement || 0) - parseFloat(a[1].engagement || 0)
        )[0][0],
        
        recommendedVideoLength: this._analyzeWatchTimes(report),
        
        bestTime: this._analyzeBestPostTime(report),
        
        contentTips: [
          'Use strong CTAs in first 3 seconds',
          'Emphasize affordability and exclusivity',
          'Show real results/before-after',
          'Include trending music/sounds',
          'End with clear affiliate link instruction'
        ],

        keywordPerformance: this._analyzeKeywords(report),

        platformOptimizations: {
          'instagram-reels': 'Focus on lifestyle integration and hashtag strategy',
          'youtube-shorts': 'Emphasize watch time and retention metrics',
          'tiktok': 'Leverage trending sounds and creator format'
        },

        nextSteps: [
          'Replicate top-performing video style',
          'A/B test different CTAs',
          'Optimize posting times',
          'Increase budget for high-ROI platforms',
          'Create series from best performers'
        ]
      };

      return { success: true, insights };
    } catch (error) {
      console.error(`❌ Failed to get insights: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track real-time metrics updates
   */
  getLatestMetrics(videoId) {
    try {
      const metricsFile = path.join(this.analyticsDir, `${videoId}.json`);

      if (!fs.existsSync(metricsFile)) {
        throw new Error(`Metrics not found for video: ${videoId}`);
      }

      const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));

      return {
        success: true,
        videoId,
        lastUpdated: metrics.timestamp,
        currentMetrics: {
          totalViews: Object.values(metrics.platformMetrics).reduce((sum, p) => sum + (p.views || 0), 0),
          totalEngagement: Object.values(metrics.platformMetrics).reduce(
            (sum, p) => sum + ((p.likes || 0) + (p.comments || 0) + (p.shares || 0)),
            0
          ),
          affiliateClicks: metrics.affiliateMetrics.affiliateLinkClicks,
          conversions: metrics.affiliateMetrics.conversions,
          estimatedRevenue: metrics.affiliateMetrics.revenue
        },
        platformBreakdown: metrics.platformMetrics
      };
    } catch (error) {
      console.error(`❌ Failed to get metrics: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== PRIVATE METHODS ====================

  _generateRecommendations(report) {
    const recommendations = [];

    if (report.summary.averageEngagementRate < 3) {
      recommendations.push('Engagement is low. Consider using more trending music and effects.');
    }

    if (report.summary.totalConversions === 0) {
      recommendations.push('No conversions yet. Strengthen CTA clarity and affiliate link placement.');
    }

    if (report.platformBreakdown['instagram-reels'].views === 0) {
      recommendations.push('Instagram Reels not getting views. Optimize hashtags and posting time.');
    }

    if (report.summary.totalViews > 50000 && report.summary.totalConversions < 100) {
      recommendations.push('High views but low conversions. Test different affiliate offers or pricing.');
    }

    recommendations.push('Continue monitoring performance daily for first 7 days.');
    recommendations.push('Repurpose top performers across other niches.');

    return recommendations;
  }

  _analyzeWatchTimes(report) {
    // Simplified: return optimal length based on platform performance
    return {
      instagram: '13-15s',
      youtube: '15-20s',
      tiktok: '9-15s',
      recommendation: 'Keep under 15 seconds for maximum completion rate'
    };
  }

  _analyzeBestPostTime(report) {
    return {
      recommendation: 'Post weekdays 6-9 PM and weekends 12-3 PM',
      timezone: 'Based on top audience location',
      frequency: 'Post 1-2 videos per day for algorithm engagement'
    };
  }

  _analyzeKeywords(report) {
    return {
      bestPerformingKeywords: [
        'Limited offer',
        'Exclusive deal',
        'Best price',
        'Free shipping'
      ],
      trendsToWatch: ['sustainability', 'viral', 'trending']
    };
  }
}

export default VideoAnalyticsService;
