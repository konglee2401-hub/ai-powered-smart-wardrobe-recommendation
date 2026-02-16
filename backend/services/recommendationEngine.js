import GenerationFlow from '../models/GenerationFlow.js';
import PromptTemplate from '../models/PromptOption.js';
import User from '../models/User.js';
import * as AIAnalyticsService from './aiAnalyticsService.js';
import { OpenAI } from 'openai';

class RecommendationEngine {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async getPersonalizedRecommendations(userId, context = {}) {
    const cacheKey = `recs_${userId}_${JSON.stringify(context)}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const [
        userAnalysis,
        similarUsers,
        trendingItems,
        userHistory
      ] = await Promise.all([
        AIAnalyticsService.analyzeUserBehavior(userId),
        this.findSimilarUsers(userId),
        this.getTrendingItems(),
        this.getUserHistory(userId)
      ]);

      const recommendations = {
        presets: await this.recommendPresets(userAnalysis, userHistory),
        providers: await this.recommendProviders(userAnalysis),
        workflows: await this.recommendWorkflows(userAnalysis),
        nextSteps: await this.recommendNextSteps(userAnalysis, context),
        trending: trendingItems
      };

      // Cache results
      this.cache.set(cacheKey, {
        data: recommendations,
        timestamp: Date.now()
      });

      return recommendations;
    } catch (error) {
      console.error('Recommendation engine error:', error);
      return this.getFallbackRecommendations();
    }
  }

  async recommendPresets(userAnalysis, userHistory) {
    const userPreferences = userAnalysis.preferences || {};
    const recentGenerations = userHistory.generations?.slice(-10) || [];

    // Find templates that match user preferences
    const matchingTemplates = await PromptTemplate.find({
      $or: [
        { isPublic: true },
        { userId: userHistory.userId }
      ]
    }).limit(20);

    if (matchingTemplates.length === 0) {
      return this.getDefaultPresetRecommendations();
    }

    // Score templates based on relevance
    const scoredTemplates = matchingTemplates.map(preset => {
      let score = 0;
      
      // Category match
      const userCategories = userPreferences.categories || [];
      if (userCategories.includes(preset.category)) {
        score += 30;
      }

      // Recent activity match
      const recentCategories = [...new Set(recentGenerations.map(g => g.category))];
      if (recentCategories.includes(preset.category)) {
        score += 25;
      }

      // Usage bonus
      score += Math.min(preset.usageCount || 0, 10);

      return { preset, score };
    });

    // Sort by score and return top recommendations
    return scoredTemplates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => ({
        id: item.preset._id,
        name: item.preset.name,
        category: item.preset.category,
        description: item.preset.description || 'Custom prompt template',
        relevanceScore: item.score,
        whyRecommended: this.explainRecommendation(item.preset, userAnalysis)
      }));
  }

  async recommendProviders(userAnalysis) {
    const preferences = userAnalysis.preferences || {};
    const efficiency = userAnalysis.efficiency || {};

    const recommendations = [];

    // Speed-focused users
    if (preferences.speedPriority === 'high') {
      recommendations.push({
        provider: 'openrouter-flux-schnell-free',
        name: 'OpenRouter Flux Schnell (Free)',
        reason: 'Fastest free provider for quick iterations',
        estimatedSpeed: '2-5 seconds',
        cost: '$0'
      });
    }

    // Quality-focused users
    if (preferences.qualityPriority === 'high') {
      recommendations.push({
        provider: 'nvidia-sd-3',
        name: 'NVIDIA SD-3',
        reason: 'Highest quality results with advanced features',
        estimatedSpeed: '8-15 seconds',
        cost: '$0.03-0.05'
      });
    }

    // Cost-conscious users
    if (efficiency.costEfficiency < 0.7 || !efficiency.costEfficiency) {
      recommendations.push({
        provider: 'openrouter-flux-schnell-free',
        name: 'OpenRouter Free Tier',
        reason: 'Zero cost with good quality for most use cases',
        estimatedSpeed: '3-8 seconds',
        cost: '$0'
      });
    }

    // Balance approach
    recommendations.push({
      provider: 'fal-flux-pro',
      name: 'Fal Flux Pro',
      reason: 'Excellent balance of speed, quality, and cost',
      estimatedSpeed: '5-10 seconds',
      cost: '$0.02-0.04'
    });

    return recommendations.slice(0, 3);
  }

  async recommendWorkflows(userAnalysis) {
    const workflows = [];
    const usage = userAnalysis.usagePatterns || {};
    const totalGenerations = userAnalysis.totalGenerations || 0;

    // Batch processing workflow
    if (totalGenerations > 20) {
      workflows.push({
        id: 'batch-processing',
        name: 'Batch Processing Workflow',
        description: 'Process multiple images simultaneously to save time',
        benefits: ['50% faster processing', 'Consistent results', 'Cost effective'],
        difficulty: 'easy',
        setupTime: '5 minutes'
      });
    }

    // Template creation workflow
    if (totalGenerations > 20 && userAnalysis.totalTemplates < 3) {
      workflows.push({
        id: 'preset-creation',
        name: 'Custom Preset System',
        description: 'Create reusable presets for consistent results',
        benefits: ['Faster iterations', 'Brand consistency', 'Shareable assets'],
        difficulty: 'medium',
        setupTime: '15 minutes'
      });
    }

    // Quality assurance workflow
    if ((userAnalysis.efficiency?.successRate || 100) < 90) {
      workflows.push({
        id: 'quality-assurance',
        name: 'Quality Assurance Pipeline',
        description: 'Automated quality checks and refinement process',
        benefits: ['Higher success rates', 'Better results', 'Time savings'],
        difficulty: 'medium',
        setupTime: '10 minutes'
      });
    }

    // Team collaboration workflow
    if (userAnalysis.collaborationLevel < 0.3) {
      workflows.push({
        id: 'team-collaboration',
        name: 'Team Collaboration Setup',
        description: 'Set up collaborative workflows for team projects',
        benefits: ['Better coordination', 'Knowledge sharing', 'Faster delivery'],
        difficulty: 'medium',
        setupTime: '20 minutes'
      });
    }

    return workflows.slice(0, 3);
  }

  async recommendNextSteps(userAnalysis, context) {
    const steps = [];
    const { totalGenerations, totalProjects, totalTemplates } = userAnalysis;

    // Onboarding steps for new users
    if (totalGenerations < 5) {
      steps.push({
        id: 'first-generation',
        title: 'Complete Your First Generation',
        description: 'Try generating an image to get started',
        type: 'action',
        priority: 'high'
      });
    }

    // Project organization
    if (totalGenerations > 10 && totalProjects < 2) {
      steps.push({
        id: 'create-project',
        title: 'Organize Your Work',
        description: 'Create your first project to organize generations',
        type: 'action',
        priority: 'medium'
      });
    }

    // Template creation
    if (totalGenerations > 5 && totalTemplates < 1) {
      steps.push({
        id: 'create-template',
        title: 'Save Your First Template',
        description: 'Create a reusable template from your best prompts',
        type: 'action',
        priority: 'medium'
      });
    }

    // Advanced features
    if (totalGenerations > 50) {
      steps.push({
        id: 'explore-advanced',
        title: 'Explore Advanced Features',
        description: 'Try batch processing and automation features',
        type: 'discovery',
        priority: 'low'
      });
    }

    return steps;
  }

  async findSimilarUsers(userId) {
    const userGenerations = await GenerationResult.find({ userId }).limit(100);
    
    if (userGenerations.length === 0) return [];

    // Get user's category preferences
    const userCategories = {};
    userGenerations.forEach(gen => {
      const cat = gen.category || gen.modelId || 'uncategorized';
      userCategories[cat] = (userCategories[cat] || 0) + 1;
    });

    const topCategories = Object.keys(userCategories).sort((a, b) => 
      userCategories[b] - userCategories[a]
    ).slice(0, 3);

    if (topCategories.length === 0) return [];

    // Find users with similar category preferences
    const similarUsers = await GenerationResult.aggregate([
      { $match: { userId: { $ne: userId }, category: { $in: topCategories } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return similarUsers.map(user => user._id);
  }

  async getTrendingItems() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const trending = await PromptTemplate.find({
      $or: [
        { isPublic: true },
        { createdAt: { $gte: sevenDaysAgo } }
      ]
    })
    .sort({ usageCount: -1, createdAt: -1 })
    .limit(5)
    .select('name category description usageCount');

    return trending.map(item => ({
      id: item._id,
      name: item.name,
      category: item.category,
      trend: item.usageCount > 10 ? 'hot' : 'rising'
    }));
  }

  async getUserHistory(userId) {
    const [generations, projects, templates] = await Promise.all([
      GenerationResult.find({ userId }).sort({ createdAt: -1 }).limit(50),
      Project.find({ 
        $or: [{ ownerId: userId }, { 'collaborators.userId': userId }]
      }).limit(20),
      PromptTemplate.find({ userId }).limit(10)
    ]);

    return {
      userId,
      generations,
      projects,
      templates,
      hasCustomPresets: templates.length > 0,
      totalGenerations: await GenerationResult.countDocuments({ userId }),
      totalProjects: projects.length,
      totalTemplates: templates.length
    };
  }

  explainRecommendation(preset, userAnalysis) {
    const reasons = [];

    const userCategories = userAnalysis.preferences?.categories || [];
    if (userCategories.includes(preset.category)) {
      reasons.push(`matches your interest in ${preset.category}`);
    }

    if (preset.usageCount > 10) {
      reasons.push('popular choice');
    }

    if (reasons.length > 0) {
      return reasons.join(', ');
    }
    return 'recommended for you';
  }

  getDefaultPresetRecommendations() {
    return [
      {
        id: 'default-fashion',
        name: 'Fashion Photography',
        category: 'photography',
        description: 'Professional fashion photography style',
        relevanceScore: 80,
        whyRecommended: 'Popular category for virtual try-on'
      },
      {
        id: 'default-product',
        name: 'Product Showcase',
        category: 'product',
        description: 'Clean product photography style',
        relevanceScore: 75,
        whyRecommended: 'Ideal for e-commerce images'
      },
      {
        id: 'default-creative',
        name: 'Creative Art',
        category: 'artistic',
        description: 'Artistic and creative interpretations',
        relevanceScore: 70,
        whyRecommended: 'Great for creative projects'
      }
    ];
  }

  getFallbackRecommendations() {
    return {
      presets: this.getDefaultPresetRecommendations(),
      providers: [{
        provider: 'openrouter-flux-schnell-free',
        name: 'OpenRouter Flux Schnell (Free)',
        reason: 'Great starting point with no cost',
        estimatedSpeed: '3-8 seconds',
        cost: '$0'
      }],
      workflows: [{
        id: 'basic-generation',
        name: 'Basic Generation Workflow',
        description: 'Start with simple image generation',
        benefits: ['Easy to learn', 'Quick results'],
        difficulty: 'easy',
        setupTime: '2 minutes'
      }],
      nextSteps: [{
        id: 'explore-features',
        title: 'Explore Features',
        description: 'Try different generation options',
        type: 'discovery',
        priority: 'high'
      }],
      trending: []
    };
  }

  // Clear cache method for maintenance
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp
      }))
    };
  }
}

export default new RecommendationEngine();
