# VoiceOver TTS Integration - Implementation Guide

## 📦 Overview

Complete Google Gemini TTS (Text-to-Speech) integration for the Smart Wardrobe application. This system generates professional voiceovers for fashion videos with support for multiple platforms, voices, languages, and styles.

## 🏗️ Architecture

### Frontend Structure
```
frontend/src/
├── pages/
│   └── VoiceOverPage.jsx                    # Main 3-step flow page
├── components/
│   ├── VoiceSettings.jsx                    # Left sidebar voice config
│   ├── VideoUploadStep.jsx                  # Step 1: Upload videos
│   ├── ScriptGenerationStep.jsx             # Step 2: ChatGPT script gen
│   └── AudioGenerationStep.jsx              # Step 3: TTS audio gen
├── services/
│   └── ttsService.js                        # Frontend API wrapper
└── constants/
    └── voiceOverOptions.js                  # Voices, styles, settings
```

### Backend Structure
```
backend/
├── services/
│   └── ttsService.js                        # Gemini TTS integration
├── controllers/
│   └── ttsController.js                     # API request handlers
└── routes/
    └── ttsRoutes.js                         # API endpoints
```

## 🚀 Key Features

### 1. **Voice Settings (Left Sidebar)**
- **Gender Selection**: Male/Female voices
- **Language Options**: Vietnamese (default), English
- **Reading Styles**:
  - TikTok Bán Hàng (Sales) - 15-30s, energetic
  - Facebook Reels Lồng Tiếng - 20-40s, storytelling
  - YouTube Short Vietsub - 30-60s, educational
  - Instagram Stories - 10-20s, conversational
  - Custom Style - User-defined requirements

### 2. **Voice Library (8 Google Gemini Voices)**

**Male Voices:**
- Puck: Young, energetic (sales, promotions)
- Charon: Deep, authoritative (premium products)
- Fenrir: Smooth, calm (educational content)
- Kore: Warm, friendly (casual, lifestyle)

**Female Voices:**
- Aoede: Energetic, youthful (fashion, TikTok)
- Breeze: Soft, soothing (luxury, wellness)
- Juniper: Bright, cheerful (fun, enthusiastic)
- Sage: Professional, clear (tutorials, serious)
- Ember: Warm, confident (testimonials, storytelling)

### 3. **Three-Step Flow**

**Step 1: Video Upload**
- Upload up to 5 videos (max 100MB each)
- Optional product image (max 10MB)
- Supported formats: MP4, MOV, AVI, MKV, WebM

**Step 2: Script Generation**
- ChatGPT analyzes videos
- Generates platform-specific scripts
- Script matches video length
- Editable script before proceeding
- Character/word count statistics
- Estimated duration in seconds

**Step 3: Audio Generation**
- TTS converts script to audio
- Real-time audio preview
- Download MP3/WAV
- Batch generation support (future)

### 4. **Additional Features**
- Real-time duration estimation
- Script editing with live stats
- Audio preview player
- One-click download
- Product metadata (name, description)
- Progress tracking
- Toast notifications

## 🔌 API Endpoints

### TTS Routes (`/api/tts`)

```
POST   /generate                    # Stream audio to client
POST   /generate-and-save          # Generate & save file
GET    /stream/:filename           # Stream saved audio
GET    /download/:filename         # Download saved audio
POST   /analyze-and-script         # ChatGPT analysis
POST   /estimate-duration          # Duration estimation
```

## 📋 Installation & Setup

### 1. Install Dependencies

**Backend:**
```bash
npm install @google/genai mime
```

**Frontend:**
Already included in existing dependencies (axios, toast, etc.)

### 2. Environment Variables

