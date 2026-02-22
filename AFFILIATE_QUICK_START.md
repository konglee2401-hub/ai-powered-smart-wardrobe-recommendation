# 🎬 Affiliate Video System - Quick Start (5 minutes)

## **Step 1: Create Your First Affiliate Project**

```bash
curl -X POST http://localhost:5000/api/affiliate/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Affiliate Campaign",
    "niche": "fashion",
    "platforms": ["instagram-reels", "youtube-shorts", "tiktok"],
    "affiliateLinks": [
      "https://amzn.to/my-affiliate-link"
    ],
    "duration": 15
  }'
```

**Response:**
```json
{
  "success": true,
  "projectId": "aff-1771730841383"
}
```

Save this `projectId` - bạn sẽ dùng nó ở bước tiếp theo!

---

## **Step 2: Upload Products for Video Generation**

```bash
curl -X POST http://localhost:5000/api/affiliate/batches \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "aff-1771730841383",
    "products": [
      {
        "name": "Premium Fashion Hoodie",
        "url": "https://shop.example.com/hoodie",
        "category": "Clothing",
        "price": "$49.99",
        "description": "High-quality cotton hoodie perfect for casual wear",
        "affiliateLink": "https://amzn.to/hoodie"
      },
      {
        "name": "Designer Sunglasses",
        "url": "https://shop.example.com/sunglasses",
        "category": "Accessories",
        "price": "$89.99",
        "description": "UV protection designer sunglasses",
        "affiliateLink": "https://amzn.to/sunglasses"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch-1771730841388",
  "totalProducts": 2
}
```

✅ **Now bạn có:**
- 2 products ready for videos
- Auto-generated video prompts
- Affiliate links assigned
- Ready to generate content!

---

## **Step 3: Get Video Templates**

```bash
curl http://localhost:5000/api/affiliate/templates?niche=fashion
```

**Response:**
```json
{
  "templates": [
    {
      "id": "fashion-showcase",
      "name": "Fashion Showcase",
      "duration": 15,
      "segments": [
        { "time": "0-2s", "action": "Hook shot - product reveal" },
        { "time": "2-6s", "action": "Close-up details and features" },
        { "time": "6-10s", "action": "Worn/styled demonstration" },
        { "time": "10-14s", "action": "Final reveal with CTA" },
        { "time": "14-15s", "action": "Affiliate link callout" }
      ]
    }
  ]
}
```

---

## **Step 4: Generate Auto-Subtitles**

```bash
curl -X POST http://localhost:5000/api/affiliate/subtitles/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoContext": "Premium Fashion Hoodie - High-quality cotton, perfect for casual wear, limited time offer",
    "duration": 15,
    "affiliateKeywords": ["limited offer", "exclusive", "free shipping"],
    "platform": "instagram-reels",
    "format": "srt"
  }'
```

**Response:**
```json
{
  "success": true,
  "subtitles": [
    { "index": 1, "startTime": 0, "endTime": 3, "text": "👀 CHECK THIS OUT", "isAffiliateTerm": true },
    { "index": 2, "startTime": 3, "endTime": 6, "text": "🔥 EXCLUSIVE DEAL", "isAffiliateTerm": true },
    { "index": 3, "startTime": 6, "endTime": 9, "text": "💰 LIMITED TIME", "isAffiliateTerm": true },
    // ...
  ],
  "format": "srt",
  "content": "1\n00:00:00,000 --> 00:00:03,000\n👀 CHECK THIS OUT\n\n2\n..."
}
```

---

## **Step 5: Get Platform-Optimized Metadata**

```bash
curl -X POST http://localhost:5000/api/affiliate/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Premium Fashion Hoodie",
    "category": "Clothing",
    "affiliateKeywords": ["limited", "exclusive", "casual"]
  }'
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "instagram-reels": {
      "title": "🔥 Premium Fashion Hoodie - Must See! 📱",
      "description": "Premium Fashion Hoodie just changed the game! 🚀\n\nBest Clothing of the year?...",
      "hashtags": "#clothing #affiliate #sponsored #productdemo #shorts #yt-shorts...",
      "caption": "Premium Fashion Hoodie just changed the game! 🚀\n\nBest Clothing of the year? You decide!"
    },
    "youtube-shorts": { /* optimized for YouTube */ },
    "tiktok": { /* optimized for TikTok */ }
  }
}
```

---

## **Step 6: Optimize Video for All Platforms**

```bash
curl -X POST http://localhost:5000/api/affiliate/optimize-all-platforms \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath": "generated-video.mp4",
    "metadata": {"productName": "Premium Fashion Hoodie"}
  }'
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalPlatforms": 5,
    "successfulAdaptations": 5,
    "failedAdaptations": 0
  },
  "adaptations": [
    "instagram-reels",
    "youtube-shorts", 
    "tiktok",
    "facebook",
    "twitter"
  ]
}
```

