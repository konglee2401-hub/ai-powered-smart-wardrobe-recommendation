import MonitoringStats from '../models/MonitoringStats.js';
import { handleError } from '../middleware/errorHandler.js';

// Get current monitoring stats
export const getCurrentStats = async (req, res) => {
  try {
    let stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    
    if (!stats) {
      stats = new MonitoringStats({
        userId: req.user.id,
        period: 'daily',
        date: new Date()
      });
      await stats.save();
    }
    
    res.json({ success: true, stats });
  } catch (err) {
    handleError(res, err);
  }
};

// Get stats for a specific period
export const getStatsByPeriod = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    
    const stats = await MonitoringStats.find({
      userId: req.user.id,
      period
    })
      .sort({ date: -1 })
      .limit(limit);
    
    res.json({ 
      success: true, 
      period,
      count: stats.length,
      stats
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get video generation statistics
export const getVideoStats = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    res.json({
      success: true,
      videoGeneration: {
        totalGenerated: stats.videoGeneration.totalGenerated,
        successful: stats.videoGeneration.successful,
        failed: stats.videoGeneration.failed,
        successRate: stats.videoGeneration.successful / (stats.videoGeneration.successful + stats.videoGeneration.failed) * 100,
        averageGenerationTime: stats.videoGeneration.averageGenerationTime,
        lastGeneratedAt: stats.videoGeneration.lastGeneratedAt,
        errors: stats.videoGeneration.errors || []
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get distribution statistics
export const getDistributionStats = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    res.json({
      success: true,
      distribution: {
        totalDistributed: stats.distribution.totalDistributed,
        successful: stats.distribution.successful,
        failed: stats.distribution.failed,
        successRate: stats.distribution.successful / (stats.distribution.successful + stats.distribution.failed) * 100,
        byPlatform: stats.distribution.byPlatform
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get engagement statistics
export const getEngagementStats = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    res.json({
      success: true,
      engagement: {
        totalViews: stats.engagement.totalViews,
        totalLikes: stats.engagement.totalLikes,
        totalComments: stats.engagement.totalComments,
        totalShares: stats.engagement.totalShares,
        totalSaves: stats.engagement.totalSaves,
        averageEngagementRate: stats.engagement.averageEngagementRate,
        topPerformingPost: stats.engagement.topPerformingPost,
        engagementTrend: stats.engagement.engagementTrend
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get account health statistics
export const getAccountHealth = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    res.json({
      success: true,
      accountHealth: {
        activeAccounts: stats.accountHealth.activeAccounts,
        successfulAccounts: stats.accountHealth.successfulAccounts,
        problemAccounts: stats.accountHealth.problemAccounts,
        successRate: stats.accountHealth.successRate,
        problemList: stats.accountHealth.problemAccounts
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get system health statistics
export const getSystemHealth = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    res.json({
      success: true,
      systemHealth: {
        uptime: stats.systemHealth.uptime,
        errorRate: stats.systemHealth.errorRate,
        apiQuotaUsage: stats.systemHealth.apiQuotaUsage,
        storageUsage: stats.systemHealth.storageUsage,
        lastHealthCheck: stats.systemHealth.lastHealthCheck,
        incidents: stats.systemHealth.incidents || []
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get recent errors and alerts
export const getErrorsAndAlerts = async (req, res) => {
  try {
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    const recentErrors = stats.recentErrors.slice(-20).reverse();
    const recentAlerts = stats.alerts.slice(-20).reverse();
    
    res.json({
      success: true,
      recentErrors,
      recentAlerts,
      errorSummary: {
        critical: stats.recentErrors.filter(e => e.severity === 'critical').length,
        error: stats.recentErrors.filter(e => e.severity === 'error').length,
        warning: stats.recentErrors.filter(e => e.severity === 'warning').length,
        info: stats.recentErrors.filter(e => e.severity === 'info').length
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Add an error
export const addError = async (req, res) => {
  try {
    const { message, severity = 'error', source, errorCode } = req.body;
    
    let stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    
    if (!stats) {
      stats = new MonitoringStats({
        userId: req.user.id,
        period: 'daily',
        date: new Date()
      });
    }
    
    stats.addError(message, severity, source, errorCode);
    await stats.save();
    
    res.json({ 
      success: true, 
      message: 'Error logged',
      stats 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Add an alert
export const addAlert = async (req, res) => {
  try {
    const { message, alertType = 'info', severity = 'medium', details } = req.body;
    
    let stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    
    if (!stats) {
      stats = new MonitoringStats({
        userId: req.user.id,
        period: 'daily',
        date: new Date()
      });
    }
    
    stats.addAlert(message, alertType, severity, details);
    await stats.save();
    
    res.json({ 
      success: true, 
      message: 'Alert created',
      stats 
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Get summary dashboard
export const getDashboard = async (req, res) => {
  try {
    let stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    
    if (!stats) {
      stats = new MonitoringStats({
        userId: req.user.id,
        period: 'daily',
        date: new Date()
      });
      await stats.save();
    }
    
    const rates = stats.calculateRates();
    
    res.json({
      success: true,
      dashboard: {
        date: stats.date,
        rates,
        videoGeneration: {
          totalGenerated: stats.videoGeneration.totalGenerated,
          successful: stats.videoGeneration.successful,
          successRate: rates.videoSuccessRate
        },
        distribution: {
          totalDistributed: stats.distribution.totalDistributed,
          successful: stats.distribution.successful,
          successRate: rates.distributionSuccessRate
        },
        engagement: {
          totalViews: stats.engagement.totalViews,
          totalLikes: stats.engagement.totalLikes,
          averageEngagementRate: stats.engagement.averageEngagementRate
        },
        accountHealth: {
          activeAccounts: stats.accountHealth.activeAccounts,
          successRate: stats.accountHealth.successRate
        },
        systemHealth: {
          uptime: stats.systemHealth.uptime,
          errorRate: stats.systemHealth.errorRate
        },
        recentIssues: stats.recentErrors.slice(-5),
        recentAlerts: stats.alerts.slice(-5)
      }
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Acknowledge an alert
export const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.body;
    
    const stats = await MonitoringStats.findOne({ userId: req.user.id, period: 'daily' });
    if (!stats) return res.status(404).json({ success: false, message: 'Stats not found' });
    
    const alert = stats.alerts.find(a => a._id.toString() === alertId);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    
    await stats.save();
    
    res.json({ 
      success: true, 
      message: 'Alert acknowledged',
      stats
    });
  } catch (err) {
    handleError(res, err);
  }
};

// Clear old records
export const clearOldRecords = async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await MonitoringStats.deleteMany({
      userId: req.user.id,
      date: { $lt: cutoffDate }
    });
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} old records`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    handleError(res, err);
  }
};
