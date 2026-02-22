/**
 * Affiliate Video Production Service
 * Comprehensive system for rapid affiliate video generation at scale
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AffiliateVideoService {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'affiliate-production');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, 'projects'),
      path.join(this.baseDir, 'templates'),
      path.join(this.baseDir, 'batches'),
      path.join(this.baseDir, 'analytics')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Create affiliate video project
   */
  createProject(projectData) {
    try {
      const projectId = `aff-${Date.now()}`;
      const projectDir = path.join(this.baseDir, 'projects', projectId);

      fs.mkdirSync(projectDir, { recursive: true });

      const projectConfig = {
        projectId,
        name: projectData.name,
        niche: projectData.niche, // fashion, electronics, beauty, gadgets, etc.
        targetPlatforms: projectData.platforms || ['instagram-reels', 'youtube-shorts', 'tiktok'],
        affiliateLinks: projectData.affiliateLinks || [],
        videoSettings: {
          duration: projectData.duration || 15,
          aspectRatio: '9:16', // Vertical for shorts
          quality: 'high',
          fps: 24,
          bitrate: '5000k'
        },
        brandingSettings: {
          watermark: projectData.watermark || null,
          music: projectData.music || 'trending-affiliate',
          colorFilter: projectData.colorFilter || 'vibrant' // vibrant, warm, cool, etc.
        },
        productList: [],
        batchQueue: [],
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      fs.writeFileSync(
        path.join(projectDir, 'config.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      console.log(`✨ Created affiliate project: ${projectId}`);
      return { success: true, projectId, config: projectConfig };
    } catch (error) {
      console.error(`❌ Failed to create project: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add products to project for bulk processing
   */
  async addProductsToBatch(projectId, products) {
    try {
      const projectDir = path.join(this.baseDir, 'projects', projectId);
      const configPath = path.join(projectDir, 'config.json');

      if (!fs.existsSync(configPath)) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const batchId = `batch-${Date.now()}`;
      const batchDir = path.join(this.baseDir, 'batches', batchId);

      fs.mkdirSync(batchDir, { recursive: true });

      const batchData = {
        batchId,
        projectId,
        totalProducts: products.length,
        products: products.map((p, idx) => ({
          id: `prod-${idx + 1}`,
          name: p.name,
          productUrl: p.url,
          category: p.category,
          price: p.price,
          description: p.description,
          images: p.images || [],
          affiliateLink: p.affiliateLink || config.affiliateLinks[0] || '',
          videoPrompt: this._generateVideoPrompt(p),
          status: 'pending',
          generatedAt: null
        })),
        processingStatus: {
          generated: 0,
          failed: 0,
          inProgress: 0
        },
        createdAt: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(batchDir, 'batch.json'),
        JSON.stringify(batchData, null, 2)
      );

      // Add to project queue
      config.batchQueue.push(batchId);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(`📦 Added batch ${batchId} with ${products.length} products`);
      return { success: true, batchId, batchData };
    } catch (error) {
      console.error(`❌ Failed to add products: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate optimized video prompt from product data
   */
  _generateVideoPrompt(product) {
    const prompts = [
      `Quick affiliate showcase: ${product.name} - Perfect for ${product.category}. Professional product video highlighting features and benefits. High-energy presentation with trending transitions. 15-second format optimized for Reels/Shorts.`,
      `Trending unboxing style: Opening and revealing ${product.name}. Close-up shots of product details. Quick cuts showing functionality. Energetic music sync. Influencer-style presentation for maximum engagement.`,
      `Problem-solution format: Common ${product.category} issues solved by ${product.name}. Before/after demonstration. Quick testimonial-style voiceover. Professional cinematography. High conversion-focused narrative.`,
      `Lifestyle integration: ${product.name} in real-life context. User-friendly demonstration. Vibrant colors and professional lighting. Quick benefit callouts. Designed for impulse purchase conversion.`,
      `Trending effect-based: ${product.name} featured with viral transitions and effects. TikTok/Reels native style. Catchy hook at beginning. Product integration feels natural and engaging.`
    ];

    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  /**
   * Generate subtitles with keyword emphasis for affiliate terms
   */
  async generateSubtitles(videoPath, affiliateKeywords = []) {
    try {
      const subtitles = {
        format: 'srt',
        duration: 15,
        content: [],
        keywordHighlights: affiliateKeywords,
        generatedAt: new Date().toISOString()
      };

      // Sample affiliate-optimized subtitle structure
      const affiliateTerms = [
        'LIMITED OFFER',
        'EXCLUSIVE DEAL',
        'BEST PRICE',
        'CLICK LINK',
        'GET DISCOUNT',
        'AFFILIATE LINK',
        'SHOP NOW',
        'LIMITED STOCK',
        ...affiliateKeywords
      ];

      // Generate time-synced subtitles
      for (let i = 0; i < 3; i++) {
        const startTime = `00:00:${(i * 5).toString().padStart(2, '0')},000`;
        const endTime = `00:00:${((i + 1) * 5).toString().padStart(2, '0')},000`;
        const keyword = affiliateTerms[i % affiliateTerms.length];

        subtitles.content.push({
          index: i + 1,
          startTime,
          endTime,
          text: keyword,
          isAffiliate: true,
          style: 'bold-yellow' // CTA styling
        });
      }

      return { success: true, subtitles };
    } catch (error) {
      console.error(`❌ Subtitle generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get video templates for quick production
   */
  getTemplates(niche = 'general') {
    const templates = {
      'fashion': [
        {
          id: 'fashion-showcase',
          name: 'Fashion Showcase',
          duration: 15,
          segments: [
            { time: '0-2s', action: 'Hook shot - product reveal' },
            { time: '2-6s', action: 'Close-up details and features' },
            { time: '6-10s', action: 'Worn/styled demonstration' },
            { time: '10-14s', action: 'Final reveal with CTA' },
            { time: '14-15s', action: 'Affiliate link callout' }
          ],
          music: 'upbeat-trending'
        },
        {
          id: 'fashion-haul',
          name: 'Fashion Haul Style',
          duration: 15,
          segments: [
            { time: '0-1s', action: 'Quick intro' },
            { time: '1-4s', action: 'Unboxing/reveal sequence' },
            { time: '4-8s', action: 'Multiple angle shots' },
            { time: '8-12s', action: 'Try-on or styling' },
            { time: '12-15s', action: 'Final verdict + link' }
          ],
          music: 'energetic-pop'
        }
      ],
      'electronics': [
        {
          id: 'tech-unboxing',
          name: 'Tech Unboxing',
          duration: 15,
          segments: [
            { time: '0-2s', action: 'Product box reveal' },
            { time: '2-5s', action: 'Unboxing sequence' },
            { time: '5-9s', action: 'Key features highlight' },
            { time: '9-12s', action: 'Demo/usage showcase' },
            { time: '12-15s', action: 'Rating and CTA' }
          ],
          music: 'tech-modern'
        },
        {
          id: 'tech-review',
          name: 'Quick Review',
          duration: 15,
          segments: [
            { time: '0-1s', action: 'Product name + catchline' },
            { time: '1-3s', action: 'Design showcase' },
            { time: '3-7s', action: 'Features breakdown' },
            { time: '7-11s', action: 'Performance demo' },
            { time: '11-15s', action: 'Pros highlight + link' }
          ],
          music: 'upbeat-tech'
        }
      ],
      'general': [
        {
          id: 'product-spotlight',
          name: 'Product Spotlight',
          duration: 15,
          segments: [
            { time: '0-2s', action: 'Product reveal with motion' },
            { time: '2-5s', action: 'Key benefit callout' },
            { time: '5-8s', action: 'Feature showcase' },
            { time: '8-12s', action: 'Use case demonstration' },
            { time: '12-15s', action: 'Call-to-action + affiliate' }
          ],
          music: 'upbeat-trending'
        }
      ]
    };

    return templates[niche] || templates['general'];
  }

  /**
   * Generate platform-optimized metadata
   */
  generateMetadata(productName, category, affiliateKeywords = []) {
    try {
      const platforms = {
        'instagram-reels': {
          maxHashtags: 30,
          hashtagStyle: 'trending',
          captionLength: 2200,
          emoji: true
        },
        'youtube-shorts': {
          maxHashtags: 10,
          captionLength: 5000,
          emoji: false,
          keywords: true
        },
        'tiktok': {
          maxHashtags: 15,
          captionLength: 2048,
          emoji: true,
          soundSync: true
        }
      };

      const baseHashtags = [
        `#${category.toLowerCase()}`,
        '#affiliate',
        '#sponsored',
        '#productdemo',
        '#shorts',
        '#yt-shorts'
      ];

      const trendingHashtags = [
        '#trending',
        '#foryou',
        '#foryoupage',
        '#viral',
        '#mustwatch',
        '#deal',
        '#discount'
      ];

      const metadata = {};

      Object.entries(platforms).forEach(([platform, settings]) => {
        const hashtagList = [
          ...baseHashtags,
          ...trendingHashtags,
          ...affiliateKeywords.map(k => `#${k.toLowerCase().replace(/\s+/g, '')}`)
        ].slice(0, settings.maxHashtags);

        metadata[platform] = {
          title: `🔥 ${productName} - Must See! ${emoji(platform)}`,
          description: this._generateDescription(productName, category, platform),
          hashtags: hashtagList.join(' '),
          keywords: [
            productName,
            category,
            'affiliate',
            'deal',
            'discount',
            ...affiliateKeywords
          ],
          caption: this._generateCaption(productName, category, platform),
          seoTags: [
            `buy ${productName.toLowerCase()}`,
            `${productName.toLowerCase()} review`,
            `${productName.toLowerCase()} affiliate`,
            `best ${category.toLowerCase()}`
          ]
        };
      });

      return { success: true, metadata };
    } catch (error) {
      console.error(`❌ Metadata generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  _generateDescription(productName, category, platform) {
    const templates = {
      'instagram-reels': `Check out this amazing ${category}! 🎯\n\n${productName} is exactly what you've been looking for.\n\n🔗 Link in bio to get exclusive affiliate deals!\n\n#affiliate #${category.toLowerCase()}`,
      'youtube-shorts': `Check out this incredible ${category}!\n\n${productName} features everything you need.\n\n👇 Click the link below to get the best price:\n[AFFILIATE LINK]\n\nThis video contains affiliate links.`,
      'tiktok': `POV: You found the perfect ${category} 🔥\n\n${productName} - Get it now! 💯\n\nLink in bio 👆`
    };

    return templates[platform] || templates['instagram-reels'];
  }

  _generateCaption(productName, category, platform) {
    const captions = {
      'instagram-reels': `${productName} just changed the game! 🚀\n\nBest ${category} of the year? You decide! 👇\n\nSwipe to see more details! ✨`,
      'youtube-shorts': `Meet ${productName} - The ${category} You've Been Waiting For!\n\nWatch the full review and get your exclusive affiliate discount today!`,
      'tiktok': `${productName} but make it TRENDING ✨\n\nWho else NEEDS this ${category}? 🙋‍♀️`
    };

    return captions[platform] || captions['instagram-reels'];
  }

  /**
   * Generate bulk processing report
   */
  getBatchReport(batchId) {
    try {
      const batchPath = path.join(this.baseDir, 'batches', batchId, 'batch.json');

      if (!fs.existsSync(batchPath)) {
        throw new Error(`Batch not found: ${batchId}`);
      }

      const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

      const report = {
        batchId,
        projectId: batchData.projectId,
        summary: {
          total: batchData.totalProducts,
          statusBreakdown: batchData.processingStatus,
          completionRate: `${((batchData.processingStatus.generated / batchData.totalProducts) * 100).toFixed(2)}%`,
          estimatedTime: `${(batchData.totalProducts * 2)} minutes`
        },
        products: batchData.products.map(p => ({
          productId: p.id,
          name: p.name,
          status: p.status,
          generatedAt: p.generatedAt
        })),
        createdAt: batchData.createdAt
      };

      return { success: true, report };
    } catch (error) {
      console.error(`❌ Failed to get batch report: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

function emoji(platform) {
  const emojiMap = {
    'instagram-reels': '📱',
    'youtube-shorts': '▶️',
    'tiktok': '🎵'
  };
  return emojiMap[platform] || '🎬';
}

export default AffiliateVideoService;
