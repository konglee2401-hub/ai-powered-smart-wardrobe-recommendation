import GenerationFlow from '../models/GenerationFlow.js';
import User from '../models/User.js';
import { OpenAI } from 'openai';
import axios from 'axios';

// Analysis providers configuration
const ANALYSIS_PROVIDERS = [
  { name: 'openai', priority: 1, requiresKey: true, free: false },
  { name: 'huggingface', priority: 2, requiresKey: true, free: true }
];

class ContentAnalysisService {
  constructor() {
    this.openai = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) 
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
    
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY || null;
  }

  /**
   * Main analysis function with intelligent provider fallback
   */
  async analyzeGeneration(generationId) {
    const generation = await GenerationResult.findOne({ _id: generationId });
    if (!generation) throw new Error('Generation not found');

    // Try providers in order of priority
    let analysis = null;
    let usedProvider = null;

    for (const provider of ANALYSIS_PROVIDERS) {
      try {
        if (provider.name === 'openai' && this.openai) {
          analysis = await this._analyzeWithOpenAI(generation);
          usedProvider = 'openai';
          break;
        } else if (provider.name === 'huggingface' && this.huggingfaceApiKey) {
          analysis = await this._analyzeWithHuggingFace(generation);
          usedProvider = 'huggingface';
          break;
        }
      } catch (error) {
        console.warn(`Analysis provider ${provider.name} failed:`, error.message);
        continue;
      }
    }

    // Fallback to basic analysis if all providers failed
    if (!analysis) {
      analysis = await this._basicFallbackAnalysis(generation);
      usedProvider = 'fallback';
    }

    return {
      ...analysis,
      generationId,
      provider: usedProvider,
      createdAt: new Date()
    };
  }

  /**
   * Analyze with OpenAI (primary provider)
   */
  async _analyzeWithOpenAI(generation) {
    const analysis = {
      basic: await this.basicAnalysis(generation),
      content: await this.contentAnalysis(generation),
      quality: await this.qualityAnalysis(generation),
      suggestions: await this.generateSuggestions(generation)
    };
    return analysis;
  }

  /**
   * Analyze with HuggingFace (free fallback provider)
   */
  async _analyzeWithHuggingFace(generation) {
    console.log('🔍 Using HuggingFace for analysis...');
    
    try {
      // Get image for analysis
      const imageUrl = generation.imageUrl || generation.url;
      let imageBase64 = null;
      
      if (imageUrl) {
        try {
          const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          imageBase64 = Buffer.from(imageResponse.data).toString('base64');
        } catch (e) {
          console.warn('Could not fetch image for HF analysis:', e.message);
        }
      }

      // Use HF inference API for image analysis
      const hfResults = {};
      
      // Image captioning
      if (imageBase64) {
        try {
          const captionResponse = await axios.post(
            'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
            { inputs: imageBase64 },
            {
              headers: { 'Authorization': `Bearer ${this.huggingfaceApiKey}` },
              timeout: 30000
            }
          );
          hfResults.caption = Array.isArray(captionResponse.data) 
            ? captionResponse.data[0]?.generated_text 
            : captionResponse.data?.generated_text;
        } catch (e) {
          console.warn('HF caption failed:', e.message);
        }

        // Object detection
        try {
          const objResponse = await axios.post(
            'https://api-inference.huggingface.co/models/facebook/detr-resnet-50-panoptic',
            { inputs: imageBase64 },
            {
              headers: { 'Authorization': `Bearer ${this.huggingfaceApiKey}` },
              timeout: 30000
            }
          );
          hfResults.objects = this._parseDetrResults(objResponse.data);
        } catch (e) {
          console.warn('HF object detection failed:', e.message);
        }

        // Image classification
        try {
          const classResponse = await axios.post(
            'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
            { inputs: imageBase64 },
            {
              headers: { 'Authorization': `Bearer ${this.huggingfaceApiKey}` },
              timeout: 30000
            }
          );
          hfResults.classification = this._parseClassificationResults(classResponse.data);
        } catch (e) {
          console.warn('HF classification failed:', e.message);
        }
      }

      // Generate quality assessment based on HF results
      const qualityScore = this._calculateQualityFromHF(hfResults);

      return {
        basic: await this.basicAnalysis(generation),
        visual: {
          caption: hfResults.caption || 'Unable to generate caption',
          detectedObjects: hfResults.objects || [],
          classifications: hfResults.classification || [],
          provider: 'huggingface'
        },
        content: await this.contentAnalysis(generation),
        quality: {
          overallScore: qualityScore,
          criteria: {
            technicalQuality: qualityScore,
            aestheticAppeal: qualityScore,
            promptAdherence: qualityScore,
            practicalUtility: qualityScore
          },
          feedback: hfResults.caption ? `AI Caption: ${hfResults.caption}` : 'Analysis based on HuggingFace models',
          grade: this.scoreToGrade(qualityScore)
        },
        suggestions: [
          {
            type: 'hf',
            title: 'HuggingFace Analysis',
            description: 'Analysis provided by free HuggingFace inference API',
            impact: 'Zero cost analysis'
          },
          {
            type: 'upgrade',
            title: 'Upgrade to OpenAI',
            description: 'For more detailed analysis, configure OpenAI API key',
            impact: 'Get GPT-4 powered insights'
          }
        ],
        provider: 'huggingface'
      };
    } catch (error) {
      console.error('HuggingFace analysis error:', error);
      throw error;
    }
  }

  /**
   * Parse DETR object detection results
   */
  _parseDetrResults(data) {
    if (!data || !Array.isArray(data)) return [];
    
    return data
      .filter(item => item.score > 0.5)
      .slice(0, 10)
      .map(item => ({
        label: item.label,
        confidence: Math.round(item.score * 100) / 100
      }));
  }

  /**
   * Parse classification results
   */
  _parseClassificationResults(data) {
    if (!data || !Array.isArray(data) || !data[0]) return [];
    
    return data[0]
      .slice(0, 5)
      .map(item => ({
        label: item.label,
        confidence: Math.round(item.score * 100) / 100
      }));
  }

  /**
   * Calculate quality score from HuggingFace results
   */
  _calculateQualityFromHF(hfResults) {
    let score = 7; // Base score
    
    // Higher confidence in detected objects suggests better image quality
    if (hfResults.objects && hfResults.objects.length > 0) {
      const avgConfidence = hfResults.objects.reduce((sum, obj) => sum + obj.confidence, 0) / hfResults.objects.length;
      if (avgConfidence > 0.8) score += 1;
      else if (avgConfidence > 0.6) score += 0.5;
    }
    
    // Having classification results is a good sign
    if (hfResults.classification && hfResults.classification.length > 0) {
      score += 0.5;
    }
    
    return Math.min(10, Math.max(1, score));
  }

  /**
   * Basic fallback analysis when all providers fail
   */
  async _basicFallbackAnalysis(generation) {
    return {
      basic: await this.basicAnalysis(generation),
      content: await this.contentAnalysis(generation),
      quality: {
        overallScore: generation.success ? 6 : 3,
        criteria: {
          technicalQuality: generation.success ? 6 : 3,
          aestheticAppeal: generation.success ? 6 : 3,
          promptAdherence: generation.success ? 6 : 3,
          practicalUtility: generation.success ? 6 : 3
        },
        feedback: 'Basic analysis - providers unavailable',
        grade: generation.success ? 'C' : 'F'
      },
      suggestions: [
        {
          type: 'config',
          title: 'Configure API Keys',
          description: 'Add OpenAI or HuggingFace API keys for detailed analysis',
          impact: 'Enable AI-powered insights'
        }
      ],
      provider: 'fallback'
    };
  }

  async analyzeGeneration(generationId) {
    const generation = await GenerationResult.findOne({ _id: generationId });
    if (!generation) throw new Error('Generation not found');

    const analysis = {
      generationId,
      basic: await this.basicAnalysis(generation),
      content: await this.contentAnalysis(generation),
      quality: await this.qualityAnalysis(generation),
      suggestions: await this.generateSuggestions(generation),
      createdAt: new Date()
    };

    return analysis;
  }

  async basicAnalysis(generation) {
    return {
      id: generation._id,
      fileSize: generation.fileSize || 0,
      dimensions: generation.width && generation.height 
        ? { width: generation.width, height: generation.height } 
        : { width: 0, height: 0 },
      format: generation.format || 'unknown',
      generationTime: generation.generationTime || 0,
      provider: generation.provider || generation.modelId || 'unknown',
      cost: generation.cost || 0,
      success: generation.success !== false,
      createdAt: generation.createdAt
    };
  }

  async contentAnalysis(generation) {
    const prompt = generation.prompt || '';
    const negativePrompt = generation.negativePrompt || '';

    // Analyze prompt effectiveness
    const promptAnalysis = await this.analyzePrompt(prompt, negativePrompt);
    
    // Detect objects/subjects
    const subjects = await this.detectSubjects(prompt);
    
    // Analyze style and mood
    const styleAnalysis = await this.analyzeStyle(prompt);
    
    // Check for common issues
    const issues = await this.detectIssues(generation);

    return {
      promptAnalysis,
      subjects,
      style: styleAnalysis,
      issues,
      readability: this.calculateReadability(prompt),
      specificity: this.calculateSpecificity(prompt)
    };
  }

  async qualityAnalysis(generation) {
    const qualityPrompt = `
Analyze the quality of this AI-generated image:

Prompt: "${generation.prompt?.substring(0, 200) || 'N/A'}"
Provider: ${generation.provider || generation.modelId || 'N/A'}
Generation time: ${generation.generationTime || 0}s

Evaluate on these criteria:
1. Technical quality (1-10) - resolution, clarity
2. Aesthetic appeal (1-10) - colors, composition
3. Prompt adherence (1-10) - matches the prompt
4. Practical utility (1-10) - usable for its purpose

Provide scores and brief feedback for each criterion.
Format as JSON with "scores" object and "overallFeedback" string.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: qualityPrompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Calculate overall score
      const scores = analysis.scores;
      const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;

      return {
        overallScore: Math.round(overallScore * 10) / 10,
        criteria: scores,
        feedback: analysis.overallFeedback,
        grade: this.scoreToGrade(overallScore)
      };
    } catch (error) {
      console.error('Quality analysis error:', error);
      return {
        overallScore: generation.success ? 7 : 4,
        criteria: {
          technicalQuality: generation.success ? 7 : 4,
          aestheticAppeal: generation.success ? 7 : 4,
          promptAdherence: generation.success ? 7 : 4,
          practicalUtility: generation.success ? 7 : 4
        },
        feedback: generation.success ? 'Generation completed successfully' : 'Generation failed',
        grade: generation.success ? 'B' : 'F'
      };
    }
  }

  async generateSuggestions(generation) {
    const suggestions = [];

    // Analyze the generation and provide improvement suggestions
    const improvementPrompt = `
Based on this generation, provide 3 specific suggestions for improvement:

Generation details:
- Prompt: "${generation.prompt?.substring(0, 200) || 'N/A'}"
- Provider: ${generation.provider || generation.modelId || 'N/A'}
- Success: ${generation.success !== false ? 'Yes' : 'No'}

Focus on prompt optimization and best practices.
Format as JSON array with objects containing "type", "title", "description", and "impact".
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: improvementPrompt }],
        temperature: 0.7,
        max_tokens: 300
      });

      suggestions.push(...JSON.parse(response.choices[0].message.content));
    } catch (error) {
      // Fallback suggestions
      suggestions.push({
        type: 'prompt',
        title: 'Add more descriptive details',
        description: 'Include specific colors, lighting, and composition details',
        impact: 'Improve result accuracy by 30%'
      });
      suggestions.push({
        type: 'provider',
        title: 'Try different providers',
        description: 'Experiment with different AI providers for varied results',
        impact: 'Discover better options for your use case'
      });
      suggestions.push({
        type: 'workflow',
        title: 'Save as template',
        description: 'Save successful prompts as templates for reuse',
        impact: 'Speed up future generations'
      });
    }

    return suggestions;
  }

  // Helper methods
  async analyzePrompt(prompt, negativePrompt) {
    if (!prompt) {
      return {
        clarity: 0,
        specificity: 0,
        creativity: 0,
        technicalQuality: 0,
        feedback: 'No prompt provided'
      };
    }

    const analysisPrompt = `
Analyze this image generation prompt:

Prompt: "${prompt}"
Negative prompt: "${negativePrompt || 'None'}"

Evaluate:
1. Clarity (1-10) - how clear is the description
2. Specificity (1-10) - how detailed is it
3. Creativity (1-10) - how unique is the approach
4. Technical quality (1-10) - includes technical specs

Format as JSON with scores and brief feedback.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.2,
        max_tokens: 200
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      return {
        clarity: 5,
        specificity: 5,
        creativity: 5,
        technicalQuality: 5,
        feedback: 'Unable to analyze prompt'
      };
    }
  }

  async detectSubjects(prompt) {
    if (!prompt) return ['unknown'];
    
    // Common subject keywords
    const subjectKeywords = [
      'person', 'man', 'woman', 'child', 'model', 'clothing', 'dress', 'shirt',
      'pants', 'shoes', 'accessory', 'hat', 'bag', 'jewelry', 'watch', 'glasses',
      'background', 'scene', 'outdoor', 'indoor', 'studio', 'product'
    ];

    const promptLower = prompt.toLowerCase();
    const detectedSubjects = subjectKeywords.filter(keyword => 
      promptLower.includes(keyword)
    );

    return detectedSubjects.length > 0 ? detectedSubjects : ['abstract'];
  }

  async analyzeStyle(prompt) {
    if (!prompt) {
      return {
        primary: 'unknown',
        mood: 'neutral',
        colors: ['various'],
        composition: 'standard'
      };
    }

    // Style keywords
    const styleKeywords = {
      realistic: ['realistic', 'photorealistic', 'photo', 'real life'],
      artistic: ['artistic', 'painting', 'illustration', 'art', 'drawing'],
      fashion: ['fashion', 'vogue', 'editorial', 'style', 'outfit'],
      professional: ['professional', 'commercial', 'studio', 'product shot'],
      creative: ['creative', 'unique', 'abstract', 'experimental']
    };

    const moodKeywords = {
      vibrant: ['vibrant', 'bright', 'colorful', 'bold'],
      moody: ['moody', 'dark', 'dramatic', 'mysterious'],
      elegant: ['elegant', 'sophisticated', 'classy', 'refined'],
      casual: ['casual', 'relaxed', 'informal', 'everyday'],
      luxurious: ['luxurious', 'expensive', 'premium', 'high-end']
    };

    const promptLower = prompt.toLowerCase();
    
    let detectedStyle = 'standard';
    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(k => promptLower.includes(k))) {
        detectedStyle = style;
        break;
      }
    }

    let detectedMood = 'neutral';
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(k => promptLower.includes(k))) {
        detectedMood = mood;
        break;
      }
    }

    return {
      primary: detectedStyle,
      mood: detectedMood,
      colors: this.extractColorWords(prompt),
      composition: promptLower.includes('close-up') ? 'close-up' :
                   promptLower.includes('full body') ? 'full body' :
                   promptLower.includes('portrait') ? 'portrait' : 'standard'
    };
  }

  extractColorWords(prompt) {
    const colorKeywords = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black',
      'white', 'gray', 'grey', 'brown', 'gold', 'silver', 'beige', 'navy',
      'teal', 'maroon', 'burgundy', 'coral', 'peach', 'lavender'
    ];

    const promptLower = prompt.toLowerCase();
    return colorKeywords.filter(color => promptLower.includes(color));
  }

  async detectIssues(generation) {
    const issues = [];

    // Check for common issues
    if (generation.generationTime > 60) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: 'Generation took unusually long',
        suggestion: 'Try using a faster provider or simpler prompt'
      });
    }

    if (generation.cost > 0.1) {
      issues.push({
        type: 'cost',
        severity: 'low',
        description: 'Generation cost was higher than average',
        suggestion: 'Consider using free tier providers for similar results'
      });
    }

    // Prompt-based issue detection
    const prompt = generation.prompt || '';
    if (prompt.length < 10) {
      issues.push({
        type: 'prompt',
        severity: 'high',
        description: 'Prompt is too short and lacks detail',
        suggestion: 'Add more descriptive elements, style, and composition details'
      });
    }

    if (!generation.success) {
      issues.push({
        type: 'generation',
        severity: 'high',
        description: 'Generation failed',
        suggestion: 'Check prompt for inappropriate content or try a different provider'
      });
    }

    if (prompt.includes('blurry') || prompt.includes('low quality')) {
      issues.push({
        type: 'prompt',
        severity: 'medium',
        description: 'Prompt contains negative quality descriptors',
        suggestion: 'Use positive language and specify desired quality'
      });
    }

    return issues;
  }

  calculateReadability(prompt) {
    if (!prompt) return 0;
    
    // Simple readability calculation
    const words = prompt.split(' ').length;
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim()).length || 1;
    const avgWordsPerSentence = words / sentences;
    
    // Lower is more readable (fewer words per sentence)
    return Math.min(100, Math.max(0, 100 - avgWordsPerSentence * 2));
  }

  calculateSpecificity(prompt) {
    if (!prompt) return 0;
    
    // Count descriptive words and details
    const descriptiveWords = [
      'color', 'style', 'lighting', 'composition', 'mood', 'texture', 'detailed',
      'background', 'foreground', 'subject', 'pose', 'angle', 'view', 'shot',
      'portrait', 'landscape', 'close-up', 'wide', 'narrow', 'sharp', 'soft'
    ];
    
    const words = prompt.toLowerCase().split(/\s+/);
    
    let specificityScore = 0;
    descriptiveWords.forEach(word => {
      if (words.includes(word)) specificityScore += 10;
    });
    
    // Bonus for length (more details = more specific)
    specificityScore += Math.min(30, words.length);
    
    return Math.min(100, specificityScore);
  }

  scoreToGrade(score) {
    if (score >= 9) return 'A+';
    if (score >= 8) return 'A';
    if (score >= 7) return 'B';
    if (score >= 6) return 'C';
    if (score >= 5) return 'D';
    return 'F';
  }

  // Batch analysis for multiple generations
  async analyzeBatch(generationIds) {
    const analyses = [];
    
    for (const id of generationIds) {
      try {
        const analysis = await this.analyzeGeneration(id);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Failed to analyze generation ${id}:`, error);
        analyses.push({ generationId: id, error: error.message });
      }
    }

    return {
      totalAnalyzed: analyses.length,
      successful: analyses.filter(a => !a.error).length,
      analyses,
      summary: this.summarizeBatchAnalysis(analyses)
    };
  }

  summarizeBatchAnalysis(analyses) {
    const validAnalyses = analyses.filter(a => !a.error && a.quality);
    
    if (validAnalyses.length === 0) return { error: 'No valid analyses' };

    const avgQuality = validAnalyses.reduce((sum, a) => sum + (a.quality?.overallScore || 0), 0) / validAnalyses.length;
    const avgGenerationTime = validAnalyses.reduce((sum, a) => sum + (a.basic?.generationTime || 0), 0) / validAnalyses.length;
    
    const commonIssues = {};
    validAnalyses.forEach(analysis => {
      (analysis.content?.issues || []).forEach(issue => {
        commonIssues[issue.type] = (commonIssues[issue.type] || 0) + 1;
      });
    });

    return {
      averageQuality: Math.round(avgQuality * 10) / 10,
      averageGenerationTime: Math.round(avgGenerationTime),
      totalGenerations: validAnalyses.length,
      successRate: Math.round((validAnalyses.filter(a => a.basic?.success).length / validAnalyses.length) * 100),
      commonIssues: Object.entries(commonIssues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  // Get analysis for user dashboard
  async getUserContentAnalysis(userId, timeRange = '30d') {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

    const generations = await GenerationResult.find({
      userId,
      createdAt: { $gte: dateFilter }
    }).limit(100);

    const analysisResults = await this.analyzeBatch(generations.map(g => g._id));

    return {
      summary: analysisResults.summary,
      trends: this.calculateTrends(generations),
      topProviders: this.getTopProviders(generations),
      generatedAt: new Date()
    };
  }

  calculateTrends(generations) {
    if (generations.length < 2) return { trend: 'insufficient_data' };

    const sorted = generations.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const midpoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, g) => sum + (g.generationTime || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, g) => sum + (g.generationTime || 0), 0) / secondHalf.length;
    
    const timeTrend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) : 0;
    
    const firstHalfCost = firstHalf.reduce((sum, g) => sum + (g.cost || 0), 0) / firstHalf.length;
    const secondHalfCost = secondHalf.reduce((sum, g) => sum + (g.cost || 0), 0) / secondHalf.length;
    
    const costTrend = firstHalfCost > 0 ? ((secondHalfCost - firstHalfCost) / firstHalfCost) : 0;

    return {
      generationTime: timeTrend < -0.1 ? 'improving' : timeTrend > 0.1 ? 'declining' : 'stable',
      cost: costTrend < -0.1 ? 'decreasing' : costTrend > 0.1 ? 'increasing' : 'stable'
    };
  }

  getTopProviders(generations) {
    const providerCounts = {};
    generations.forEach(gen => {
      const provider = gen.provider || gen.modelId || 'unknown';
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    });

    return Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([provider, count]) => ({ provider, count }));
  }
}

export default new ContentAnalysisService();