Add to `.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Create Required Directories

```bash
mkdir -p backend/media/voiceovers
```

### 4. Update Server Registration

✅ Already done in `backend/server.js`:
```javascript
import ttsRoutes from './routes/ttsRoutes.js';
app.use('/api/tts', ttsRoutes);
```

### 5. Update Routes in App.jsx

✅ Already done in `frontend/src/App.jsx`:
```javascript
<Route path="/voice-over" element={
  <div className="h-screen flex flex-col bg-gray-900">
    <Navbar />
    <div className="flex-1 overflow-hidden">
      <VoiceOverPage />
    </div>
  </div>
} />
```

### 6. Update Navbar Navigation

✅ Already done in `frontend/src/components/Navbar.jsx`:
- Added Volume2 icon import
- Added VoiceOver link to Generate submenu

## 🎯 Usage Flow

### User Perspective

1. **Select Voice Settings** (Left Sidebar)
   - Choose gender (Male/Female)
   - Select language (Vietnamese/English)
   - Pick reading style (TikTok/Facebook/YouTube/Instagram)
   - Choose voice based on characteristics

2. **Upload Videos** (Step 1)
   - Click upload area or drag-drop videos
   - Optionally add product image
   - Click "Continue"

3. **Generate Script** (Step 2)
   - Click "Generate Script"
   - ChatGPT analyzes videos
   - Script appears, can be edited
   - Shows stats (characters, words, duration)
   - Click "Continue to Audio Generation"

4. **Generate Audio** (Step 3)
   - Reviews script, voice, language settings
   - Shows estimated duration
   - Click "Generate Voiceover"
   - Audio generates and appears in player
   - Preview or download

### Developer API Usage

**Generate Audio:**
```javascript
const response = await ttsAPI.generateAndSaveAudio(
  text,
  'Aoede',
  'voiceover.wav',
  { language: 'VI' }
);
```

**Estimate Duration:**
```javascript
const result = await ttsAPI.estimateDuration(text);
console.log(result.duration); // in seconds
```

**Stream Audio:**
```javascript
const url = ttsAPI.streamAudio('voiceover.wav');
<audio src={url} controls />
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (VoiceOverPage)                                    │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Left Sidebar:  VoiceSettings (Gender, Language, Voice)  ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Step 1: VideoUploadStep (Upload videos + product image) ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Step 2: ScriptGenerationStep (ChatGPT analysis)         ││
│ │         → API: /api/v1/browser-automation              ││
│ │         → Returns: script text                          ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Step 3: AudioGenerationStep (TTS conversion)            ││
│ │         → API: /api/tts/generate-and-save              ││
│ │         → Returns: audio file + URL                     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (ttsController + ttsService)                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Generate audio via Google Gemini API                    ││
│ │ - Validate text length (max 10,000 chars)              ││
│ │ - Call Gemini TTS with voice config                    ││
│ │ - Save to backend/media/voiceovers/                    ││
│ │ - Return file path + stream URL                        ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Stream Audio:                                            ││
│ │ - GET /api/tts/stream/:filename                        ││
│ │ - Returns: audio/wav buffer                             ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing

### Manual Testing

1. **Navigate to VoiceOver Page**
   - Go to http://localhost:5173/voice-over
   - Should see VoiceSettings on left
   - Should see Step 1 content in center

2. **Test Voice Settings**
   - Select different genders
   - Voices should filter correctly
   - Language selection should update

3. **Test Video Upload**
   - Upload test video (sample.mp4)
   - Upload product image (optional)
   - Verify file size/format validation

4. **Test Script Generation**
   - Click "Generate Script"
   - Wait for ChatGPT response
   - Verify script appears with stats
   - Edit script and save

5. **Test Audio Generation**
   - Click "Generate Voiceover"
   - Monitor for errors
   - Wait for TTS to complete
   - Test audio player
   - Test download

### Environment Setup for Testing

```bash
# Ensure GEMINI_API_KEY is set
export GEMINI_API_KEY=your_key

# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
```

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not set"
**Solution**: Add to .env file in backend directory

### Issue: "No audio data received"
**Solution**: 
- Check API key validity
- Verify text is not empty
- Check text length (max 10,000 chars)
- Review browser console for errors

### Issue: **"Failed to parse script from ChatGPT"
**Solution**:
- Verify video format is supported
- Check browser automation service is running
- Check ChatGPT session is active

### Issue: Audio file not downloading
**Solution**:
- Verify backend/media/voiceovers/ directory exists
- Check file write permissions
- Ensure disk space available

## 📈 Performance Optimization

### Implemented
- Chunked text processing for long scripts
- Streaming audio responses
- Client-side validation before API calls
- Efficient file naming with timestamps

