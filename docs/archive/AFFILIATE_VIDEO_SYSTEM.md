# 🎬 Affiliate Video Production System - Complete Implementation Guide

## 📊 Overview

Hệ thống tự động hóa sản xuất video affiliate cho reels, shorts, và các platform ngắn khác. Một click → generate nhiều video variations, optimized cho từng platform, với tracking affiliate real-time.

---

## ✨ Các Features Đã Implement

### 1. **Project & Batch Management** ✅
- Tạo affiliate projects với tùy chỉnh niche, platform target
- Bulk upload 100+ products cùng lúc
- Auto-generate video prompts từ product data
- Flexible affiliate link injection

### 2. **Auto-Subtitle Generation** ✅
- AI-powered subtitles với affiliate keyword emphasis
- Hỗ trợ 4 format: JSON, SRT, VTT, YouTube
- Optimize cho từng platform (Instagram, YouTube, TikTok)
- Add emojis tự động cho social media CTA

### 3. **Smart Content Templates** ✅
- 5+ pre-designed templates per niche (fashion, electronics, general)
- Template details: segments, timing, music recommendations
- Product-specific prompt generation
- Hook-focused structure (3 second rule)

### 4. **Platform-Optimized Metadata** ✅
- Auto-generate titles, descriptions, hashtags per platform
- SEO-optimized keywords (15+ từ khóa)
- Platform-specific guidelines (emoji, hashtag count)
- Affiliate disclosure compliant

### 5. **Multi-Platform Optimizer** ✅
**Một video → 5 platforms cực dễ:**
- Instagram Reels (9:16, 15s optimal)
- YouTube Shorts (9:16, 30s optimal)  
- TikTok (9:16, 9s optimal)
- Facebook (1:1, 15s optimal)
- Twitter (16:9, 30s optimal)

Features:
- Aspect ratio auto-conversion
- Duration optimization
- Resolution & bitrate adjustment
- Upload readiness checklist per platform

### 6. **Video Analytics & Insights** ✅
- Track views, likes, comments, shares per platform
- Monitor affiliate clicks & conversions
- Calculate ROI & revenue metrics
- Generate actionable insights từ performance data
- Identify top performers & optimization opportunities

---

## 🚀 API Reference

### **Base URL:** `/api/affiliate`

### **1. Project Management**

#### Create Project
```javascript
POST /api/affiliate/projects

{
  "name": "Fashion Affiliate Campaign Q1",
  "niche": "fashion",
  "platforms": ["instagram-reels", "youtube-shorts", "tiktok"],
  "affiliateLinks": ["https://amzn.to/...", "https://..."],
  "duration": 15,
  "watermark": "YourBrand.com"
}

Response:
{
  "success": true,
  "projectId": "aff-1771730841383",
  "config": { ...project config }
}
```

#### Add Products to Batch
```javascript
POST /api/affiliate/batches

{
  "projectId": "aff-1771730841383",
  "products": [
    {
      "name": "Premium Fashion Hoodie",
      "url": "https://shop.com/hoodie",
      "category": "Clothing",
      "price": "$49.99",
      "description": "High-quality cotton hoodie",
      "affiliateLink": "https://amzn.to/..."
    },
    // ... more products
  ]
}

Response:
{
  "success": true,
  "batchId": "batch-1771730841388",
  "totalProducts": 5
}
```

---

### **2. Content Generation**

#### Generate Subtitles
```javascript
POST /api/affiliate/subtitles/generate

{
  "videoContext": "Product description and benefits",
  "duration": 15,
  "affiliateKeywords": ["limited offer", "free shipping"],
  "platform": "instagram-reels",
  "format": "srt"  // or "vtt", "json", "youtube"
}

Response:
{
  "success": true,
  "subtitles": [...],
  "format": "srt",
  "metadata": {
    "affiliateTermsUsed": 3,
    "averageSegmentLength": "8"
  }
}
```

#### Get Video Templates
```javascript
GET /api/affiliate/templates?niche=fashion

Response:
{
  "success": true,
  "templates": [
    {
      "id": "fashion-showcase",
      "name": "Fashion Showcase",
      "duration": 15,
      "segments": [...],
      "music": "upbeat-trending"
    }
  ]
}
```

#### Generate Metadata
```javascript
POST /api/affiliate/metadata

{
  "productName": "Premium Fashion Hoodie",
  "category": "Clothing",
  "affiliateKeywords": ["limited", "exclusive"]
}

Response:
{
  "success": true,
  "metadata": {
    "instagram-reels": {
      "title": "🔥 Premium Fashion Hoodie - Must See! 📱",
      "description": "...",
      "hashtags": "15 tags",
      "caption": "..."
    },
    "youtube-shorts": { ... },
    "tiktok": { ... }
  }
}
```

