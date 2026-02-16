import GenerationFlow from '../models/GenerationFlow.js';
import User from '../models/User.js';
import { OpenAI } from 'openai';

class AIAnalyticsService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
  }

  async analyzeUserBehavior(userId, timeRange = '30d') {
    try {
      // Collect user data
      const userData = await this.collectUserData(userId, timeRange);
      
      // Analyze patterns using AI
      const analysis = await this.analyzePatternsWithAI(userData);
      
      // Generate insights
      const insights = await this.generateInsights(userData, analysis);
      
      // Create recommendations
      const recommendations = await this.generateRecommendations(userData, analysis);
      
      return {
        userProfile: analysis.userProfile,
        usagePatterns: analysis.usagePatterns,
        preferences: analysis.preferences,
        insights,
        recommendations,
        predictions: await this.generatePredictions(userData)
      };
    } catch (error) {
      console.error('AI Analytics error:', error);
      return this.getFallbackAnalysis(userId);
    }
  }

  async collectUserData(userId, timeRange) {
    const dateFilter = this.getDateFilter(timeRange);
    
    const [
      generations,
      projects,
      templates
    ] = await Promise.all([
      GenerationFlow.find({ userId, createdAt: { $gte: dateFilter } }).limit(500),
      Project.find({ 
        $or: [{ ownerId: userId }, { 'collaborators.userId': userId }],
        createdAt: { $gte: dateFilter }
      }).limit(100),
      PromptTemplate.find({ userId }).limit(50)
    ]);

    return {
      generations,
      projects,
      templates,
      timeRange,
      totalGenerations: generations.length,
      totalProjects: projects.length,
      totalTemplates: templates.length
    };
  }

  async analyzePatternsWithAI(userData) {
    try {
      const prompt = `
Analyze this user's AI image generation behavior and provide insights:

User Data Summary:
- Total generations: ${userData.totalGenerations}
- Total projects: ${userData.totalProjects}
- Total templates: ${userData.totalTemplates}
- Time range: ${userData.timeRange}
- Generation types: ${this.summarizeGenerationTypes(userData.generations)}
- Usage frequency: ${this.calculateUsageFrequency(userData.generations)}
- Preferred categories: ${this.extractPreferredCategories(userData.generations)}

Please provide:
1. User profile classification (casual, professional, creative, business)
2. Usage patterns (time preferences, batch sizes, quality priorities)
3. Preferences (styles, subjects, techniques)
4. Efficiency metrics
5. Areas for improvement

Format as JSON with these keys: userProfile, usagePatterns, preferences, efficiency, improvements
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.getBasicAnalysis(userData);
    }
  }

  async generateInsights(userData, analysis) {
    const insights = [];

    // Efficiency insights
    if (analysis.efficiency?.avgGenerationTime > 15) {
      insights.push({
        type: 'efficiency',
        priority: 'high',
        title: 'Slow Generation Times',
        description: `Your average generation time of ${analysis.efficiency.avgGenerationTime}s is above optimal. Consider using faster providers or optimizing prompts.`,
        impact: 'Save up to 60% generation time',
        actionable: true
      });
    }

    // Quality insights
    if (analysis.preferences?.qualityPriority === 'high' && analysis.efficiency?.successRate < 85) {
      insights.push({
        type: 'quality',
        priority: 'medium', 
        title: 'Quality Optimization Opportunity',
        description: 'You prioritize quality but have room for improvement in success rates. Try using premium models or refining your prompts.',
        impact: 'Increase success rate by 15-25%',
        actionable: true
      });
    }

    // Usage pattern insights
    const peakHours = this.identifyPeakHours(userData.generations);
    if (peakHours.length > 0) {
      insights.push({
        type: 'productivity',
        priority: 'low',
        title: 'Peak Productivity Hours',
        description: `You're most productive during ${peakHours.join(', ')}. Consider scheduling complex projects during these times.`,
        impact: 'Optimize workflow timing',
        actionable: false
      });
    }

    // Cost insights
    const costTrend = this.analyzeCostTrend(userData.generations);
    if (costTrend.trend === 'increasing') {
      insights.push({
        type: 'cost',
        priority: 'medium',
        title: 'Rising Generation Costs',
        description: `Your costs have increased ${costTrend.percentage}% recently. Consider optimizing provider selection or batch processing.`,
        impact: `Potential savings: $${costTrend.potentialSavings}`,
        actionable: true
      });
    }

    // Template usage insights
    if (userData.totalGenerations > 20 && userData.totalTemplates < 3) {
      insights.push({
        type: 'workflow',
        priority: 'medium',
        title: 'Template Optimization',
        description: 'Create templates to speed up your workflow and maintain consistency',
        impact: 'Save up to 40% creation time',
        actionable: true
      });
    }

    return insights;
  }

  async generateRecommendations(userData, analysis) {
    const recommendations = [];

    // Provider recommendations
    if (analysis.efficiency?.costEfficiency < 0.7 || !analysis.efficiency?.costEfficiency) {
      recommendations.push({
        id: 'provider-optimization',
        category: 'providers',
        title: 'Optimize Provider Selection',
        description: 'Switch to more cost-effective providers for your use case',
        potentialSavings: '$15-30/month',
        difficulty: 'easy',
        implementation: 'Use OpenRouter for free tier access'
      });
    }

    // Workflow recommendations
    if (userData.totalGenerations > 50 && userData.totalProjects < 5) {
      recommendations.push({
        id: 'project-organization',
        category: 'workflow',
        title: 'Organize Work into Projects',
        description: 'Create projects to better organize your generations and collaborate more effectively',
        potentialSavings: '30% faster workflow',
        difficulty: 'medium',
        implementation: 'Group related generations into projects'
      });
    }

    // Quality recommendations
    if (analysis.preferences?.styleConsistency < 0.6 || !analysis.preferences?.styleConsistency) {
      recommendations.push({
        id: 'style-presets',
        category: 'quality',
        title: 'Create Style Presets',
        description: 'Save your successful prompt combinations as presets for consistent results',
        potentialSavings: '50% faster iterations',
        difficulty: 'easy',
        implementation: 'Save 3-5 favorite prompt combinations'
      });
    }

    // Automation recommendations
    if (userData.generations.length > 100) {
      recommendations.push({
        id: 'batch-processing',
        category: 'automation',
        title: 'Implement Batch Processing',
        description: 'Use batch processing for repetitive tasks to save time and reduce costs',
        potentialSavings: '40% time savings',
        difficulty: 'medium',
        implementation: 'Set up automated batch workflows'
      });
    }

    // Template recommendations
    if (userData.totalGenerations > 10 && userData.totalTemplates < 2) {
      recommendations.push({
        id: 'template-creation',
        category: 'workflow',
        title: 'Create Custom Templates',
        description: 'Build reusable templates for common generation types',
        potentialSavings: '35% faster creation',
        difficulty: 'easy',
        implementation: 'Start with your most common prompts'
      });
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  async generatePredictions(userData) {
    const predictions = {
      nextMonthUsage: 0,
      costProjection: 0,
      recommendations: []
    };

    // Simple linear regression for usage prediction
    const usageHistory = this.calculateMonthlyUsage(userData.generations);
    if (usageHistory.length >= 3) {
      const trend = this.calculateTrend(usageHistory);
      predictions.nextMonthUsage = Math.max(0, Math.round(usageHistory[usageHistory.length - 1] * (1 + trend)));
    } else {
      // Use current rate for prediction
      predictions.nextMonthUsage = userData.totalGenerations;
    }

    // Cost projection
    const recentCosts = userData.generations.slice(-30).reduce((sum, gen) => sum + (gen.cost || 0), 0);
    const avgDailyCost = recentCosts > 0 ? recentCosts / Math.min(30, userData.generations.length) : 0;
    predictions.costProjection = Math.round(avgDailyCost * 30 * 100) / 100;

    // Predictive recommendations
    if (predictions.nextMonthUsage > userData.generations.length * 1.5 && userData.generations.length > 10) {
      predictions.recommendations.push({
        type: 'upgrade',
        message: 'Consider upgrading to premium plan for increased usage',
        icon: '🚀'
      });
    }

    if (predictions.costProjection > 50) {
      predictions.recommendations.push({
        type: 'cost',
        message: 'Consider using free tier providers to reduce costs',
        icon: '💰'
      });
    }

    // Add usage trend
    predictions.usageTrend = usageHistory.length >= 2 
      ? (usageHistory[usageHistory.length - 1] >= usageHistory[usageHistory.length - 2] ? 'increasing' : 'decreasing')
      : 'stable';
    
    predictions.costTrend = predictions.costProjection > (avgDailyCost * 30) ? 'increasing' : 'decreasing';

    return predictions;
  }

  async analyzeContentQuality(generations) {
    const qualityAnalysis = {
      overall: 0,
      categories: {},
      trends: [],
      recommendations: []
    };

    // Analyze each generation
    const validGenerations = generations.filter(g => g.success !== false).slice(-50);
    
    if (validGenerations.length === 0) {
      return {
        overall: 0,
        categories: {},
        trends: [],
        recommendations: [{ type: 'data', message: 'No successful generations to analyze' }]
      };
    }

    // Calculate basic metrics
    const totalScore = validGenerations.reduce((sum, gen) => {
      // Base score on generation time (faster = better quality usually)
      const timeScore = Math.max(0, 10 - (gen.generationTime || 10) / 3);
      return sum + timeScore;
    }, 0);

    qualityAnalysis.overall = Math.round((totalScore / validGenerations.length) * 10) / 10;
    
    // Category analysis
    validGenerations.forEach(gen => {
      const category = gen.category || gen.modelId || 'uncategorized';
      if (!qualityAnalysis.categories[category]) {
        qualityAnalysis.categories[category] = { total: 0, count: 0 };
      }
      qualityAnalysis.categories[category].total += (gen.success ? 7 : 4);
      qualityAnalysis.categories[category].count += 1;
    });

    // Calculate category averages
    Object.keys(qualityAnalysis.categories).forEach(cat => {
      const catData = qualityAnalysis.categories[cat];
      catData.average = Math.round((catData.total / catData.count) * 10) / 10;
    });

    // Add recommendations based on quality
    if (qualityAnalysis.overall < 6) {
      qualityAnalysis.recommendations.push({
        type: 'quality',
        message: 'Your generation success rate could be improved. Try refining your prompts.'
      });
    }

    return qualityAnalysis;
  }

  async generateSmartSuggestions(userId, context) {
    try {
      const userData = await this.collectUserData(userId, '30d');
      
      const prompt = `
Based on this user's recent activity, suggest improvements:

Recent Activity:
- Generations: ${userData.totalGenerations}
- Most used category: ${this.getMostUsedCategory(userData.generations)}
- Average generation time: ${this.getAverageGenerationTime(userData.generations)}s
- Success rate: ${this.getSuccessRate(userData.generations)}%

Context: ${context}

Provide 3 specific, actionable suggestions to improve their workflow.
Format as JSON array with objects containing "title", "description", and "impact".
`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Smart suggestions error:', error);
      return this.getFallbackSuggestions();
    }
  }

  // Helper methods
  getDateFilter(timeRange) {
    const now = new Date();
    const ranges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    return new Date(now.getTime() - (ranges[timeRange] || ranges['30d']));
  }

  summarizeGenerationTypes(generations) {
    const types = {};
    generations.forEach(gen => {
      const type = gen.category || gen.modelId || 'uncategorized';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([type, count]) => `${type}: ${count}`).join(', ');
  }

  calculateUsageFrequency(generations) {
    if (generations.length === 0) return 'No activity';
    
    const sorted = generations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstDate = new Date(sorted[0].createdAt);
    const lastDate = new Date(sorted[sorted.length - 1].createdAt);
    const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    
    const avgPerDay = generations.length / daysDiff;
    if (avgPerDay >= 5) return 'Very active (5+ per day)';
    if (avgPerDay >= 2) return 'Active (2-5 per day)';
    if (avgPerDay >= 0.5) return 'Regular (2-6 per week)';
    return 'Occasional (less than 2 per week)';
  }

  extractPreferredCategories(generations) {
    const categories = {};
    generations.forEach(gen => {
      const cat = gen.category || gen.modelId || 'uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3).map(([cat, count]) => `${cat} (${count})`).join(', ');
  }

  getBasicAnalysis(userData) {
    return {
      userProfile: {
        type: userData.totalGenerations > 50 ? 'professional' : 
               userData.totalGenerations > 10 ? 'creative' : 'casual',
        description: 'Active AI content creator'
      },
      usagePatterns: { 
        frequency: this.calculateUsageFrequency(userData.generations), 
        peakHours: [] 
      },
      preferences: { 
        categories: [],
        qualityPriority: 'medium'
      },
      efficiency: {
        avgGenerationTime: this.getAverageGenerationTime(userData.generations),
        successRate: this.getSuccessRate(userData.generations),
        costEfficiency: 0.7
      },
      improvements: []
    };
  }

  getFallbackAnalysis(userId) {
    return {
      userProfile: { type: 'standard', description: 'Getting started' },
      usagePatterns: { frequency: 'regular', peakHours: [] },
      preferences: { categories: [], qualityPriority: 'medium' },
      insights: [],
      recommendations: [],
      predictions: { nextMonthUsage: 0, costProjection: 0 }
    };
  }

  identifyPeakHours(generations) {
    const hourCounts = new Array(24).fill(0);
    generations.forEach(gen => {
      const hour = new Date(gen.createdAt).getHours();
      hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    if (maxCount === 0) return [];
    
    const peakHours = [];
    hourCounts.forEach((count, hour) => {
      if (count === maxCount && count > 0) {
        peakHours.push(`${hour}:00`);
      }
    });
    
    return peakHours;
  }

  analyzeCostTrend(generations) {
    if (generations.length < 5) return { trend: 'stable', percentage: 0, potentialSavings: 0 };
    
    const sorted = generations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const midpoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, gen) => sum + (gen.cost || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, gen) => sum + (gen.cost || 0), 0) / secondHalf.length;
    
    const change = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    return {
      trend: Math.abs(change) < 10 ? 'stable' : (change > 0 ? 'increasing' : 'decreasing'),
      percentage: Math.round(Math.abs(change)),
      potentialSavings: Math.round(secondHalfAvg * 0.2 * 30)
    };
  }

  calculateMonthlyUsage(generations) {
    const monthly = {};
    generations.forEach(gen => {
      const month = new Date(gen.createdAt).toISOString().slice(0, 7);
      monthly[month] = (monthly[month] || 0) + 1;
    });
    
    return Object.values(monthly);
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope / (data[data.length - 1] || 1);
  }

  getMostUsedCategory(generations) {
    const categories = {};
    generations.forEach(gen => {
      const cat = gen.category || gen.modelId || 'uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'none';
  }

  getAverageGenerationTime(generations) {
    if (generations.length === 0) return 0;
    const total = generations.reduce((sum, gen) => sum + (gen.generationTime || 0), 0);
    return Math.round(total / generations.length);
  }

  getSuccessRate(generations) {
    if (generations.length === 0) return 0;
    const successful = generations.filter(gen => gen.success).length;
    return Math.round((successful / generations.length) * 100);
  }

  getFallbackSuggestions() {
    return [
      {
        title: 'Optimize Prompts',
        description: 'Try more specific and detailed prompts for better results',
        impact: 'Improve success rate by 20%'
      },
      {
        title: 'Use Batch Processing',
        description: 'Process multiple images at once to save time',
        impact: 'Reduce processing time by 50%'
      },
      {
        title: 'Experiment with Styles',
        description: 'Try different artistic styles to find your preferences',
        impact: 'Discover new creative possibilities'
      }
    ];
  }
}

export default new AIAnalyticsService();
