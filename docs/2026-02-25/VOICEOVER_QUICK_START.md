# VoiceOver Implementation - Quick Start & Setup

## 🎯 What Was Built

A complete **Google Gemini TTS (Text-to-Speech) Integration** for voiceover generation in your Smart Wardrobe application. This system allows users to upload videos, generate scripts via ChatGPT, and create professional Vietnamese/English voiceovers.

## 📂 File Structure Created

### Frontend Components (5 new components)
```
frontend/src/components/
├── VoiceSettings.jsx               # Voice selection sidebar
├── VideoUploadStep.jsx             # Step 1: Upload videos
├── ScriptGenerationStep.jsx        # Step 2: ChatGPT analysis
└── AudioGenerationStep.jsx         # Step 3: TTS audio generation
```

### Frontend Pages (1 new page)
```
frontend/src/pages/
└── VoiceOverPage.jsx               # Main 3-step container
```

### Frontend Services & Constants
```
frontend/src/
├── services/
│   └── ttsService.js               # API client wrapper
└── constants/
    └── voiceOverOptions.js         # Voice options, styles, settings
```

### Backend Services, Controllers, Routes
```
backend/
├── services/
│   └── ttsService.js               # Gemini TTS integration
├── controllers/
│   └── ttsController.js            # API handlers
└── routes/
    └── ttsRoutes.js                # API endpoints (/api/tts)
```

## 🔧 Required Setup

### 1. Install Google Genai Package (Backend)
```bash
cd backend
npm install @google/genai mime
```

### 2. Add Environment Variable
In `backend/.env`, add:
```
GEMINI_API_KEY=your_actual_gemini_api_key
```

Get your key from: https://ai.google.dev/

### 3. Create Media Directory
```bash
mkdir -p backend/media/voiceovers
```

### 4. Restart Backend Server
```bash
cd backend
npm run dev
```

## 🚀 Using the VoiceOver Page

### Access the Page
- **URL**: http://localhost:5173/voice-over
- **Navigation**: Click "Generate" → "VoiceOver" in navbar

### Three-Step Workflow

#### **Step 1: Upload Videos**
1. Select videos from your computer (max 5 videos, 100MB each)
2. Optionally upload a product image
3. Click "Continue"

#### **Step 2: Generate Script**
1. ChatGPT analyzes your videos
2. Generates a platform-specific script
3. Review/edit the script
4. Click "Continue to Audio Generation"

#### **Step 3: Generate Audio**
1. Review voice, language settings
2. Click "Generate Voiceover"
3. Wait for audio to generate
4. Preview in player or download

## 🎙️ Voice Options

### Genders
- 👨 **Nam (Male)**
- 👩 **Nữ (Female)**

### Languages
- 🇻🇳 **Tiếng Việt** (Vietnamese, default)
- 🇬🇧 **Tiếng Anh** (English)

### Reading Styles
1. **TikTok Bán Hàng** - 📱 Energetic, 15-30s
2. **Facebook Reels Lồng Tiếng** - 🎬 Professional storytelling, 20-40s
3. **YouTube Short Vietsub** - ▶️ Clear, educational, 30-60s
4. **Instagram Stories** - ✨ Conversational, 10-20s
5. **Custom Style** - 🎯 Your own requirements

### Available Voices (Google Gemini)

**Male Voices:**
- **Puck**: Young, energetic (sales)
- **Charon**: Deep, authoritative (premium)
- **Fenrir**: Smooth, calm (educational)
- **Kore**: Warm, friendly (casual)

**Female Voices:**
- **Aoede**: Energetic, youthful (TikTok)
- **Breeze**: Soft, soothing (luxury)
- **Juniper**: Bright, cheerful (fun)
- **Sage**: Professional, clear (tutorials)
- **Ember**: Warm, confident (testimonials)

## 🔌 API Endpoints

All endpoints are at `/api/tts`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate` | Generate audio, stream to client |
| POST | `/generate-and-save` | Generate & save audio file |
| GET | `/stream/:filename` | Stream saved audio |
| GET | `/download/:filename` | Download audio file |
| POST | `/estimate-duration` | Estimate audio duration from text |
| POST | `/analyze-and-script` | ChatGPT video analysis (future) |

## 📝 Example API Usage

### Generate Audio (in your code)
```javascript
import ttsAPI from './services/ttsService';

// Generate and save
const response = await ttsAPI.generateAndSaveAudio(
  "Áo này rất đẹp, phải có luôn!",
  "Aoede",  // voice name
  "voiceover.wav",
  { language: 'VI' }
);

