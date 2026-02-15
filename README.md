# 🎨 AI Fashion Video Generator

> Transform fashion images into stunning AI-generated content with intelligent analysis and multi-provider support.

## ✨ Features

### 🤖 Intelligent AI Analysis
- **Multi-Model Support**: Claude, GPT-4V, Gemini, Fireworks, Z.AI
- **Automatic Fallback**: Tries multiple models if one fails
- **Detailed Extraction**: Age, ethnicity, style, colors, materials, fit
- **Smart Suggestions**: AI recommends optimal settings

### 🎯 Flexible Generation Modes

#### Auto Mode (🤖 AI-Powered)
- AI automatically selects all options
- Hands-off experience
- Optimal for quick results
- Perfect for beginners

#### Manual Mode (✋ Full Control)
- Override any AI suggestion
- Fine-tune every detail
- See AI recommendations with ⭐
- Apply suggestions individually or all at once

### 📊 Dynamic Options System
- **8 Use Cases**: Editorial, E-commerce, Social Media, Lookbook, Campaign, Catalog, Influencer, Advertisement
- **9 Scenes**: Studio, Outdoor, Urban, Indoor, Minimalist, Luxury, Beach, Forest, Rooftop
- **9 Lighting Styles**: Natural, Soft Diffused, Dramatic, Golden Hour, Studio, Backlit, Rim Light, Low Key, High Key
- **9 Moods**: Confident, Elegant, Casual, Energetic, Mysterious, Playful, Romantic, Powerful, Serene
- **9 Photography Styles**: Fashion Editorial, Commercial, Lifestyle, Artistic, Minimalist, Vintage, Street Style, Luxury, Avant-Garde
- **9 Color Palettes**: Vibrant, Pastel, Monochrome, Earth Tones, Bold Contrast, Muted, Neon, Jewel Tones, Neutral

**Growing Database**: New options discovered by AI are automatically saved!

### 🎨 Multi-Provider Image Generation
- **Google Labs Imagen 3** (FREE, high quality)
- **Replicate FLUX** (Best quality, paid)
- **Fireworks AI** (Fast, cheap)
- **Z.AI** (FREE)
- **BytePlus SeeDream** (Supports image input)
- **Hugging Face** (FREE tier)

### 🔍 Advanced Features
- **Prompt Preview**: See full prompt before generation
- **Auto-Shorten**: Automatically shortens if prompt too long
- **Use Case Templates**: Different prompts for different purposes
- **Custom Prompts**: Add your own instructions
- **Logs Sidebar**: Real-time system logs
- **Re-analyze**: Run analysis again with different model

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- At least ONE analysis API key
- At least ONE image generation API key

### 1. Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd fashion-ai-video-generator

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Minimum required
MONGODB_URI=mongodb://localhost:27017/fashion-ai
GOOGLE_API_KEY=your_gemini_key
GOOGLE_LABS_COOKIE=your_google_labs_cookie
```

### 3. Seed Database

```bash
cd backend
npm run seed-options
```

Expected output:
```
✅ Seeding complete!
   Added: 53 options
   Updated: 0 options
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 5. Open Browser

Navigate to `http://localhost:3000`

---

## 📖 Usage Guide

### Basic Workflow

1. **Upload Images**
   - Upload character/model image
   - Upload product/outfit image

2. **Analyze**
   - Select analysis model (or use Auto)
   - Click "Analyze Images with AI"
   - Wait 10-30 seconds

3. **Review & Adjust**
   - See AI suggestions
   - Choose Auto or Manual mode
   - Select use case
   - Adjust options if needed

4. **Generate**
   - Preview prompt
   - Select number of images (1, 2, or 4)
   - Choose image provider
   - Click "Generate Images with AI"
   - Wait 20-60 seconds

5. **Create Video** (Coming soon)
   - Select generated images
   - Choose video style
   - Generate video

### Auto Mode vs Manual Mode

| Feature | Auto Mode | Manual Mode |
|---------|-----------|-------------|
| Speed | ⚡ Fastest | 🐢 Slower |
| Control | ❌ None | ✅ Full |
| AI Suggestions | ✅ Auto-applied | 👁️ Visible with apply buttons |
| Best For | Quick results | Fine-tuning |
| Dropdowns | 🔒 Disabled | ✅ Enabled |

### Use Cases Explained