---

### **3. Platform Optimization**

#### Optimize for Single Platform
```javascript
POST /api/affiliate/optimize-platform

{
  "videoPath": "path/to/video.mp4",
  "platform": "youtube-shorts",
  "metadata": { ... }
}

Response:
{
  "success": true,
  "optimization": {
    "platform": "youtube-shorts",
    "config": {
      "aspectRatio": "9:16",
      "duration": 30,
      "resolution": "1080x1920",
      "bitrate": "6000k"
    },
    "modifications": [
      { "type": "aspect-ratio", "from": "16:9", "to": "9:16" },
      // ...
    ]
  }
}
```

#### Optimize for All Platforms
```javascript
POST /api/affiliate/optimize-all-platforms

{
  "videoPath": "path/to/video.mp4",
  "metadata": { ... }
}

Response:
{
  "success": true,
  "summary": {
    "totalPlatforms": 5,
    "successfulAdaptations": 5,
    "failedAdaptations": 0
  },
  "adaptations": ["instagram-reels", "youtube-shorts", "tiktok", ...]
}
```

#### Get Upload Checklist
```javascript
GET /api/affiliate/platform-checklist?platform=youtube-shorts

Response:
{
  "platform": "youtube-shorts",
  "uploadChecklist": [
    { "task": "Video Format", "value": "MP4" },
    { "task": "Aspect Ratio", "value": "9:16" },
    { "task": "Duration", "value": "15-60s" },
    // ...
  ],
  "contentGuidelinesChecklist": [
    { "guideline": "Affiliate links clearly disclosed" },
    // ...
  ]
}
```

---

### **4. Analytics**

#### Record Video Metrics
```javascript
POST /api/affiliate/metrics

{
  "videoId": "video-fashion-hoodie-001",
  "metrics": {
    "views": { "instagram": 24500, "youtube": 18300, "tiktok": 156000 },
    "likes": { "instagram": 2450, "youtube": 1830, "tiktok": 15600 },
    "comments": { "instagram": 321, "youtube": 892, "tiktok": 3400 },
    "shares": { "instagram": 450, "youtube": 620, "tiktok": 2100 },
    "affiliateClicks": 1250,
    "conversions": 87,
    "revenue": 2175.00
  }
}

Response:
{
  "success": true,
  "metrics": { ...full metrics breakdown }
}
```

#### Get Analytics Report
```javascript
GET /api/affiliate/analytics?videoId=video-fashion-hoodie-001

Response:
{
  "success": true,
  "videoId": "video-fashion-hoodie-001",
  "currentMetrics": {
    "totalViews": 198800,
    "totalEngagement": 23000,
    "affiliateClicks": 1250,
    "conversions": 87,
    "estimatedRevenue": "$2175.00"
  },
  "platformBreakdown": {
    "instagram-reels": { ... },
    "youtube-shorts": { ... },
    "tiktok": { ... }
  }
}
```

#### Get Content Insights
```javascript
GET /api/affiliate/insights?batchId=batch-1771730841388

Response:
{
  "success": true,
  "insights": {
    "bestPerformingPlatform": "tiktok",
    "recommendedVideoLength": { ... },
    "contentTips": [
      "Use strong CTAs in first 3 seconds",
      "Emphasize affordability and exclusivity",
      "Show real results/before-after",
      // ...
    ],
    "nextSteps": [
      "Replicate top-performing video style",
      "A/B test different CTAs",
      // ...
    ]
  }
}
```

---

## 📁 Project Structure

```
backend/
├── services/
│   ├── affiliateVideoService.js          # Project & batch management
│   ├── autoSubtitleService.js            # Subtitle generation
│   ├── videoAnalyticsService.js          # Analytics & insights
│   └── platformOptimizer.js              # Multi-platform optimization
├── controllers/
│   └── affiliateVideoController.js       # API endpoints
├── routes/
│   └── affiliateVideoRoutes.js           # Route definitions
├── tests/
│   └── 7-affiliate-complete-demo.js      # Comprehensive demo
└── [other existing services]
```

---

## 💡 Usage Examples

