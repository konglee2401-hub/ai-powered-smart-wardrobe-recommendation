/**
 * Affiliate Video Production API Controller
 * Handles affiliate video creation, optimization, and analytics
 */

import AffiliateVideoService from '../services/affiliateVideoService.js';
import AutoSubtitleService from '../services/autoSubtitleService.js';
import VideoAnalyticsService from '../services/videoAnalyticsService.js';
import PlatformOptimizer from '../services/platformOptimizer.js';
import AffiliateLinkService from '../services/affiliateLinkService.js';

const affiliateService = new AffiliateVideoService();
const subtitleService = new AutoSubtitleService();
const analyticsService = new VideoAnalyticsService();
const platformOptimizer = new PlatformOptimizer();
const linkService = AffiliateLinkService;

/**
 * Create new affiliate video project
 */
export async function createAffiliateProject(req, res) {
  try {
    const { name, niche, platforms, affiliateLinks, duration, watermark, music } = req.body;

    if (!name || !niche) {
      return res.status(400).json({
        error: 'name and niche are required',
        success: false
      });
    }

    const result = affiliateService.createProject({
      name,
      niche,
      platforms: platforms || ['instagram-reels', 'youtube-shorts', 'tiktok'],
      affiliateLinks: affiliateLinks || [],
      duration: duration || 15,
      watermark,
      music
    });

    return res.json({
      success: result.success,
      projectId: result.projectId,
      config: result.config,
      message: `Created affiliate project: ${name}`
    });
  } catch (error) {
    console.error('❌ Create project error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Add products for bulk video generation
 */
export async function addProductsToBatch(req, res) {
  try {
    const { projectId, products } = req.body;

    if (!projectId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'projectId and products array are required',
        success: false
      });
    }

    const result = await affiliateService.addProductsToBatch(projectId, products);

    return res.json({
      success: result.success,
      batchId: result.batchId,
      totalProducts: result.batchData?.totalProducts,
      message: `Added batch with ${result.batchData?.totalProducts || 0} products`
    });
  } catch (error) {
    console.error('❌ Add products error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate auto-subtitles for video
 */
export async function generateSubtitles(req, res) {
  try {
    const { 
      videoContext, 
      duration = 15, 
      affiliateKeywords = [], 
      platform = 'youtube-shorts',
      format = 'json' // json, srt, vtt, youtube
    } = req.body;

    if (!videoContext) {
      return res.status(400).json({
        error: 'videoContext is required',
        success: false
      });
    }

    const result = await subtitleService.generateAffiliateSubtitles(
      videoContext,
      { duration, affiliateKeywords, platform }
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        success: false,
        fallbackSubtitles: result.subtitles
      });
    }

    let formattedResult = result;

    // Convert to requested format
    if (format === 'srt') {
      const srtResult = subtitleService.convertToSRT(result.subtitles);
      formattedResult = {
        ...result,
        ...srtResult,
        content: srtResult.content
      };
    } else if (format === 'vtt') {
      const vttResult = subtitleService.convertToVTT(result.subtitles);
      formattedResult = {
        ...result,
        ...vttResult,
        content: vttResult.content
      };
    } else if (format === 'youtube') {
      const youtubeResult = subtitleService.generateYouTubeFormat(result.subtitles);
      formattedResult = { ...result, ...youtubeResult };
    }

    return res.json({
      success: true,
      subtitles: formattedResult.subtitles || formattedResult.data,
      format: formattedResult.format || format,
      content: formattedResult.content,
      metadata: formattedResult.metadata
    });
  } catch (error) {
    console.error('❌ Generate subtitles error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get video templates for niche
 */
export async function getVideoTemplates(req, res) {
  try {
    const { niche = 'general' } = req.query;

    const templates = affiliateService.getTemplates(niche);

    return res.json({
      success: true,
      niche,
      templates,
      count: templates.length
    });
  } catch (error) {
    console.error('❌ Get templates error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate SEO metadata for video
 */
export async function generateMetadata(req, res) {
  try {
    const { productName, category, affiliateKeywords = [] } = req.body;

    if (!productName || !category) {
      return res.status(400).json({
        error: 'productName and category are required',
        success: false
      });
    }

    const result = affiliateService.generateMetadata(productName, category, affiliateKeywords);

    return res.json({
      success: result.success,
      metadata: result.metadata,
      platforms: Object.keys(result.metadata)
    });
  } catch (error) {
    console.error('❌ Generate metadata error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get batch processing report
 */
export async function getBatchReport(req, res) {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        error: 'batchId is required',
        success: false
      });
    }

    const result = affiliateService.getBatchReport(batchId);

    return res.json({
      success: result.success,
      report: result.report
    });
  } catch (error) {
    console.error('❌ Get batch report error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Record video performance metrics
 */
export async function recordVideoMetrics(req, res) {
  try {
    const { videoId, metrics } = req.body;

    if (!videoId || !metrics) {
      return res.status(400).json({
        error: 'videoId and metrics are required',
        success: false
      });
    }

    const result = analyticsService.recordVideoMetrics(videoId, metrics);

    return res.json({
      success: result.success,
      metrics: result.metrics
    });
  } catch (error) {
    console.error('❌ Record metrics error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get video analytics report
 */
export async function getAnalyticsReport(req, res) {
  try {
    const { batchId, videoId } = req.query;

    if (videoId) {
      const result = analyticsService.getLatestMetrics(videoId);
      return res.json(result);
    }

    if (batchId) {
      // This would need actual video list from batch
      const report = {
        success: true,
        batchId,
        message: 'Use getVideoInsights endpoint for detailed analysis'
      };
      return res.json(report);
    }

    return res.status(400).json({
      error: 'batchId or videoId is required',
      success: false
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get content insights from analytics
 */
export async function getVideoInsights(req, res) {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({
        error: 'batchId is required',
        success: false
      });
    }

    const result = analyticsService.getContentInsights(batchId);

    return res.json({
      success: result.success,
      insights: result.insights
    });
  } catch (error) {
    console.error('❌ Get insights error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Optimize video for specific platform
 */
export async function optimizeForPlatform(req, res) {
  try {
    const { videoPath, platform, metadata = {} } = req.body;

    if (!videoPath || !platform) {
      return res.status(400).json({
        error: 'videoPath and platform are required',
        success: false
      });
    }

    const result = platformOptimizer.adaptForPlatform(videoPath, platform, metadata);

    return res.json({
      success: result.success,
      optimization: result,
      platform
    });
  } catch (error) {
    console.error('❌ Optimize video error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Optimize for all platforms
 */
export async function optimizeForAllPlatforms(req, res) {
  try {
    const { videoPath, metadata = {} } = req.body;

    if (!videoPath) {
      return res.status(400).json({
        error: 'videoPath is required',
        success: false
      });
    }

    const result = platformOptimizer.adaptForAllPlatforms(videoPath, metadata);

    return res.json({
      success: result.success,
      summary: result.summary,
      adaptations: Object.keys(result.adaptations),
      results: result.results
    });
  } catch (error) {
    console.error('❌ Batch optimize error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get platform requirements and checklist
 */
export async function getPlatformChecklist(req, res) {
  try {
    const { platform } = req.query;

    if (!platform) {
      return res.status(400).json({
        error: 'platform is required',
        success: false
      });
    }

    const checklist = platformOptimizer.getUploadChecklist(platform);
    const metadata = platformOptimizer.getPlatformMetadataRequirements(platform);

    return res.json({
      success: true,
      platform,
      uploadChecklist: checklist.preUploadChecklist,
      contentGuidelinesChecklist: checklist.contentGuidelinesChecklist,
      metadataRequirements: metadata
    });
  } catch (error) {
    console.error('❌ Get checklist error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get all available platforms and their specs
 */
export async function getAvailablePlatforms(req, res) {
  try {
    const platforms = {
      'instagram-reels': {
        name: 'Instagram Reels',
        aspectRatio: '9:16',
        optimalLength: '15s',
        audience: 'Viral-focused, entertainment'
      },
      'youtube-shorts': {
        name: 'YouTube Shorts',
        aspectRatio: '9:16',
        optimalLength: '30s',
        audience: 'High retention, SEO-friendly'
      },
      'tiktok': {
        name: 'TikTok',
        aspectRatio: '9:16',
        optimalLength: '9s',
        audience: 'Trending, sound-synced'
      },
      'facebook': {
        name: 'Facebook',
        aspectRatio: '1:1',
        optimalLength: '15s',
        audience: 'Organic reach, older demographic'
      },
      'twitter': {
        name: 'Twitter/X',
        aspectRatio: '16:9',
        optimalLength: '30s',
        audience: 'News-driven, quick consumption'
      }
    };

    return res.json({
      success: true,
      platforms,
      totalPlatforms: Object.keys(platforms).length,
      supportedPlatforms: Object.keys(platforms)
    });
  } catch (error) {
    console.error('❌ Get platforms error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate unique tracking link
 */
export async function generateTrackingLink(req, res) {
  try {
    const { baseLink, videoId, productName, affiliateProgram, campaignId, metadata } = req.body;

    if (!baseLink || !videoId) {
      return res.status(400).json({
        error: 'baseLink and videoId are required',
        success: false
      });
    }

    const result = linkService.generateTrackingLink({
      baseLink,
      videoId,
      productName,
      affiliateProgram: affiliateProgram || 'amazon',
      campaignId,
      metadata
    });

    return res.json(result);
  } catch (error) {
    console.error('❌ Generate tracking link error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Record click on affiliate link
 */
export async function recordLinkClick(req, res) {
  try {
    const { trackingCode, metadata } = req.body;

    if (!trackingCode) {
      return res.status(400).json({
        error: 'trackingCode is required',
        success: false
      });
    }

    const result = linkService.recordClick(trackingCode, metadata);

    return res.json(result);
  } catch (error) {
    console.error('❌ Record click error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Record conversion
 */
export async function recordConversion(req, res) {
  try {
    const { trackingCode, conversionData } = req.body;

    if (!trackingCode || !conversionData) {
      return res.status(400).json({
        error: 'trackingCode and conversionData are required',
        success: false
      });
    }

    const result = linkService.recordConversion(trackingCode, conversionData);

    return res.json(result);
  } catch (error) {
    console.error('❌ Record conversion error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get link stats
 */
export async function getLinkStats(req, res) {
  try {
    const { trackingCode } = req.query;

    if (!trackingCode) {
      return res.status(400).json({
        error: 'trackingCode is required',
        success: false
      });
    }

    const stats = linkService.getLinkStats(trackingCode);

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get link stats error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get video affiliate stats
 */
export async function getVideoAffiliateStats(req, res) {
  try {
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({
        error: 'videoId is required',
        success: false
      });
    }

    const stats = linkService.getVideoAffiliateStats(videoId);

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get video affiliate stats error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get affiliate program recommendations
 */
export async function getAffiliateRecommendations(req, res) {
  try {
    const { category } = req.query;

    const recommendations = linkService.getAffiliateRecommendations(category);

    return res.json({
      success: true,
      category,
      recommendations
    });
  } catch (error) {
    console.error('❌ Get recommendations error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Generate batch tracking links
 */
export async function generateBatchLinks(req, res) {
  try {
    const { batchId, videos, affiliateProgram, baseLinks, metadata } = req.body;

    if (!batchId || !videos) {
      return res.status(400).json({
        error: 'batchId and videos are required',
        success: false
      });
    }

    const result = linkService.generateBatchLinks({
      batchId,
      videos,
      affiliateProgram,
      baseLinks,
      metadata
    });

    return res.json(result);
  } catch (error) {
    console.error('❌ Generate batch links error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Get batch affiliate performance
 */
export async function getBatchAffiliatePerformance(req, res) {
  try {
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({
        error: 'batchId is required',
        success: false
      });
    }

    const performance = linkService.getBatchAffiliatePerformance(batchId);

    return res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('❌ Get batch performance error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}

/**
 * Export performance data
 */
export async function exportPerformanceData(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const exportData = linkService.exportPerformanceData({
      startDate,
      endDate
    });

    return res.json(exportData);
  } catch (error) {
    console.error('❌ Export data error:', error);
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