- **Fashion Editorial**: High-fashion, dramatic, magazine-quality
- **E-commerce**: Clean, product-focused, white background
- **Social Media**: Trendy, engaging, Instagram-ready
- **Lookbook**: Seasonal collection, cohesive style
- **Campaign**: Bold, memorable, brand-aligned
- **Catalog**: Clear, informative, multiple angles
- **Influencer**: Authentic, relatable, lifestyle
- **Advertisement**: Attention-grabbing, polished, commercial

---

## 🔧 Configuration

### Analysis Models Priority

Default priority (automatic fallback):

1. **Claude Sonnet 4** (Best quality, expensive)
2. **GPT-4 Vision** (Good quality, widely available)
3. **Gemini 2.0 Flash** (FREE, fast, good quality)
4. **Fireworks Kimi K2.5** (Fastest, cheap)
5. **Z.AI GLM-5** (FREE, requires login)

### Image Generation Providers

Recommended setup:

```env
# FREE option (requires browser login)
GOOGLE_LABS_COOKIE=your_cookie

# PAID option (best quality)
REPLICATE_API_TOKEN=your_token

# FAST option (cheap)
FIREWORKS_API_KEY=your_key
```

Auto-selection logic:
1. Tries free providers first (Google Labs, Z.AI)
2. Falls back to paid providers if free unavailable
3. Selects fastest available if multiple options

---

## 📊 Database Schema

### PromptOption Model

```javascript
{
  category: String,        // 'scene', 'lighting', 'mood', etc.
  value: String,           // 'studio', 'natural', 'confident'
  label: String,           // 'Studio (Clean White)'
  description: String,    // Detailed description
  isAiGenerated: Boolean,  // true if discovered by AI
  usageCount: Number,      // How many times used
  keywords: [String],      // Search keywords
  metadata: {
    addedBy: String,       // 'system' or 'user'
    source: String,        // 'seed' or 'ai-analysis'
    confidence: Number     // AI confidence score
  }
}
```

### How Dynamic Options Work

1. **Seeding**: Default options loaded from `seedOptions.js`
2. **Analysis**: AI extracts scene/lighting/mood from images
3. **Extraction**: `extractAndSaveOptions()` checks if option exists
4. **Creation**: New options automatically created with `isAiGenerated: true`
5. **Usage**: Every time option used, `usageCount` increments
6. **Sorting**: Options sorted by usage count (most popular first)

Example:
```
Initial: 9 scenes (from seed)
After 10 analyses: 12 scenes (3 new discovered by AI)
After 100 analyses: 18 scenes (9 new, sorted by popularity)
```

---

## 🧪 Testing

### Test Analysis Models

```bash
cd backend

# Test all
npm run test:all

# Test specific
npm run test:gemini
npm run test:fireworks
npm run test:zai
```

### Test Image Generation

```bash
# List available providers
npm run list-models

# Test with sample image
curl -X POST http://localhost:5000/api/image-gen/generate \
  -F "prompt=fashion model in studio" \
  -F "count=1" \
  -F "selectedModel=auto"
```

### Check Database

```bash
# Connect to MongoDB
mongo fashion-ai

# Count options
db.promptoptions.count()

# View by category
db.promptoptions.find({ category: 'scene' })

# View AI-generated
db.promptoptions.find({ isAiGenerated: true })

# View most used
db.promptoptions.find().sort({ usageCount: -1 }).limit(10)
```

---

## 🐛 Troubleshooting

### "No models available"

**Problem**: No analysis models configured

**Solution**:
```bash
# Add at least one API key to .env
GOOGLE_API_KEY=your_key

# Test connection
npm run test:gemini
```

### "No options in dropdown"

**Problem**: Database not seeded

**Solution**:
```bash
cd backend
npm run seed-options
```

### "Analysis failed"

**Possible causes**:
1. Invalid API key → Check `.env`
2. Quota exceeded → Try different model
3. Image too large → Compress to < 10MB
4. Invalid image format → Use JPG/PNG/WEBP

**Solution**:
```bash
# Test specific model
npm run test:gemini

# Check logs
# Open logs sidebar in UI
```

### "Image generation failed"

**Possible causes**:
1. No provider configured → Add API key
2. Quota exceeded → Try different provider
3. Prompt too long → Will auto-shorten
4. Provider timeout → Try again

**Solution**:
```bash
# Check available providers
curl http://localhost:5000/api/image-gen/providers

# Try different provider in UI
```

### "Prompt preview empty"

**Problem**: Analysis not complete

**Solution**:
1. Ensure both images uploaded
2. Click "Analyze Images with AI"
3. Wait for analysis to complete
4. Prompt will auto-build

### "Options not saving"

**Problem**: MongoDB connection issue