// Stream audio in player
<audio src={ttsAPI.streamAudio(response.fileName)} controls />
```

### Estimate Duration
```javascript
const result = await ttsAPI.estimateDuration(scriptText);
console.log(`Estimated duration: ${result.duration}s`);
```

## 📂 File Upload Limits

- **Videos**: Max 5 files, 100MB each, MP4/MOV/AVI/MKV/WebM
- **Product Image**: Optional, Max 10MB, JPG/PNG/WebP

## 🐛 Troubleshooting

### "GEMINI_API_KEY not set"
→ Add `GEMINI_API_KEY` to `backend/.env`

### "No audio data received"
→ Check:
- API key is valid
- Text is not empty
- Text is less than 10,000 characters
- Browser console for errors

### "Backend returning 404"
→ Verify:
- Backend is running (`npm run dev`)
- TTS routes are imported in `server.js`
- Port is correct (default: 5000)

### Audio not downloading
→ Check:
- `backend/media/voiceovers/` directory exists
- Directory has write permissions
- Disk has free space

## 🎨 UI Layout

```
┌─────────────────┬─────────────────────────────────────┐
│                 │                                     │
│  Voice Settings │     Step Content                    │
│  (Left Sidebar) │     (VideoUploadStep /              │
│                 │      ScriptGenerationStep /         │
│  • Gender       │      AudioGenerationStep)           │
│  • Language     │                                     │
│  • Reading Style│                                     │
│  • Voice        │                                     │
│                 │                                     │
│  • Gender       │     Navigation Footer               │
│    Preview      │     [Previous]  [Step X of 3]       │
│                 │                                     │
└─────────────────┴─────────────────────────────────────┘
```

## 🔄 Data Flow

1. **User selects voice settings** → Stored in state
2. **User uploads videos** → Stored as File objects with preview URLs
3. **User clicks "Generate Script"** → ChatGPT analyzes via browser automation
4. **Script displayed** → User can edit
5. **User clicks "Generate Voiceover"** → TTS API processes script
6. **Audio returned** → Player displays, download available

## 💡 Tips & Best Practices

1. **Script Length**: Keep scripts under 60 seconds for natural pacing
2. **Product Context**: Add product image for better script generation
3. **Platform Selection**: Choose style matching your video platform
4. **Voice Testing**: Preview a test script first with each voice
5. **Batch Processing**: Future update will support multiple videos at once

## 📊 Performance Notes

- Audio generation typically takes 5-15 seconds
- Duration estimation uses average speaking rate: 150 words/min
- Files stored in `backend/media/voiceovers/` for quick access
- Maximum text length: 10,000 characters (auto-chunks if needed)

## 🔐 Security

- **Keep API Key Safe**: Never commit .env file
- **File Validation**: All uploads validated on server
- **Input Sanitization**: Script text length limits enforced
- **Temporary Storage**: Cleanup can be configured

## 📱 Mobile Support

- Responsive design for tablets
- Touch-friendly buttons
- Optimized file uploads
- Works on mobile browsers (tested on Chrome, Safari)

## 🚀 Performance Optimization Ideas (Future)

1. **Batch Generation**: Queue multiple scripts
2. **Audio Caching**: Store frequently generated scripts
3. **MP3 Conversion**: Auto-convert WAV to smaller MP3
4. **Background Jobs**: Async TTS processing
5. **Progress Indicators**: Real-time generation status

## 📞 Support

### Documentation Files
- `VOICEOVER_IMPLEMENTATION_GUIDE.md` - Full technical guide
- This file - Quick start

### Code References
- Component props documented in each React file
- API client methods documented in `ttsService.js`
- Backend controller methods in `ttsController.js`

## ✅ What's Working

- ✅ Voice selection interface
- ✅ Video/image upload with validation
- ✅ TTS audio generation (Gemini API)
- ✅ Audio preview player
- ✅ Audio downloading
- ✅ Duration estimation
- ✅ Script editing
- ✅ Platform-specific script templates
- ✅ Responsive UI
- ✅ Navigation integration

## 📋 Next Steps (Optional Enhancements)

1. **Add Batch Processing**: Generate multiple voiceovers in queue
2. **Integrate Video Timeline**: Sync voiceover with video duration
3. **Add Audio Effects**: Background music, fade in/out
4. **Export Formats**: MP3, M4A, OGG conversion
5. **Analytics Dashboard**: Track generated voiceovers
6. **Voice Cloning**: Custom voice models (advanced)

## 🎓 Learning Resources

- [Google Gemini TTS Docs](https://ai.google.dev/api/rest/v1beta/models/generateContent)
- [React Audio API](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide React Icons](https://lucide.dev)

---

**Happy voiceover generating!** 🎙️✨

Need help? Check VOICEOVER_IMPLEMENTATION_GUIDE.md for technical details.