### **Example 1: One-Click Project Setup**
```javascript
// 1. Create project
const project = await affiliateService.createProject({
  name: "Electronics Affiliate 2026",
  niche: "electronics",
  platforms: ["instagram-reels", "youtube-shorts", "tiktok"]
});

// 2. Add products
const batch = await affiliateService.addProductsToBatch(
  project.projectId,
  [
    { name: "Wireless Earbuds", price: "$49.99", ... },
    { name: "Phone Stand", price: "$19.99", ... },
    // ... 100+ more products
  ]
);

// 3. Get subtitles for all products
const subtitles = await subtitleService.generateAffiliateSubtitles(
  "Wireless earbuds with noise cancellation...",
  { platform: "tiktok", duration: 9 }
);

// 4. Get templates & metadata
const templates = affiliateService.getTemplates("electronics");
const metadata = affiliateService.generateMetadata(
  "Wireless Earbuds",
  "Electronics"
);

// 5. Optimize for all platforms
const optimized = platformOptimizer.adaptForAllPlatforms(
  "generated-video.mp4"
);

// 6. Record metrics & get insights
analyticsService.recordVideoMetrics("video-001", { views: {...} });
const insights = analyticsService.getContentInsights("batch-001");
```

### **Example 2: Bulk Processing 100 Products**
```javascript
// Add 100 products → auto-generates video prompts
const batch = await affiliateService.addProductsToBatch(
  projectId,
  productList // 100 items
);

// Each product gets:
// ✓ Unique video prompt (5 variations)
// ✓ Affiliate link assignment
// ✓ Auto-generated metadata
// ✓ Platform optimization queue
```

### **Example 3: Track ROI Per Video**
```javascript
// After 24 hours of posting
analyticsService.recordVideoMetrics("video-hoodie", {
  views: { instagram: 24500, youtube: 18300, tiktok: 156000 },
  affiliateClicks: 1250,
  conversions: 87,
  revenue: 2175.00
});

// Get performance analysis
const report = analyticsService.getLatestMetrics("video-hoodie");
// Shows: engagement rate, conversion rate, ROI by platform
```

---

## 🎯 Use Cases

### **Fashion Niche**
- Product showcase videos
- Unboxing & haul style
- Outfit transformation
- Styling guides

### **Electronics Niche**
- Unboxing & first impressions
- Feature comparisons
- Tech demos
- Lifestyle integration

### **General Products**
- Product spotlight
- Before/after
- Problem/solution format
- Lifestyle integration

---

## 📈 Performance Metrics Tracked

| Metric | Description |
|--------|-------------|
| **Views** | Total views per platform |
| **Engagement Rate** | (likes + comments + shares) / views |
| **Affiliate Clicks** | Click-through to affiliate link |
| **Conversions** | Actual purchases via affiliate link |
| **Conversion Rate** | conversions / clicks |
| **Revenue** | Total affiliate commission |
| **ROI** | Return on investment per platform |
| **Completion Rate** | % of viewers who watched full video |

---

## 🔧 Configuration

### **Niche Configuration**
Tùy chỉnh video template, metadata, keywords cho mỗi niche:
```javascript
// fashion, electronics, beauty, gadgets, home, sports, etc.
affiliateService.getTemplates('fashion')
```

### **Platform Configuration**
Mỗi platform có specs riêng (tự động):
- Aspect ratio, duration tối ưu
- Resolution, bitrate, framerate
- Copyright & music requirements
- Upload size limits

---

## ⚠️ Important Notes

1. **Affiliate Link Disclosure**
   - Tất cả videos tự động include affiliate disclosure
   - Compliant với FTC guidelines
   - Can customize disclosure text

2. **Music & Copyright**
   - Auto-detect platform requirements
   - Recommend licensed music sources
   - TikTok library preferred for TikTok

3. **Conversion Tracking**
   - Use unique affiliate link per video
   - UTM parameters auto-added
   - Real-time conversion reporting

4. **Platform-Specific Tips**
   - **TikTok**: trending sounds, 9-15 seconds optimal
   - **Instagram Reels**: 15-90 seconds, vertical format
   - **YouTube Shorts**: 15-60 seconds, strong SEO
   - **Facebook**: 1:1 ratio, captions required
   - **Twitter**: 16:9 ratio, faster cuts preferred

---

## 🚀 Next Features (Roadmap)

- [ ] Real-time analytics dashboard
- [ ] A/B testing framework
- [ ] Auto video clip extraction (make 1 video → 3 shorts)
- [ ] Multi-language subtitle generation
- [ ] Thumbnail auto-generation
- [ ] Voice-over generation
- [ ] Influencer matching
- [ ] Performance prediction model
- [ ] Auto-reposting scheduler
- [ ] Competitor analysis
- [ ] Trending product detector

---

## 📞 Support

Tất cả files implement đã ready:
- Services: `/backend/services/affiliate*.js`
- API: `/backend/controllers/affiliateVideoController.js`
- Routes: `/backend/routes/affiliateVideoRoutes.js`
- Tests: `/backend/tests/7-affiliate-complete-demo.js`

**Cần thêm gì, báo cho mình!** 🚀
