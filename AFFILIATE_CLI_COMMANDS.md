# 🎯 Affiliate Video System - CLI Command Reference

## **⚡ Super Quick Commands (Copy & Paste)**

### **1. Create Project**
```bash
curl -X POST http://localhost:5000/api/affiliate/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Campaign","niche":"fashion","platforms":["instagram-reels","youtube-shorts","tiktok"]}'
```
💾 **Save the `projectId` from response!**

---

### **2. Bulk Upload Products (100+ supported)**
```bash
curl -X POST http://localhost:5000/api/affiliate/batches \
  -H "Content-Type: application/json" \
  -d '{
    "projectId":"YOUR_PROJECT_ID",
    "products":[
      {"name":"Product 1","url":"https://...","category":"Fashion","price":"$49.99"},
      {"name":"Product 2","url":"https://...","category":"Fashion","price":"$79.99"}
    ]
  }'
```
💾 **Save the `batchId` from response!**

---

### **3. Get Templates**
```bash
curl http://localhost:5000/api/affiliate/templates?niche=fashion
```
**Supported niches:** `fashion`, `electronics`, `general`

---

### **4. Generate Subtitles (with fallback)**
```bash
curl -X POST http://localhost:5000/api/affiliate/subtitles/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoContext":"Product description here",
    "duration":15,
    "affiliateKeywords":["limited","exclusive","free shipping"],
    "platform":"instagram-reels",
    "format":"srt"
  }'
```
**Formats:** `srt`, `vtt`, `youtube`, `social-media`

---

### **5. Generate Platform Metadata**
```bash
curl -X POST http://localhost:5000/api/affiliate/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "productName":"My Product",
    "category":"Fashion",
    "affiliateKeywords":["limited","exclusive"]
  }'
```
**Optimized for:** Instagram, YouTube, TikTok, Facebook, Twitter

---

### **6. Optimize Video for 1 Platform**
```bash
curl -X POST http://localhost:5000/api/affiliate/optimize-platform \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath":"video.mp4",
    "platform":"youtube-shorts",
    "metadata":{"productName":"My Product"}
  }'
```
**Platforms:** `instagram-reels`, `youtube-shorts`, `tiktok`, `facebook`, `twitter`

---

### **7. Optimize Video for ALL Platforms (1 video → 5 versions)**
```bash
curl -X POST http://localhost:5000/api/affiliate/optimize-all-platforms \
  -H "Content-Type: application/json" \
  -d '{
    "videoPath":"video.mp4",
    "metadata":{"productName":"My Product"}
  }'
```
✅ **Returns 5 platform-optimized versions**

---

### **8. Check Platform Requirements**
```bash
curl "http://localhost:5000/api/affiliate/platform-checklist?platform=youtube-shorts"
```
**View:** Technical specs + upload checklist

---

### **9. Record Video Metrics**
```bash
curl -X POST http://localhost:5000/api/affiliate/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "videoId":"video-001",
    "metrics":{
      "views":{"instagram":1000,"youtube":800,"tiktok":5000},
      "likes":{"instagram":100,"youtube":80,"tiktok":500},
      "affiliateClicks":125,
      "conversions":8,
      "revenue":200.00
    }
  }'
```

---

### **10. Get Video Analytics**
```bash
curl "http://localhost:5000/api/affiliate/analytics?videoId=video-001"
```
**Shows:** Views, engagement rate, clicks, conversions, revenue per platform

---

### **11. Get Batch Report**
```bash
curl "http://localhost:5000/api/affiliate/batches/YOUR_BATCH_ID/report"
```
**Shows:** Total metrics, top performers, ROI summary

---

### **12. Get Actionable Insights**
```bash
curl "http://localhost:5000/api/affiliate/insights?batchId=YOUR_BATCH_ID"
```
**Shows:** Best platform, content tips, next steps, growth recommendations

---

### **13. List All Platforms**
```bash
curl http://localhost:5000/api/affiliate/platforms
```
**Returns:** Specs for all 5 supported platforms

---

## 📋 **API Endpoint Quick Reference**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/projects` | Create affiliate campaign |
| POST | `/batches` | Bulk upload products |
| POST | `/subtitles/generate` | Auto-generate captions |
| GET | `/templates` | Get video templates |
| POST | `/metadata` | Generate platform metadata |
| GET | `/batches/:batchId/report` | Batch status & metrics |
| POST | `/metrics` | Record performance data |
| GET | `/analytics` | Get video performance |
| GET | `/insights` | Get optimization tips |
| POST | `/optimize-platform` | Optimize for 1 platform |
| POST | `/optimize-all-platforms` | Optimize for all 5 platforms |
| GET | `/platform-checklist` | Upload requirements |
| GET | `/platforms` | List all platforms |

---

## 🚀 **Real Workflow Example**

### **Scenario: Upload 3 products and track performance**

