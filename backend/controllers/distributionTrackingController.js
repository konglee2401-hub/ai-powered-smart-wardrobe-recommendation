import DistributionTracking from '../models/DistributionTracking.js';
import { handleError } from '../middleware/errorHandler.js';

// Get all distribution tracking records for a user
export const getAllDistributions = async (req, res) => {
  try {
    const { limit = 50, page = 1, status, videoGenId } = req.query;
    
    let filters = { userId: req.user.id };
    if (status) filters.overallStatus = status;
    if (videoGenId) filters.videoGenerationId = videoGenId;
    
    const distributions = await DistributionTracking.find(filters)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await DistributionTracking.countDocuments(filters);
    
    res.json({ 
      success: true, 
      distributions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get a specific distribution tracking record
export const getDistribution = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    res.json({ success: true, distribution });
  } catch (err) {
    handleError(res, err);
  }
};

// Create a new distribution tracking record
export const createDistribution = async (req, res) => {
  try {
    const distribution = new DistributionTracking({
      userId: req.user.id,
      videoGenerationId: req.body.videoGenerationId,
      videoTitle: req.body.videoTitle,
      distributions: req.body.distributions || []
    });
    
    const savedDistribution = await distribution.save();
    res.status(201).json({ 
      success: true, 
      message: 'Distribution tracking created',
      distribution: savedDistribution 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Update distribution status for a specific platform
export const updatePlatformStatus = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const { accountId, status, metrics, error } = req.body;
    
    // Find and update the distribution entry
    const distIndex = distribution.distributions.findIndex(
      d => d.socialMediaAccountId.toString() === accountId
    );
    
    if (distIndex === -1) {
      // Create new platform distribution
      distribution.distributions.push({
        socialMediaAccountId: accountId,
        status,
        metrics: metrics || {},
        error
      });
    } else {
      // Update existing platform distribution
      distribution.distributions[distIndex].status = status;
      distribution.distributions[distIndex].metrics = metrics || {};
      distribution.distributions[distIndex].error = error;
      distribution.distributions[distIndex].updatedAt = new Date();
    }
    
    // Update overall status
    distribution.overallStatus = distribution.getDistributionStatus();
    
    await distribution.save();
    
    res.json({ 
      success: true, 
      message: 'Platform status updated',
      distribution
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get distribution summary
export const getSummary = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const summary = distribution.calculateSummary();
    
    res.json({ 
      success: true, 
      videoTitle: distribution.videoTitle,
      createdAt: distribution.createdAt,
      overallStatus: distribution.overallStatus,
      summary,
      platformBreakdown: distribution.distributions.map(d => ({
        accountId: d.socialMediaAccountId,
        status: d.status,
        views: d.metrics.views || 0,
        engagement: d.metrics.engagement || 0,
        error: d.error
      }))
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get distribution status
export const getStatus = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const status = distribution.getDistributionStatus();
    
    res.json({ 
      success: true, 
      status,
      videoTitle: distribution.videoTitle,
      overallStatus: distribution.overallStatus,
      platformCount: distribution.distributions.length,
      successCount: distribution.distributions.filter(d => d.status === 'success').length,
      failedCount: distribution.distributions.filter(d => d.status === 'failed').length,
      pendingCount: distribution.distributions.filter(d => d.status === 'pending').length
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Retry failed distributions
export const retryFailed = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    let retryCount = 0;
    
    distribution.distributions.forEach(dist => {
      if (dist.status === 'failed' && dist.retryCount < dist.maxRetries) {
        dist.status = 'pending';
        dist.retryCount += 1;
        retryCount++;
      }
    });
    
    distribution.overallStatus = distribution.getDistributionStatus();
    await distribution.save();
    
    res.json({ 
      success: true, 
      message: `${retryCount} platform(s) queued for retry`,
      distribution
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get metrics for a distribution
export const getMetrics = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const summary = distribution.calculateSummary();
    
    res.json({ 
      success: true, 
      videoTitle: distribution.videoTitle,
      distributedAt: distribution.createdAt,
      metrics: {
        totalViews: summary.totalViews,
        totalLikes: summary.totalLikes,
        totalComments: summary.totalComments,
        totalShares: summary.totalShares,
        totalSaves: summary.totalSaves,
        averageEngagementRate: summary.averageEngagementRate,
        platformMetrics: distribution.distributions.map(d => ({
          platform: d.socialMediaAccountId,
          views: d.metrics.views || 0,
          likes: d.metrics.likes || 0,
          comments: d.metrics.comments || 0,
          shares: d.metrics.shares || 0,
          saves: d.metrics.saves || 0,
          engagement: d.metrics.engagement || 0,
          status: d.status
        }))
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Update metrics for a distribution
export const updateMetrics = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const { accountId, metrics } = req.body;
    
    const distIndex = distribution.distributions.findIndex(
      d => d.socialMediaAccountId.toString() === accountId
    );
    
    if (distIndex === -1) {
      return res.status(404).json({ success: false, message: 'Account distribution not found' });
    }
    
    distribution.distributions[distIndex].metrics = {
      ...distribution.distributions[distIndex].metrics,
      ...metrics,
      lastUpdated: new Date()
    };
    
    await distribution.save();
    
    res.json({ 
      success: true, 
      message: 'Metrics updated',
      distribution
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Check if monitoring is due
export const isMonitoringDue = async (req, res) => {
  try {
    const distribution = await DistributionTracking.findById(req.params.id);
    if (!distribution) return res.status(404).json({ success: false, message: 'Distribution not found' });
    
    const isDue = distribution.isDistributionDue();
    const hoursElapsed = (Date.now() - distribution.lastMetricsUpdate) / (1000 * 60 * 60);
    
    res.json({ 
      success: true, 
      isDue,
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      checkInterval: distribution.metricsCheckInterval,
      lastUpdate: distribution.lastMetricsUpdate
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get recent distributions
export const getRecent = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    
    const distributions = await DistributionTracking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({ 
      success: true, 
      distributions: distributions.map(d => ({
        id: d._id,
        videoTitle: d.videoTitle,
        createdAt: d.createdAt,
        status: d.overallStatus,
        platformCount: d.distributions.length,
        summary: d.calculateSummary()
      }))
    });
  } catch (err) {
    handleError(res, err);
  }
};
