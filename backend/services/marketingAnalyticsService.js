import mongoose from 'mongoose';
import SessionLog from '../models/SessionLog.js';
import GenerationFlow from '../models/GenerationFlow.js';
import GeneratedVideo from '../models/GeneratedVideo.js';
import DistributionTracking from '../models/DistributionTracking.js';
import SocialMediaAccount from '../models/SocialMediaAccount.js';
import TrendVideo from '../models/TrendVideo.js';

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getRangeConfig(range = '30d') {
  const now = new Date();
  const days = Number.parseInt(String(range).replace(/\D/g, ''), 10) || 30;
  const from = startOfDay(new Date(now.getTime() - ((days - 1) * 24 * 60 * 60 * 1000)));
  const to = endOfDay(now);
  const previousFrom = startOfDay(new Date(from.getTime() - (days * 24 * 60 * 60 * 1000)));
  const previousTo = endOfDay(new Date(from.getTime() - (24 * 60 * 60 * 1000)));

  return {
    range,
    days,
    now,
    from,
    to,
    previousFrom,
    previousTo,
  };
}

function pctChange(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function safeNumber(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

function buildDayBuckets(from, days, rows = [], key = 'value') {
  const map = new Map();
  rows.forEach((row) => {
    map.set(row._id, row[key] || 0);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from.getTime() + (index * 24 * 60 * 60 * 1000));
    const bucket = date.toISOString().slice(0, 10);
    return {
      date: bucket,
      value: map.get(bucket) || 0,
    };
  });
}

function toObjectId(value) {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (_) {
    return null;
  }
}

function summarizeTopItems(items = [], limit = 5, mapper = (item) => item) {
  return items
    .sort((a, b) => (b.value || b.count || 0) - (a.value || a.count || 0))
    .slice(0, limit)
    .map(mapper);
}

class MarketingAnalyticsService {
  async getDashboard({ userId, range = '30d' } = {}) {
    const scope = getRangeConfig(range);
    const userObjectId = toObjectId(userId);

    const [
      sessionMetrics,
      previousSessionCount,
      generationMetrics,
      previousGenerationCount,
      videoMetrics,
      previousVideoCount,
      distributionMetrics,
      previousDistributionViews,
      socialMetrics,
      trendMetrics,
    ] = await Promise.all([
      this.getSessionMetrics(scope),
      SessionLog.countDocuments({ createdAt: { $gte: scope.previousFrom, $lte: scope.previousTo } }),
      this.getGenerationMetrics(scope, userObjectId),
      GenerationFlow.countDocuments({
        ...(userObjectId ? { userId: userObjectId } : {}),
        createdAt: { $gte: scope.previousFrom, $lte: scope.previousTo },
      }),
      this.getVideoMetrics(scope, userId),
      GeneratedVideo.countDocuments({
        ...(userId ? { userId: String(userId) } : {}),
        createdAt: { $gte: scope.previousFrom, $lte: scope.previousTo },
        isDeleted: { $ne: true },
      }),
      this.getDistributionMetrics(scope, userObjectId),
      DistributionTracking.aggregate([
        {
          $match: {
            ...(userObjectId ? { userId: userObjectId } : {}),
            createdAt: { $gte: scope.previousFrom, $lte: scope.previousTo },
          },
        },
        { $group: { _id: null, totalViews: { $sum: { $ifNull: ['$summary.totalViews', 0] } } } },
      ]),
      this.getSocialAccountMetrics(userObjectId),
      this.getTrendMetrics(scope),
    ]);

    const overviewCards = [
      {
        id: 'sessions',
        label: 'Workflow sessions',
        value: sessionMetrics.totalSessions,
        unit: 'runs',
        tone: 'amber',
        change: pctChange(sessionMetrics.totalSessions, previousSessionCount),
        note: `${sessionMetrics.completedSessions} completed, ${sessionMetrics.failedSessions} failed`,
      },
      {
        id: 'generationFlows',
        label: 'Generation flows',
        value: generationMetrics.totalFlows,
        unit: 'flows',
        tone: 'sky',
        change: pctChange(generationMetrics.totalFlows, previousGenerationCount),
        note: `${generationMetrics.videoCompleted} video-complete flows`,
      },
      {
        id: 'publishedReach',
        label: 'Published reach',
        value: distributionMetrics.totalViews,
        unit: 'views',
        tone: 'emerald',
        change: pctChange(distributionMetrics.totalViews, previousDistributionViews?.[0]?.totalViews || 0),
        note: `${distributionMetrics.totalPosts} platform posts tracked`,
      },
      {
        id: 'videos',
        label: 'Generated videos',
        value: videoMetrics.totalVideos,
        unit: 'videos',
        tone: 'rose',
        change: pctChange(videoMetrics.totalVideos, previousVideoCount),
        note: `${videoMetrics.completedVideos} completed, avg ${videoMetrics.avgGenerationTime}s`,
      },
    ];

    return {
      range: {
        key: scope.range,
        days: scope.days,
        from: scope.from,
        to: scope.to,
      },
      system: {
        overviewCards,
        health: {
          successRate: sessionMetrics.successRate,
          avgWorkflowDurationSec: sessionMetrics.avgDurationSec,
          avgVideoGenerationSec: videoMetrics.avgGenerationTime,
          totalTrackedCost: generationMetrics.totalCost + videoMetrics.totalCost,
          activeProcessingSessions: sessionMetrics.inProgressSessions,
          queuePressure: trendMetrics.queuePressure,
        },
        pipeline: {
          stageDistribution: sessionMetrics.stageDistribution,
          recentTrend: sessionMetrics.dailySessions,
          flowBreakdown: generationMetrics.useCaseBreakdown,
          providerLeaderboard: videoMetrics.providerLeaderboard,
          assetReadiness: trendMetrics.assetReadiness,
        },
        insights: [
          `Top workflow type: ${sessionMetrics.topFlowType || 'n/a'}`,
          `Best video provider: ${videoMetrics.topProvider || 'n/a'}`,
          `Most common generation goal: ${generationMetrics.topContentGoal || 'n/a'}`,
        ],
      },
      social: {
        summaryCards: [
          {
            id: 'accounts',
            label: 'Connected accounts',
            value: socialMetrics.connectedAccounts,
            unit: 'accounts',
            tone: 'sky',
            note: `${socialMetrics.activeAccounts} active, ${socialMetrics.errorAccounts} with issues`,
          },
          {
            id: 'uploads',
            label: 'Uploads tracked',
            value: socialMetrics.totalUploads,
            unit: 'uploads',
            tone: 'amber',
            note: `${distributionMetrics.totalPosts} post records with live metrics`,
          },
          {
            id: 'engagement',
            label: 'Avg engagement rate',
            value: distributionMetrics.avgEngagementRate,
            unit: '%',
            tone: 'emerald',
            note: `${distributionMetrics.totalLikes} likes, ${distributionMetrics.totalComments} comments`,
          },
          {
            id: 'completion',
            label: 'Avg completion rate',
            value: distributionMetrics.avgCompletionRate,
            unit: '%',
            tone: 'rose',
            note: `${distributionMetrics.totalShares} shares, ${distributionMetrics.totalSaves} saves`,
          },
        ],
        platformPerformance: distributionMetrics.platformPerformance,
        bestPosts: distributionMetrics.bestPosts,
        accountHealth: socialMetrics.accountHealth,
        opportunityFeed: trendMetrics.opportunityFeed,
        sourceRadar: trendMetrics.sourceRadar,
      },
    };
  }

  async getSessionMetrics(scope) {
    const [summary] = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: scope.from, $lte: scope.to } } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          inProgressSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] },
          },
          avgDurationMs: { $avg: { $ifNull: ['$metrics.totalDuration', 0] } },
        },
      },
    ]);

    const flowTypes = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: scope.from, $lte: scope.to } } },
      { $group: { _id: '$flowType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const stageDistribution = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: scope.from, $lte: scope.to } } },
      { $unwind: { path: '$metrics.stages', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$metrics.stages.stage',
          avgDuration: { $avg: { $ifNull: ['$metrics.stages.duration', 0] } },
          runs: { $sum: 1 },
        },
      },
      { $sort: { runs: -1 } },
      { $limit: 6 },
    ]);

    const dailySessions = await SessionLog.aggregate([
      { $match: { createdAt: { $gte: scope.from, $lte: scope.to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalSessions = summary?.totalSessions || 0;
    const completedSessions = summary?.completedSessions || 0;

    return {
      totalSessions,
      completedSessions,
      failedSessions: summary?.failedSessions || 0,
      inProgressSessions: summary?.inProgressSessions || 0,
      successRate: totalSessions ? safeNumber((completedSessions / totalSessions) * 100) : 0,
      avgDurationSec: safeNumber((summary?.avgDurationMs || 0) / 1000),
      topFlowType: flowTypes[0]?._id || null,
      stageDistribution: stageDistribution.map((item) => ({
        stage: item._id || 'unknown',
        runs: item.runs,
        avgDurationSec: safeNumber((item.avgDuration || 0) / 1000),
      })),
      dailySessions: buildDayBuckets(scope.from, scope.days, dailySessions),
    };
  }

  async getGenerationMetrics(scope, userObjectId) {
    const [summary] = await GenerationFlow.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
        },
      },
      {
        $group: {
          _id: null,
          totalFlows: { $sum: 1 },
          videoCompleted: {
            $sum: { $cond: [{ $eq: ['$overallStatus', 'completed'] }, 1, 0] },
          },
          totalCost: { $sum: { $ifNull: ['$metadata.totalCost', 0] } },
        },
      },
    ]);

    const useCaseBreakdown = await GenerationFlow.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
        },
      },
      { $group: { _id: '$useCase', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const contentGoals = await GenerationFlow.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
        },
      },
      { $group: { _id: '$contentGoal', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    return {
      totalFlows: summary?.totalFlows || 0,
      videoCompleted: summary?.videoCompleted || 0,
      totalCost: safeNumber(summary?.totalCost || 0, 2),
      topContentGoal: contentGoals[0]?._id || null,
      useCaseBreakdown: useCaseBreakdown.map((item) => ({
        label: item._id || 'unknown',
        value: item.count,
      })),
    };
  }

  async getVideoMetrics(scope, userId) {
    const [summary] = await GeneratedVideo.aggregate([
      {
        $match: {
          ...(userId ? { userId: String(userId) } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          completedVideos: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          avgGenerationTime: { $avg: { $ifNull: ['$generationTime', 0] } },
          totalCost: { $sum: { $ifNull: ['$cost', 0] } },
        },
      },
    ]);

    const providers = await GeneratedVideo.aggregate([
      {
        $match: {
          ...(userId ? { userId: String(userId) } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$videoProvider',
          count: { $sum: 1 },
          avgTime: { $avg: { $ifNull: ['$generationTime', 0] } },
          avgRating: { $avg: { $ifNull: ['$rating', 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    return {
      totalVideos: summary?.totalVideos || 0,
      completedVideos: summary?.completedVideos || 0,
      avgGenerationTime: safeNumber(summary?.avgGenerationTime || 0),
      totalCost: safeNumber(summary?.totalCost || 0, 2),
      topProvider: providers[0]?._id || null,
      providerLeaderboard: providers.map((item) => ({
        provider: item._id || 'unknown',
        videos: item.count,
        avgGenerationSec: safeNumber(item.avgTime || 0),
        avgRating: safeNumber(item.avgRating || 0, 2),
      })),
    };
  }

  async getDistributionMetrics(scope, userObjectId) {
    const aggregate = await DistributionTracking.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
        },
      },
      { $unwind: { path: '$distributions', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$distributions.platform',
          posts: { $sum: 1 },
          successPosts: {
            $sum: { $cond: [{ $eq: ['$distributions.status', 'success'] }, 1, 0] },
          },
          views: { $sum: { $ifNull: ['$distributions.metrics.views', 0] } },
          likes: { $sum: { $ifNull: ['$distributions.metrics.likes', 0] } },
          comments: { $sum: { $ifNull: ['$distributions.metrics.comments', 0] } },
          shares: { $sum: { $ifNull: ['$distributions.metrics.shares', 0] } },
          saves: { $sum: { $ifNull: ['$distributions.metrics.saves', 0] } },
          avgEngagementRate: { $avg: { $ifNull: ['$distributions.metrics.engagementRate', 0] } },
          avgCompletionRate: { $avg: { $ifNull: ['$distributions.metrics.completionRate', 0] } },
        },
      },
      { $sort: { views: -1, posts: -1 } },
    ]);

    const bestPosts = await DistributionTracking.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
          createdAt: { $gte: scope.from, $lte: scope.to },
        },
      },
      { $unwind: { path: '$distributions', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          platform: '$distributions.platform',
          postUrl: '$distributions.postUrl',
          accountHandle: '$distributions.accountHandle',
          title: {
            $ifNull: ['$distributions.title', '$videoTitle'],
          },
          views: { $ifNull: ['$distributions.metrics.views', 0] },
          engagementRate: { $ifNull: ['$distributions.metrics.engagementRate', 0] },
          completionRate: { $ifNull: ['$distributions.metrics.completionRate', 0] },
          likes: { $ifNull: ['$distributions.metrics.likes', 0] },
          shares: { $ifNull: ['$distributions.metrics.shares', 0] },
        },
      },
      { $sort: { views: -1, engagementRate: -1 } },
      { $limit: 6 },
    ]);

    const totals = aggregate.reduce((acc, item) => {
      acc.totalPosts += item.posts || 0;
      acc.totalViews += item.views || 0;
      acc.totalLikes += item.likes || 0;
      acc.totalComments += item.comments || 0;
      acc.totalShares += item.shares || 0;
      acc.totalSaves += item.saves || 0;
      acc.engagementAccumulator += (item.avgEngagementRate || 0) * (item.posts || 0);
      acc.completionAccumulator += (item.avgCompletionRate || 0) * (item.posts || 0);
      return acc;
    }, {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalSaves: 0,
      engagementAccumulator: 0,
      completionAccumulator: 0,
    });

    return {
      totalPosts: totals.totalPosts,
      totalViews: totals.totalViews,
      totalLikes: totals.totalLikes,
      totalComments: totals.totalComments,
      totalShares: totals.totalShares,
      totalSaves: totals.totalSaves,
      avgEngagementRate: totals.totalPosts ? safeNumber(totals.engagementAccumulator / totals.totalPosts) : 0,
      avgCompletionRate: totals.totalPosts ? safeNumber(totals.completionAccumulator / totals.totalPosts) : 0,
      platformPerformance: aggregate.map((item) => ({
        platform: item._id || 'unknown',
        posts: item.posts,
        successRate: item.posts ? safeNumber((item.successPosts / item.posts) * 100) : 0,
        views: item.views,
        engagementRate: safeNumber(item.avgEngagementRate || 0),
        completionRate: safeNumber(item.avgCompletionRate || 0),
        interactions: (item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.saves || 0),
      })),
      bestPosts: bestPosts.map((item) => ({
        platform: item.platform || 'unknown',
        title: item.title || 'Untitled post',
        accountHandle: item.accountHandle || '',
        postUrl: item.postUrl || '',
        views: item.views || 0,
        likes: item.likes || 0,
        shares: item.shares || 0,
        engagementRate: safeNumber(item.engagementRate || 0),
        completionRate: safeNumber(item.completionRate || 0),
      })),
    };
  }

  async getSocialAccountMetrics(userObjectId) {
    const accounts = await SocialMediaAccount.aggregate([
      {
        $match: {
          ...(userObjectId ? { userId: userObjectId } : {}),
        },
      },
      {
        $group: {
          _id: '$platform',
          totalAccounts: { $sum: 1 },
          activeAccounts: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
          connectedAccounts: {
            $sum: { $cond: [{ $eq: ['$connectionStatus', 'connected'] }, 1, 0] },
          },
          errorAccounts: {
            $sum: { $cond: [{ $eq: ['$connectionStatus', 'error'] }, 1, 0] },
          },
          totalUploads: { $sum: { $ifNull: ['$totalUploads', 0] } },
          totalViews: { $sum: { $ifNull: ['$totalViews', 0] } },
          totalLikes: { $sum: { $ifNull: ['$totalLikes', 0] } },
          totalShares: { $sum: { $ifNull: ['$totalShares', 0] } },
          avgEngagementRate: { $avg: { $ifNull: ['$averageEngagementRate', 0] } },
        },
      },
    ]);

    const totals = accounts.reduce((acc, item) => {
      acc.connectedAccounts += item.connectedAccounts || 0;
      acc.activeAccounts += item.activeAccounts || 0;
      acc.errorAccounts += item.errorAccounts || 0;
      acc.totalUploads += item.totalUploads || 0;
      return acc;
    }, {
      connectedAccounts: 0,
      activeAccounts: 0,
      errorAccounts: 0,
      totalUploads: 0,
    });

    return {
      ...totals,
      accountHealth: accounts.map((item) => ({
        platform: item._id || 'unknown',
        connectedAccounts: item.connectedAccounts || 0,
        activeAccounts: item.activeAccounts || 0,
        errorAccounts: item.errorAccounts || 0,
        totalUploads: item.totalUploads || 0,
        avgEngagementRate: safeNumber(item.avgEngagementRate || 0),
        audienceSignal: item.totalViews || 0,
      })),
    };
  }

  async getTrendMetrics(scope) {
    const [assetReadinessRaw, sourceRadarRaw, topVideosRaw] = await Promise.all([
      TrendVideo.aggregate([
        { $match: { discoveredAt: { $gte: scope.from, $lte: scope.to } } },
        {
          $group: {
            _id: null,
            discovered: { $sum: 1 },
            downloaded: { $sum: { $cond: [{ $eq: ['$downloadStatus', 'done'] }, 1, 0] } },
            driveReady: { $sum: { $cond: [{ $eq: ['$driveSync.status', 'uploaded'] }, 1, 0] } },
            queueReady: {
              $sum: {
                $cond: [
                  { $in: ['$production.queueStatus', ['ready', 'completed']] },
                  1,
                  0,
                ],
              },
            },
            queued: { $sum: { $cond: [{ $eq: ['$production.queueStatus', 'queued'] }, 1, 0] } },
            processing: { $sum: { $cond: [{ $eq: ['$production.queueStatus', 'processing'] }, 1, 0] } },
          },
        },
      ]),
      TrendVideo.aggregate([
        { $match: { discoveredAt: { $gte: scope.from, $lte: scope.to } } },
        {
          $group: {
            _id: '$platform',
            videos: { $sum: 1 },
            totalViews: { $sum: { $ifNull: ['$views', 0] } },
            totalLikes: { $sum: { $ifNull: ['$likes', 0] } },
          },
        },
        { $sort: { totalViews: -1 } },
      ]),
      TrendVideo.aggregate([
        { $match: { discoveredAt: { $gte: scope.from, $lte: scope.to } } },
        {
          $project: {
            platform: 1,
            title: 1,
            source: 1,
            topic: 1,
            views: { $ifNull: ['$views', 0] },
            likes: { $ifNull: ['$likes', 0] },
            url: 1,
            publishingCount: { $ifNull: ['$publishing.totalPublished', 0] },
          },
        },
        { $sort: { views: -1, likes: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const assetReadiness = assetReadinessRaw[0] || {};
    const queuePressure = (assetReadiness.queued || 0) + (assetReadiness.processing || 0);

    return {
      queuePressure,
      assetReadiness: {
        discovered: assetReadiness.discovered || 0,
        downloaded: assetReadiness.downloaded || 0,
        driveReady: assetReadiness.driveReady || 0,
        queueReady: assetReadiness.queueReady || 0,
      },
      sourceRadar: sourceRadarRaw.map((item) => ({
        platform: item._id || 'unknown',
        videos: item.videos || 0,
        totalViews: item.totalViews || 0,
        totalLikes: item.totalLikes || 0,
      })),
      opportunityFeed: topVideosRaw.map((item) => ({
        title: item.title || 'Untitled source video',
        platform: item.platform || 'unknown',
        source: item.source || 'n/a',
        topic: item.topic || 'general',
        views: item.views || 0,
        likes: item.likes || 0,
        publishingCount: item.publishingCount || 0,
        url: item.url || '',
      })),
    };
  }
}

export default new MarketingAnalyticsService();