✅ **1 video → 5 platform-optimized versions ready!**

---

## **Step 7: Check Upload Requirements**

```bash
curl "http://localhost:5000/api/affiliate/platform-checklist?platform=youtube-shorts"
```

**Response:**
```json
{
  "platform": "youtube-shorts",
  "uploadChecklist": [
    { "task": "Video Format", "value": "MP4", "status": "pending" },
    { "task": "Aspect Ratio", "value": "9:16", "status": "pending" },
    { "task": "Duration", "value": "15-60s (optimal: 30s)", "status": "pending" },
    { "task": "Resolution", "value": "1080x1920", "status": "pending" },
    { "task": "File Size", "value": "Max: 256MB", "status": "pending" }
  ],
  "contentGuidelinesChecklist": [
    { "guideline": "Affiliate links clearly disclosed", "status": "pending" },
    { "guideline": "Strong opening hook (first 3 seconds)", "status": "pending" }
  ]
}
```

---

## **Step 8: Track Performance & Get Insights**

### Record Metrics (after 24 hours of posting)
```bash
curl -X POST http://localhost:5000/api/affiliate/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "video-hoodie-001",
    "metrics": {
      "views": {
        "instagram": 24500,
        "youtube": 18300,
        "tiktok": 156000
      },
      "likes": {
        "instagram": 2450,
        "youtube": 1830,
        "tiktok": 15600
      },
      "comments": {
        "instagram": 321,
        "youtube": 892,
        "tiktok": 3400
      },
      "shares": {
        "instagram": 450,
        "youtube": 620,
        "tiktok": 2100
      },
      "affiliateClicks": 1250,
      "conversions": 87,
      "revenue": 2175.00
    }
  }'
```

### Get Performance Report
```bash
curl "http://localhost:5000/api/affiliate/analytics?videoId=video-hoodie-001"
```

**Response:**
```json
{
  "success": true,
  "currentMetrics": {
    "totalViews": 198800,
    "totalEngagement": 23000,
    "affiliateClicks": 1250,
    "conversions": 87,
    "estimatedRevenue": "$2175.00"
  },
  "platformBreakdown": {
    "instagram-reels": {
      "views": 24500,
      "engagement": "10.28%",
      "clicks": 245
    },
    "youtube-shorts": {
      "views": 18300,
      "engagement": "9.48%",
      "clicks": 183
    },
    "tiktok": {
      "views": 156000,
      "engagement": "11.41%",
      "clicks": 822
    }
  }
}
```

### Get Content Insights
```bash
curl "http://localhost:5000/api/affiliate/insights?batchId=batch-1771730841388"
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "bestPerformingPlatform": "tiktok",
    "contentTips": [
      "Use strong CTAs in first 3 seconds",
      "Emphasize affordability and exclusivity",
      "Show real results/before-after",
      "Include trending music/sounds",
      "End with clear affiliate link instruction"
    ],
    "nextSteps": [
      "Replicate top-performing video style",
      "A/B test different CTAs",
      "Optimize posting times",
      "Increase budget for high-ROI platforms",
      "Create series from best performers"
    ]
  }
}
```

---

## 📊 Complete Flow Overview

```
1. Create Project → 2. Upload Products → 3. Get Templates
                               ↓
4. Generate Subtitles → 5. Generate Metadata → 6. Optimize for All Platforms
                               ↓
7. Post to Each Platform → 8. Track Metrics → 9. Get Insights & Scale
```

---

## 🎯 Next Actions

After Step 8, bạn sẽ biết:
- ✅ Which platform performs best (highest engagement, most conversions)
- ✅ Which video style works (template comparison)
- ✅ Optimal posting time
- ✅ Best affiliate keywords
- ✅ ROI per platform

**Then scale:**
- Repurpose top-performing content
- A/B test different CTAs
- Increase budget for best performers
- Create product series
- Test new niches

---

## 💡 Pro Tips

1. **Post to TikTok first** (trending + viral potential)
2. **Repurpose across platforms** (1 video → 5 optimized versions)
3. **Post 1-2 videos per day** (algorithm loves consistency)
4. **Track metrics daily** (first 7 days critical)
5. **A/B test CTAs** ("Click link" vs "Shop now" vs "Link in bio")
6. **Use trending sounds** (especially for TikTok)
7. **Strong opening hook** (first 3 seconds are critical)
8. **Clear affiliate link** (disclosure required by FTC)

---

## ⚡ Troubleshooting

**Q: Subtitles not generating?**
- Make sure Anthropic API key is set
- Will use fallback subtitles if API fails

**Q: Video not optimized?**
- Check video format is MP4
- Ensure video path is correct

**Q: No conversion tracking?**
- Use unique affiliate link per video
- Add UTM parameters

---

**Ready to scale affiliate videos? Go to Step 1! 🚀**
