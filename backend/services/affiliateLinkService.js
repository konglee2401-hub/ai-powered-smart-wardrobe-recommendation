/**
 * Affiliate Link Integration Service
 * - Generate unique tracking links
 * - Manage multiple affiliate programs
 * - Track clicks and conversions
 * - Monitor affiliate revenue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const affiliateLinksDir = path.join(__dirname, '../affiliate-production/affiliate-links');

class AffiliateLinkService {
  constructor() {
    this.programs = {
      'amazon': {
        name: 'Amazon Associates',
        baseUrl: 'https://amazon.com',
        commission: '1-7%',
        trackingFormat: 'tag={tagId}&linkCode=xm2&creative={creative}&linkId={linkId}'
      },
      'shareasale': {
        name: 'ShareASale',
        baseUrl: 'https://www.shareasale.com',
        commission: '2-20%',
        trackingFormat: 'action=1&aff_id={affId}&merchant_id={merchantId}&url={encodedUrl}'
      },
      'impact': {
        name: 'Impact',
        baseUrl: 'https://impact.com',
        commission: '1-30%',
        trackingFormat: 'irgwc=1&clickid={clickId}&partner_id={partnerId}&url={encodedUrl}'
      },
      'cj': {
        name: 'CJ Affiliate',
        baseUrl: 'https://cj.dotomi.com',
        commission: '1-25%',
        trackingFormat: 'sid={sessionId}&website_id={websiteId}&aff_sub={affSub}'
      },
      'custom': {
        name: 'Custom Affiliate',
        baseUrl: 'custom',
        commission: 'Variable',
        trackingFormat: 'utm_source={source}&utm_medium={medium}&utm_campaign={campaign}'
      }
    };

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(affiliateLinksDir)) {
      fs.mkdirSync(affiliateLinksDir, { recursive: true });
    }
  }

  /**
   * Generate unique tracking link
   */
  generateTrackingLink(linkData) {
    const {
      baseLink,
      videoId,
      productName,
      affiliateProgram = 'amazon',
      campaignId,
      metadata = {}
    } = linkData;

    try {
      if (!baseLink) {
        return {
          success: false,
          error: 'Base link required'
        };
      }

      const program = this.programs[affiliateProgram] || this.programs['custom'];
      const uniqueId = `${videoId}-${Date.now()}`;
      const trackingCode = this.generateTrackingCode({
        videoId,
        productName,
        affiliateProgram,
        uniqueId,
        metadata
      });

      // Build tracking link with UTM parameters
      const separator = baseLink.includes('?') ? '&' : '?';
      const trackingLink = `${baseLink}${separator}utm_source=video&utm_medium=${affiliateProgram}&utm_campaign=${campaignId || videoId}&utm_content=${trackingCode}`;

      // Store tracking link info
      this.storeTrackingLink({
        uniqueId,
        videoId,
        productName,
        baseLink,
        trackingLink,
        affiliateProgram,
        trackingCode,
        createdAt: new Date(),
        metadata
      });

      return {
        success: true,
        uniqueId,
        trackingLink,
        trackingCode,
        baseLink,
        affiliateProgram,
        program: program.name,
        expectedCommission: program.commission
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate tracking code from video and product data
   */
  generateTrackingCode(data) {
    const { videoId, productName, affiliateProgram, uniqueId, metadata } = data;
    const sanitizedProduct = productName?.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) || 'product';
    const programCode = affiliateProgram?.substring(0, 3).toUpperCase() || 'AFF';
    const timestamp = Math.floor(Date.now() / 1000).toString(36);

    return `${programCode}-${sanitizedProduct}-${timestamp}`;
  }

  /**
   * Store tracking link for analytics
   */
  storeTrackingLink(linkInfo) {
    try {
      const linksFile = path.join(affiliateLinksDir, 'tracking-links.json');
      let allLinks = [];

      if (fs.existsSync(linksFile)) {
        const content = fs.readFileSync(linksFile, 'utf8');
        allLinks = JSON.parse(content);
      }

      allLinks.push(linkInfo);
      fs.writeFileSync(linksFile, JSON.stringify(allLinks, null, 2));
    } catch (error) {
      console.error('Error storing tracking link:', error);
    }
  }

  /**
   * Record click on affiliate link
   */
  recordClick(trackingCode, metadata = {}) {
    try {
      const clicksFile = path.join(affiliateLinksDir, 'clicks-log.json');
      let clicks = [];

      if (fs.existsSync(clicksFile)) {
        const content = fs.readFileSync(clicksFile, 'utf8');
        clicks = JSON.parse(content);
      }

      clicks.push({
        trackingCode,
        timestamp: new Date(),
        userAgent: metadata.userAgent || 'unknown',
        referer: metadata.referer || 'direct',
        ipHash: metadata.ipHash || 'anonymous',
        platform: metadata.platform || 'desktop',
        metadata
      });

      fs.writeFileSync(clicksFile, JSON.stringify(clicks, null, 2));

      return {
        success: true,
        trackingCode,
        clickTime: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record conversion
   */
  recordConversion(trackingCode, conversionData) {
    try {
      const conversionsFile = path.join(affiliateLinksDir, 'conversions-log.json');
      let conversions = [];

      if (fs.existsSync(conversionsFile)) {
        const content = fs.readFileSync(conversionsFile, 'utf8');
        conversions = JSON.parse(content);
      }

      conversions.push({
        trackingCode,
        timestamp: new Date(),
        amount: conversionData.amount || 0,
        orderValue: conversionData.orderValue || 0,
        commission: conversionData.commission || 0,
        status: conversionData.status || 'pending',
        notes: conversionData.notes || '',
        metadata: conversionData.metadata || {}
      });

      fs.writeFileSync(conversionsFile, JSON.stringify(conversions, null, 2));

      return {
        success: true,
        trackingCode,
        conversionTime: new Date(),
        commission: conversionData.commission
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get link stats
   */
  getLinkStats(trackingCode) {
    try {
      const clicksFile = path.join(affiliateLinksDir, 'clicks-log.json');
      const conversionsFile = path.join(affiliateLinksDir, 'conversions-log.json');

      let clicks = [];
      let conversions = [];

      if (fs.existsSync(clicksFile)) {
        clicks = JSON.parse(fs.readFileSync(clicksFile, 'utf8'));
      }

      if (fs.existsSync(conversionsFile)) {
        conversions = JSON.parse(fs.readFileSync(conversionsFile, 'utf8'));
      }

      const linkClicks = clicks.filter(c => c.trackingCode === trackingCode);
      const linkConversions = conversions.filter(c => c.trackingCode === trackingCode);

      const totalRevenue = linkConversions.reduce((sum, c) => sum + (c.commission || 0), 0);
      const clickToConversionRate = linkClicks.length > 0 
        ? (linkConversions.length / linkClicks.length) * 100 
        : 0;

      return {
        trackingCode,
        totalClicks: linkClicks.length,
        totalConversions: linkConversions.length,
        clickToConversionRate: clickToConversionRate.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        averageOrderValue: linkConversions.length > 0
          ? (linkConversions.reduce((sum, c) => sum + (c.orderValue || 0), 0) / linkConversions.length).toFixed(2)
          : '0.00',
        lastClicked: linkClicks.length > 0 ? linkClicks[linkClicks.length - 1].timestamp : null,
        lastConverted: linkConversions.length > 0 ? linkConversions[linkConversions.length - 1].timestamp : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get video affiliate stats
   */
  getVideoAffiliateStats(videoId) {
    try {
      const linksFile = path.join(affiliateLinksDir, 'tracking-links.json');
      const clicksFile = path.join(affiliateLinksDir, 'clicks-log.json');
      const conversionsFile = path.join(affiliateLinksDir, 'conversions-log.json');

      let allLinks = [];
      let allClicks = [];
      let allConversions = [];

      if (fs.existsSync(linksFile)) {
        allLinks = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
      }

      if (fs.existsSync(clicksFile)) {
        allClicks = JSON.parse(fs.readFileSync(clicksFile, 'utf8'));
      }

      if (fs.existsSync(conversionsFile)) {
        allConversions = JSON.parse(fs.readFileSync(conversionsFile, 'utf8'));
      }

      // Get all links for this video
      const videoLinks = allLinks.filter(l => l.videoId === videoId);
      const linkCodes = videoLinks.map(l => l.trackingCode);

      // Get clicks and conversions for these links
      const videoClicks = allClicks.filter(c => linkCodes.includes(c.trackingCode));
      const videoConversions = allConversions.filter(c => linkCodes.includes(c.trackingCode));

      const totalRevenue = videoConversions.reduce((sum, c) => sum + (c.commission || 0), 0);
      const clickToConversionRate = videoClicks.length > 0
        ? (videoConversions.length / videoClicks.length) * 100
        : 0;

      // Group by affiliate program
      const byProgram = {};
      videoLinks.forEach(link => {
        if (!byProgram[link.affiliateProgram]) {
          byProgram[link.affiliateProgram] = {
            program: link.affiliateProgram,
            links: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0
          };
        }
        byProgram[link.affiliateProgram].links++;
      });

      videoClicks.forEach(click => {
        const link = videoLinks.find(l => l.trackingCode === click.trackingCode);
        if (link && byProgram[link.affiliateProgram]) {
          byProgram[link.affiliateProgram].clicks++;
        }
      });

      videoConversions.forEach(conv => {
        const link = videoLinks.find(l => l.trackingCode === conv.trackingCode);
        if (link && byProgram[link.affiliateProgram]) {
          byProgram[link.affiliateProgram].conversions++;
          byProgram[link.affiliateProgram].revenue += conv.commission || 0;
        }
      });

      return {
        videoId,
        totalLinks: videoLinks.length,
        totalClicks: videoClicks.length,
        totalConversions: videoConversions.length,
        clickToConversionRate: clickToConversionRate.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        byProgram: Object.values(byProgram),
        links: videoLinks.map(l => ({
          trackingCode: l.trackingCode,
          productName: l.productName,
          affiliateProgram: l.affiliateProgram,
          createdAt: l.createdAt,
          stats: this.getLinkStats(l.trackingCode)
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get affiliate program recommendations
   */
  getAffiliateRecommendations(productCategory) {
    const recommendations = {
      'fashion': [
        { program: 'amazon', reason: 'High volume, 5-7% commission', priority: 'high' },
        { program: 'shareasale', reason: 'Fashion retailers 10-15% commission', priority: 'high' },
        { program: 'impact', reason: 'Premium fashion brands', priority: 'medium' }
      ],
      'electronics': [
        { program: 'amazon', reason: 'Best for electronics, 1-5% commission', priority: 'high' },
        { program: 'cj', reason: 'Tech retailers, 2-10% commission', priority: 'high' },
        { program: 'impact', reason: 'High-end electronics', priority: 'medium' }
      ],
      'home': [
        { program: 'amazon', reason: 'Largest selection, 3-5% commission', priority: 'high' },
        { program: 'shareasale', reason: 'Home & garden specialists', priority: 'high' },
        { program: 'cj', reason: 'Home improvement retailers', priority: 'medium' }
      ],
      'general': [
        { program: 'amazon', reason: 'Universal, 1-7% commission', priority: 'high' },
        { program: 'custom', reason: 'Add your own affiliate links', priority: 'medium' }
      ]
    };

    return recommendations[productCategory?.toLowerCase()] || recommendations['general'];
  }

  /**
   * Generate unique links for batch
   */
  generateBatchLinks(batchData) {
    try {
      const {
        batchId,
        videos,
        affiliateProgram = 'amazon',
        baseLinks = {},
        metadata = {}
      } = batchData;

      const generatedLinks = videos.map(video => {
        const baseLink = baseLinks[video.productName] || baseLinks['default'] || '';

        return {
          videoId: video.videoId,
          productName: video.productName,
          ...this.generateTrackingLink({
            baseLink,
            videoId: video.videoId,
            productName: video.productName,
            affiliateProgram,
            campaignId: batchId,
            metadata: {
              ...metadata,
              batchId,
              productCategory: video.category
            }
          })
        };
      });

      return {
        success: true,
        batchId,
        totalLinks: generatedLinks.length,
        affiliateProgram,
        links: generatedLinks
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get batch affiliate performance
   */
  getBatchAffiliatePerformance(batchId) {
    try {
      const linksFile = path.join(affiliateLinksDir, 'tracking-links.json');
      const clicksFile = path.join(affiliateLinksDir, 'clicks-log.json');
      const conversionsFile = path.join(affiliateLinksDir, 'conversions-log.json');

      let allLinks = [];
      let allClicks = [];
      let allConversions = [];

      if (fs.existsSync(linksFile)) {
        allLinks = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
      }

      if (fs.existsSync(clicksFile)) {
        allClicks = JSON.parse(fs.readFileSync(clicksFile, 'utf8'));
      }

      if (fs.existsSync(conversionsFile)) {
        allConversions = JSON.parse(fs.readFileSync(conversionsFile, 'utf8'));
      }

      // Get all links for this batch
      const batchLinks = allLinks.filter(l => l.metadata?.batchId === batchId);
      const linkCodes = batchLinks.map(l => l.trackingCode);

      // Get clicks and conversions
      const batchClicks = allClicks.filter(c => linkCodes.includes(c.trackingCode));
      const batchConversions = allConversions.filter(c => linkCodes.includes(c.trackingCode));

      const totalRevenue = batchConversions.reduce((sum, c) => sum + (c.commission || 0), 0);
      const topPerformers = batchLinks.sort((a, b) => {
        const aConversions = batchConversions.filter(c => c.trackingCode === a.trackingCode).length;
        const bConversions = batchConversions.filter(c => c.trackingCode === b.trackingCode).length;
        return bConversions - aConversions;
      }).slice(0, 5);

      return {
        batchId,
        summary: {
          totalLinks: batchLinks.length,
          totalClicks: batchClicks.length,
          totalConversions: batchConversions.length,
          totalRevenue: totalRevenue.toFixed(2),
          clickToConversionRate: batchClicks.length > 0 
            ? ((batchConversions.length / batchClicks.length) * 100).toFixed(2)
            : '0.00'
        },
        topPerformers: topPerformers.map(link => ({
          productName: link.productName,
          trackingCode: link.trackingCode,
          clicks: batchClicks.filter(c => c.trackingCode === link.trackingCode).length,
          conversions: batchConversions.filter(c => c.trackingCode === link.trackingCode).length,
          revenue: batchConversions
            .filter(c => c.trackingCode === link.trackingCode)
            .reduce((sum, c) => sum + (c.commission || 0), 0)
            .toFixed(2)
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export affiliate performance data
   */
  exportPerformanceData(filters = {}) {
    try {
      const clicksFile = path.join(affiliateLinksDir, 'clicks-log.json');
      const conversionsFile = path.join(affiliateLinksDir, 'conversions-log.json');

      let allClicks = [];
      let allConversions = [];

      if (fs.existsSync(clicksFile)) {
        allClicks = JSON.parse(fs.readFileSync(clicksFile, 'utf8'));
      }

      if (fs.existsSync(conversionsFile)) {
        allConversions = JSON.parse(fs.readFileSync(conversionsFile, 'utf8'));
      }

      // Filter by date range if provided
      if (filters.startDate || filters.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
        const end = filters.endDate ? new Date(filters.endDate) : new Date();

        allClicks = allClicks.filter(c => new Date(c.timestamp) >= start && new Date(c.timestamp) <= end);
        allConversions = allConversions.filter(c => new Date(c.timestamp) >= start && new Date(c.timestamp) <= end);
      }

      return {
        success: true,
        exportDate: new Date(),
        filters,
        clicks: allClicks,
        conversions: allConversions,
        summary: {
          totalClicks: allClicks.length,
          totalConversions: allConversions.length,
          totalRevenue: allConversions.reduce((sum, c) => sum + (c.commission || 0), 0).toFixed(2)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AffiliateLinkService();