**Solution**:
```bash
# Check MongoDB running
systemctl status mongod

# Check connection in server logs
# Should see: "✅ Connected to MongoDB"

# Verify model loaded
mongo fashion-ai
db.promptoptions.count()
```

---

## 📁 Project Structure

```
fashion-ai-video-generator/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   └── aiController.js          # Analysis & prompt building
│   ├── models/
│   │   ├── AnalysisModel.js         # Analysis results
│   │   ├── PromptOption.js          # Dynamic options
│   │   └── GeneratedImage.js        # Generated images
│   ├── routes/
│   │   ├── ai.js                    # Analysis routes
│   │   ├── imageGen.js              # Image generation routes
│   │   ├── promptOptions.js         # Options CRUD
│   │   └── models.js                # Model sync routes
│   ├── services/
│   │   ├── anthropicService.js      # Claude integration
│   │   ├── openaiService.js         # GPT-4V integration
│   │   ├── googleGeminiService.js   # Gemini integration
│   │   ├── fireworksVisionService.js # Fireworks integration
│   │   ├── zaiChatService.js        # Z.AI integration
│   │   ├── promptBuilderService.js  # Intelligent prompt building
│   │   ├── imageGenService.js       # Multi-provider generation
│   │   └── modelSyncService.js      # Model caching
│   ├── test-*.js                    # Test scripts
│   ├── seedOptions.js               # Database seeding
│   ├── server.js                    # Express server
│   ├── package.json
│   ├── .env.example
│   └── SETUP.md
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── UnifiedVideoGeneration.jsx  # Main UI
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/
│   └── package.json
├── README.md
├── QUICKSTART.md
└── TESTING_CHECKLIST.md
```

---

## 🔒 Security Notes

### API Keys
- Never commit `.env` to git
- Use `.env.example` as template
- Rotate keys regularly
- Use separate keys for dev/prod

### File Uploads
- Max file size: 10MB
- Allowed formats: JPG, PNG, WEBP
- Files sanitized (spaces removed)
- Temporary files cleaned up

### Database
- Use authentication in production
- Limit connection pool
- Regular backups
- Monitor disk usage

---

## 🚀 Deployment

### Backend (Node.js)

**Recommended**: Railway, Render, Heroku

```bash
# Build
npm install --production

# Start
npm start
```

Environment variables needed:
- All API keys
- `MONGODB_URI` (use MongoDB Atlas)
- `PORT` (usually auto-set)

### Frontend (React)

**Recommended**: Vercel, Netlify, Cloudflare Pages

```bash
# Build
npm run build

# Output in build/
```

Environment variables:
- `REACT_APP_API_URL` (backend URL)

### Database (MongoDB)

**Recommended**: MongoDB Atlas (free tier available)

1. Create cluster
2. Get connection string
3. Add to `MONGODB_URI`
4. Whitelist deployment IPs

---

## 📈 Performance Tips

### Analysis Speed
- Use Fireworks for fastest results (2-5s)
- Gemini good balance of speed/quality (5-10s)
- Claude best quality but slowest (10-20s)

### Image Generation Speed
- Google Labs: 20-30s per image
- Replicate FLUX: 15-25s per image
- Fireworks: 10-20s per image

### Optimization
- Compress images before upload (< 2MB ideal)
- Use Auto mode for faster workflow
- Generate 2 images instead of 4
- Cache analysis results (coming soon)

---

## 🛣️ Roadmap

### v2.1 (Current)
- ✅ Multi-model analysis
- ✅ Dynamic options
- ✅ Auto/Manual modes
- ✅ Prompt preview
- ✅ Multi-provider generation

### v2.2 (Next)
- [ ] Video generation
- [ ] Batch processing
- [ ] Style transfer
- [ ] Image editing
- [ ] Template library

### v3.0 (Future)
- [ ] User accounts
- [ ] Project management
- [ ] Collaboration features
- [ ] API access
- [ ] Mobile app

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

---

## 📄 License

MIT License - see LICENSE file

---

## 💬 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@example.com

---

## 🙏 Acknowledgments

- **Anthropic** - Claude AI
- **OpenAI** - GPT-4 Vision
- **Google** - Gemini & Imagen
- **Fireworks AI** - Fast inference
- **Replicate** - FLUX models
- **BytePlus** - SeeDream
- **Z.AI** - Free GLM-5

---

## 📊 Stats

- **53+ Options** out of the box
- **6 Analysis Models** supported
- **6 Image Providers** supported
- **8 Use Cases** pre-configured
- **Dynamic Growth** - options expand with use

---

**Made with ❤️ for the fashion AI community**