```bash
#!/bin/bash

# Step 1: Create project
PROJECT=$(curl -s -X POST http://localhost:5000/api/affiliate/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Fashion Affiliate","niche":"fashion","platforms":["tiktok","instagram-reels"]}' | jq -r '.projectId')

echo "✅ Project created: $PROJECT"

# Step 2: Upload products
BATCH=$(curl -s -X POST http://localhost:5000/api/affiliate/batches \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\":\"$PROJECT\",
    \"products\":[
      {\"name\":\"Hoodie\",\"url\":\"https://shop.com/hoodie\",\"category\":\"Clothing\",\"price\":\"\$49.99\"},
      {\"name\":\"Jeans\",\"url\":\"https://shop.com/jeans\",\"category\":\"Clothing\",\"price\":\"\$79.99\"},
      {\"name\":\"Shoes\",\"url\":\"https://shop.com/shoes\",\"category\":\"Footwear\",\"price\":\"\$99.99\"}
    ]
  }" | jq -r '.batchId')

echo "✅ Batch created: $BATCH with 3 products"

# Step 3: Get templates
curl -s http://localhost:5000/api/affiliate/templates?niche=fashion | jq '.templates[]'

# Step 4: Record metrics after 24 hours
curl -s -X POST http://localhost:5000/api/affiliate/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "videoId":"hoodie-video-001",
    "metrics":{
      "views":{"tiktok":45000,"instagram":8500},
      "likes":{"tiktok":4500,"instagram":255},
      "affiliateClicks":320,
      "conversions":22,
      "revenue":550.00
    }
  }' | jq '.success'

# Step 5: Get insights
curl -s "http://localhost:5000/api/affiliate/insights?batchId=$BATCH" | jq '.insights'

echo "✅ Workflow complete!"
```

**Save this as `workflow.sh` and run:**
```bash
chmod +x workflow.sh
./workflow.sh
```

---

## 📊 **Data Structure Examples**

### **Product Entry**
```json
{
  "name": "Premium Fashion Hoodie",
  "url": "https://shop.example.com/hoodie",
  "category": "Clothing",
  "price": "$49.99",
  "description": "High-quality cotton hoodie",
  "affiliateLink": "https://amzn.to/hoodie",
  "imageUrl": "https://...",
  "tags": ["casual", "comfortable", "limited"]
}
```

### **Metrics Object**
```json
{
  "views": {
    "instagram": 1000,
    "youtube": 800,
    "tiktok": 5000
  },
  "likes": {
    "instagram": 100,
    "youtube": 80,
    "tiktok": 500
  },
  "comments": {
    "instagram": 50,
    "youtube": 40,
    "tiktok": 200
  },
  "shares": {
    "instagram": 25,
    "youtube": 20,
    "tiktok": 150
  },
  "affiliateClicks": 125,
  "conversions": 8,
  "revenue": 200.00
}
```

### **Platform Metadata Response**
```json
{
  "instagram-reels": {
    "title": "🔥 Product Name - Amazing Deal! 📱",
    "description": "Product description...",
    "hashtags": "#product #fashion #affiliate...",
    "caption": "Check out this amazing product..."
  },
  "youtube-shorts": {
    "title": "New Product Review - Don't Miss!",
    "description": "Review and affiliate link...",
    "hashtags": "#review #product #shorts...",
    "caption": "Full details in the link!"
  },
  "tiktok": {
    "title": "OMG This Product 🤩",
    "description": "You need to see this!",
    "hashtags": "#foryoupage #trending #product...",
    "caption": "Link in bio!"
  }
}
```

---

## 🔧 **Advanced: Bash Functions**

Add these to your `.bashrc` or `.zshrc`:

```bash
# Create affiliate project
affiliate-project() {
  local name="$1"
  local niche="${2:-fashion}"
  curl -X POST http://localhost:5000/api/affiliate/projects \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"niche\":\"$niche\",\"platforms\":[\"tiktok\",\"instagram-reels\",\"youtube-shorts\"]}"
}

# Bulk upload products
affiliate-upload() {
  local project_id="$1"
  local products="$2"
  curl -X POST http://localhost:5000/api/affiliate/batches \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"$project_id\",\"products\":$products}"
}

# Get templates
affiliate-templates() {
  curl http://localhost:5000/api/affiliate/templates?niche="${1:-fashion}"
}

# Get insights
affiliate-insights() {
  local batch_id="$1"
  curl "http://localhost:5000/api/affiliate/insights?batchId=$batch_id"
}

# Then use:
# affiliate-project "My Campaign" "fashion"
# affiliate-templates "electronics"
```

---

## ✅ **Validation Checklist**

Before posting videos:
- [ ] Affiliate links are unique per video (for tracking)
- [ ] Subtitles match product duration
- [ ] Metadata generated for all platforms
- [ ] Video optimized for each platform
- [ ] Upload checklist completed
- [ ] Affiliate disclosure clear
- [ ] Opening hook is strong (3s)
- [ ] CTA is clear and compelling

---

## 🎯 **Success Metrics Target**

| Metric | Target | Action |
|--------|--------|--------|
| Engagement Rate | 5-10% | Optimize CTA |
| Click-Through Rate | 2-5% | Improve affiliate link visibility |
| Conversion Rate | 5-15% | Test different CTAs |
| ROI | 3-5x+ | Scale best performers |
| TikTok Focus | 60%+ views | Prioritize TikTok uploads |

---

## 🚀 **Next Level: Scheduled Uploads**

```bash
# Post video daily at 8 AM (using cron)
0 8 * * * /path/to/workflow.sh
```

**Your affiliate empire scales automatically!** 🎬💰

---

## 📞 **Need Help?**

Check logs:
```bash
tail -f logs/affiliate-system.log
```

Run demo:
```bash
node tests/7-affiliate-complete-demo.js
```

View full API docs:
```bash
cat AFFILIATE_VIDEO_SYSTEM.md
```
