import express from 'express';
const router = express.Router();
import { protect } from '../middleware/auth.js';
import * as AIAnalyticsService from '../services/aiAnalyticsService.js';
import * as RecommendationEngine from '../services/recommendationEngine.js';
import * as ContentAnalysisService from '../services/contentAnalysisService.js';
import User from '../models/User.js';
import GenerationFlow from '../models/GenerationFlow.js';
import PromptTemplate from '../models/PromptOption.js';

// Apply authentication to all routes
router.use(protect);

// AI Insights endpoint
router.get('/ai-insights', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d' } = req.query;

    const insights = await AIAnalyticsService.analyzeUserBehavior(userId, range);
    res.json(insights);
  } catch (error) {
    console.error('AI Insights error:', error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

// Predictions endpoint
router.get('/predictions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d' } = req.query;

    const userData = await AIAnalyticsService.collectUserData(userId, range);
    const predictions = await AIAnalyticsService.generatePredictions(userData);

    res.json(predictions);
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Personalized recommendations
router.get('/recommendations/personalized', async (req, res) => {
  try {
    const userId = req.user.id;
    const { context } = req.query;

    const recommendations = await RecommendationEngine.getPersonalizedRecommendations(userId, context);
    res.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Smart suggestions
router.get('/suggestions/smart', async (req, res) => {
  try {
    const userId = req.user.id;
    const { context = 'general' } = req.query;

    const suggestions = await AIAnalyticsService.generateSmartSuggestions(userId, context);
    res.json(suggestions);
  } catch (error) {
    console.error('Smart suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Content analysis for a specific generation
router.get('/content/analyze/:generationId', async (req, res) => {
  try {
    const { generationId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const generation = await GenerationResult.findOne({
      _id: generationId,
      userId
    });

    if (!generation) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    const analysis = await ContentAnalysisService.analyzeGeneration(generationId);
    res.json(analysis);
  } catch (error) {
    console.error('Content analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze content' });
  }
});

// Batch content analysis
router.post('/content/analyze-batch', async (req, res) => {
  try {
    const { generationIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(generationIds) || generationIds.length === 0) {
      return res.status(400).json({ error: 'Invalid generation IDs' });
    }

    // Verify ownership of all generations
    const generations = await GenerationResult.find({
      _id: { $in: generationIds },
      userId
    });

    if (generations.length !== generationIds.length) {
      return res.status(404).json({ error: 'Some generations not found or not owned by user' });
    }

    const batchAnalysis = await ContentAnalysisService.analyzeBatch(generationIds);
    res.json(batchAnalysis);
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze content batch' });
  }
});

// User content analysis summary
router.get('/content/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d' } = req.query;

    const summary = await ContentAnalysisService.getUserContentAnalysis(userId, range);
    res.json(summary);
  } catch (error) {
    console.error('Content summary error:', error);
    res.status(500).json({ error: 'Failed to get content summary' });
  }
});

// Usage analytics
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d', metric = 'all' } = req.query;

    const dateFilter = AIAnalyticsService.getDateFilter(range);
    
    const generations = await GenerationResult.find({
      userId,
      createdAt: { $gte: dateFilter }
    }).limit(500);

    const projects = await Project.find({
      $or: [{ ownerId: userId }, { 'collaborators.userId': userId }],
      createdAt: { $gte: dateFilter }
    }).limit(100);

    const templates = await PromptTemplate.find({
      userId
    }).limit(50);

    let analytics = {};

    switch (metric) {
      case 'generations':
        analytics = {
          total: generations.length,
          trend: AIAnalyticsService.calculateTrend(
            generations.slice(-10).map(g => new Date(g.createdAt).getTime())
          ),
          byProvider: generations.reduce((acc, gen) => {
            acc[gen.provider || gen.modelId || 'unknown'] = (acc[gen.provider || gen.modelId || 'unknown'] || 0) + 1;
            return acc;
          }, {}),
          byCategory: generations.reduce((acc, gen) => {
            acc[gen.category || 'uncategorized'] = (acc[gen.category || 'uncategorized'] || 0) + 1;
            return acc;
          }, {}),
          successRate: AIAnalyticsService.getSuccessRate(generations),
          avgGenerationTime: AIAnalyticsService.getAverageGenerationTime(generations)
        };
        break;

      case 'cost':
        const costs = generations.map(g => g.cost || 0);
        analytics = {
          total: costs.reduce((sum, cost) => sum + cost, 0),
          average: costs.length > 0 ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length : 0,
          trend: AIAnalyticsService.calculateTrend(costs.slice(-10)),
          byProvider: generations.reduce((acc, gen) => {
            const provider = gen.provider || gen.modelId || 'unknown';
            acc[provider] = (acc[provider] || 0) + (gen.cost || 0);
            return acc;
          }, {})
        };
        break;

      case 'quality':
        analytics = await ContentAnalysisService.analyzeContentQuality(generations);
        break;

      default:
        const totalCost = generations.reduce((sum, gen) => sum + (gen.cost || 0), 0);
        
        analytics = {
          overview: {
            totalGenerations: generations.length,
            totalProjects: projects.length,
            totalTemplates: templates.length,
            totalCost: Math.round(totalCost * 1000) / 1000,
            avgQuality: 7, // Default since we don't store quality scores
            successRate: AIAnalyticsService.getSuccessRate(generations),
            avgGenerationTime: AIAnalyticsService.getAverageGenerationTime(generations)
          },
          trends: {
            generationTrend: AIAnalyticsService.calculateTrend(
              generations.slice(-10).map(g => new Date(g.createdAt).getTime())
            ),
            costTrend: AIAnalyticsService.calculateTrend(
              generations.slice(-10).map(g => g.cost || 0)
            )
          },
          topProviders: Object.entries(
            generations.reduce((acc, gen) => {
              const provider = gen.provider || gen.modelId || 'unknown';
              acc[provider] = (acc[provider] || 0) + 1;
              return acc;
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([provider, count]) => ({ provider, count }))
        };
    }

    res.json(analytics);
  } catch (error) {
    console.error('Usage analytics error:', error);
    res.status(500).json({ error: 'Failed to get usage analytics' });
  }
});

// Export analytics data
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d', format = 'json' } = req.query;

    const dateFilter = AIAnalyticsService.getDateFilter(range);

    const generations = await GenerationResult.find({
      userId,
      createdAt: { $gte: dateFilter }
    }).limit(500);

    const projects = await Project.find({
      $or: [{ ownerId: userId }, { 'collaborators.userId': userId }],
      createdAt: { $gte: dateFilter }
    }).limit(100);

    const exportData = {
      userId,
      timeRange: range,
      generatedAt: new Date(),
      summary: {
        totalGenerations: generations.length,
        totalProjects: projects.length,
        totalCost: generations.reduce((sum, gen) => sum + (gen.cost || 0), 0),
        dateRange: {
          from: generations.length > 0 ? generations[generations.length - 1].createdAt : null,
          to: generations.length > 0 ? generations[0].createdAt : null
        }
      },
      rawData: {
        generations: generations.map(g => ({
          id: g._id,
          prompt: g.prompt,
          provider: g.provider || g.modelId,
          cost: g.cost,
          generationTime: g.generationTime,
          success: g.success,
          createdAt: g.createdAt,
          category: g.category
        })),
        projects: projects.map(p => ({
          id: p._id,
          name: p.name,
          createdAt: p.createdAt
        }))
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData.rawData.generations);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics_export.csv"');
      res.send(csvData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const { range = '30d' } = req.query;

    const [
      insights,
      predictions,
      recommendations,
      usage
    ] = await Promise.all([
      AIAnalyticsService.analyzeUserBehavior(userId, range),
      AIAnalyticsService.generatePredictions(
        await AIAnalyticsService.collectUserData(userId, range)
      ),
      RecommendationEngine.getPersonalizedRecommendations(userId),
      AIAnalyticsService.collectUserData(userId, range)
    ]);

    res.json({
      insights,
      predictions,
      recommendations,
      usage: {
        totalGenerations: usage.totalGenerations,
        totalProjects: usage.totalProjects,
        totalTemplates: usage.totalTemplates
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value !== undefined ? value : '';
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

export default router;