### Recommended Enhancements
1. **Batch Processing**: Generate multiple voiceovers in queue
2. **Audio Caching**: Store frequently used scripts
3. **Pre-processing**: Extract audio from videos upfront
4. **Compression**: Convert WAV to MP3 automatically
5. **Background Tasks**: Use job queue for long-running audio gen

## 📚 Files Created/Modified

### New Files Created
✅ `frontend/src/pages/VoiceOverPage.jsx`
✅ `frontend/src/components/VoiceSettings.jsx`
✅ `frontend/src/components/VideoUploadStep.jsx`
✅ `frontend/src/components/ScriptGenerationStep.jsx`
✅ `frontend/src/components/AudioGenerationStep.jsx`
✅ `frontend/src/services/ttsService.js`
✅ `frontend/src/constants/voiceOverOptions.js`
✅ `backend/services/ttsService.js`
✅ `backend/controllers/ttsController.js`
✅ `backend/routes/ttsRoutes.js`

### Files Modified
✅ `backend/server.js` - Added TTS routes import & registration
✅ `frontend/src/App.jsx` - Added VoiceOverPage import & route
✅ `frontend/src/components/Navbar.jsx` - Added VoiceOver navigation link

## 🎨 UI/UX Design Details

### Color Scheme (Consistent with existing system)
- Primary: Amber/Orange (#F59E0B, #EA580C)
- Secondary: Purple (#9333EA)
- Success: Green (#16A34A)
- Background: Gray (#111827, #1F2937)

### Layout
- Left Sidebar: 288px (fixed)
- Main Area: Flexible
- Responsive: Collapses to mobile-friendly on small screens

### Icons Used
- Volume2, Music, Play, Pause, Download (lucide-react)
- All consistent with existing component library

## 🔐 Security Considerations

1. **API Key Management**
   - Store GEMINI_API_KEY securely in environment variables
   - Never commit to version control
   - Rotate key periodically

2. **File Handling**
   - Validate file types and sizes
   - Sanitize filenames
   - Clean up temporary files

3. **Input Validation**
   - Text length limits
   - File format validation
   - Script content filtering (optional)

## 📞 Support & Documentation

### API Documentation
- TTS endpoints: `backend/routes/ttsRoutes.js`
- Controller logic: `backend/controllers/ttsController.js`
- Service layer: `backend/services/ttsService.js`

### Frontend Components
- Component props documented in each file
- Constants exported from `voiceOverOptions.js`
- Service methods documented in `ttsService.js`

### Examples
See usage examples in component files for props and API calls

## 🚢 Deployment

### Environment Variables
```
GEMINI_API_KEY=xxx
REACT_APP_API_URL=http://your-backend:5000 (optional)
```

### Directory Permissions
```bash
chmod -R 755 backend/media/voiceovers/
```

### Nginx Configuration (if using)
```nginx
location /api/tts/stream {
    proxy_pass http://localhost:5000;
    proxy_set_header Content-Type audio/wav;
}
```

## 📋 Future Enhancements

1. **Batch Management**
   - Generate multiple voiceovers at once
   - Queue management
   - Progress tracking

2. **Audio Effects**
   - Background music mixing
   - Volume normalization
   - Fade in/out effects

3. **Advanced Features**
   - Custom voice training
   - Accent/dialect selection
   - Voice cloning
   - Multiple language mixing

4. **Integration**
   - Direct video embedding
   - Auto-sync with video timeline
   - Export to common formats (MP3, M4A, OGG)

5. **Analytics**
   - Track generated voiceovers
   - Performance metrics
   - Usage statistics

## ✅ Checklist

- [x] TTS service backend created
- [x] TTS API endpoints implemented
- [x] Frontend TTS service wrapper created
- [x] Voice options/constants defined
- [x] VoiceOverPage main component
- [x] VoiceSettings component (left sidebar)
- [x] VideoUploadStep component
- [x] ScriptGenerationStep component
- [x] AudioGenerationStep component
- [x] Routes added to App.jsx
- [x] Navigation links added to Navbar
- [x] Server.js updated with TTS routes
- [x] Implementation guide created

---

**Version**: 1.0  
**Last Updated**: February 24, 2026  
**Status**: Ready for Testing & Deployment
