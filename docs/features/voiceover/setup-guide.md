# VoiceOver Setup - Package Installation & Verification

## 📦 Required Packages

Two packages need to be installed in the backend:

### 1. **@google/genai** - Google Generative AI SDK
- Provides access to Google Gemini APIs
- Handles TTS streaming and response processing
- Version: Latest stable

### 2. **mime** - MIME Type Library  
- Detects file types from MIME strings
- Used for audio format detection
- Version: Latest stable

---

## 🔧 Installation Steps

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Packages
```bash
npm install @google/genai mime
```

Or install individually:
```bash
npm install @google/genai
npm install mime
```

### Step 3: Verify Installation
```bash
# Check if packages are installed
npm ls @google/genai mime

# Should output:
# backend@2.0.0
# ├── @google/genai@0.x.x
# └── mime@4.x.x
```

### Step 4: Check package.json
Your `backend/package.json` should now include:
```json
{
  "dependencies": {
    "@google/genai": "^0.x.x",
    "mime": "^4.x.x"
  }
}
```

---

## 🌍 Environment Configuration

### Step 1: Create/Edit `.env` File
In the `backend/` directory, create or edit `.env`:

```bash
# Navigate to backend
cd backend

# Create .env file (if not exists)
touch .env  # On macOS/Linux
# or
copy nul .env  # On Windows
```

### Step 2: Add Your Gemini API Key
Open `.env` and add:
```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 3: Get Your Gemini API Key
1. Go to: https://ai.google.dev/
2. Click "Get API Key"
3. Create a new project or select existing
4. Generate API key
5. Copy and paste into `.env`

### Step 4: Verify Environment Variable
```bash
# Check if variable is loaded (backend only reads at startup)
echo $GEMINI_API_KEY  # macOS/Linux
echo %GEMINI_API_KEY%  # Windows
```

---

## 📁 Directory Setup

### Create Media Directory
```bash
# From backend root
mkdir -p media/voiceovers

# Verify it's created
ls -la media/  # macOS/Linux
dir media     # Windows
```

### Set Permissions (Linux/macOS)
```bash
chmod 755 media/voiceovers
```

---

## ✅ Verification Checklist

- [ ] Package installed: `npm ls @google/genai`
- [ ] Package installed: `npm ls mime`
- [ ] `.env` file created in backend directory
- [ ] `GEMINI_API_KEY` added to `.env`
- [ ] `backend/media/voiceovers/` directory exists
- [ ] Backend restarted: `npm run dev`
- [ ] No error messages in console

---

## 🚀 Quick Start After Setup

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```

### 3. Access VoiceOver Page
- URL: http://localhost:5173/voice-over
- Or: Click "Generate" → "VoiceOver" in navbar

### 4. Test Functionality
1. Select voice settings
2. Upload a test video
3. Generate script
4. Generate voiceover
5. Download audio

---

## 🔍 Troubleshooting Installation

### Issue: "npm ERR! 404 Not Found @google/genai"
**Cause**: Package name incorrect or npm cache issue  
**Solution**:
```bash
npm cache clean --force
npm install @google/genai
```

### Issue: "Cannot find module '@google/genai'"
**Cause**: Package not installed or node_modules not in right place  
**Solution**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm install @google/genai mime
```

### Issue: "GEMINI_API_KEY not set error at runtime"
**Cause**: .env file not loaded or key not configured  
**Solution**:
```bash
# Verify .env in backend root
cat backend/.env  # macOS/Linux
type backend\.env  # Windows

# Make sure it contains:
# GEMINI_API_KEY=your_key
```

### Issue: "Cannot connect to media directory"
**Cause**: Directory doesn't exist or permission issues  
**Solution**:
```bash
# Create directory
mkdir -p backend/media/voiceovers

# Check if created
ls -la backend/media/  # macOS/Linux
dir backend\media     # Windows
```

### Issue: Backend crashes with Gemini error
**Cause**: Invalid API key or quota exceeded  
**Solution**:
1. Test API key on https://ai.google.dev/ first
2. Check quota/billing settings
3. Generate new API key if needed

---

## 📋 Version Information

### Recommended Versions
- Node.js: 16.0.0 or higher
- npm: 7.0.0 or higher
- @google/genai: 0.1.0 or higher
- mime: 3.0.0 or higher

### Check Your Versions
```bash
node --version   # Should be v16+
npm --version    # Should be 7+
npm ls @google/genai
npm ls mime
```

---

## 🔐 Security Notes

### Never Commit These Files
```bash
# Add to .gitignore if not already there
backend/.env
backend/.env.local
backend/media/voiceovers/*.wav
backend/media/voiceovers/*.mp3
```

### API Key Safety
- ✅ Store in environment variables
- ✅ Use .env file  
- ✅ Rotate key periodically
- ❌ Never hardcode in source code
- ❌ Never commit to git
- ❌ Never share publicly

---

## 📊 System Requirements

### Minimum
- RAM: 2GB
- Disk Space: 500MB (+ generated audio files)
- Internet: Required (API calls)
- Node.js: 16+

### Recommended
- RAM: 4GB+
- Disk Space: 1GB+
- Internet: Stable connection
- Node.js: 18+ LTS

---

## 🧪 Test API Connection

### Step 1: Create Test File
Create `backend/test-tts-setup.js`:

```javascript
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  console.log('Testing Gemini TTS Setup...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }
  
  console.log('✅ API Key loaded');
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log('✅ GoogleGenAI client initialized');
    
    // Try a simple request
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro-preview-tts',
      config: {
        temperature: 1.1,
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
      },
      contents: [{
        role: 'user',
        parts: [{ text: 'Hello, this is a test.' }],
      }],
    });
    
    console.log('✅ Gemini API responding');
    console.log('\n✨ Setup successful! Ready to use TTS.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testConnection();
```

### Step 2: Run Test
```bash
cd backend
node test-tts-setup.js
```

### Expected Output
```
Testing Gemini TTS Setup...

✅ API Key loaded
✅ GoogleGenAI client initialized
✅ Gemini API responding

✨ Setup successful! Ready to use TTS.
```

---

## 🎯 Next Steps After Setup

1. **Verify Installation**
   - Run test script above
   - Check all ✅ marks

2. **Start Servers**
   - Backend: `npm run dev`
   - Frontend: `npm run dev`

3. **Access Application**
   - Go to http://localhost:5173/voice-over
   - Test voice selection
   - Upload sample video

4. **Generate First Audio**
   - Follow 3-step workflow
   - Monitor console for errors
   - Download generated audio

5. **Troubleshoot if Needed**
   - Check error messages
   - Review console logs
   - Refer to troubleshooting section

---

## 📞 Getting Help

### Check Logs
```bash
# Backend logs show API errors
npm run dev

# Look for:
# - API key errors
# - Connection errors
# - File system errors
```

### Verify Each Component
```bash
# Test API key
echo $GEMINI_API_KEY

# Test file system
ls -la backend/media/voiceovers

# Test Node.js
node --version
npm --version
npm ls @google/genai mime
```

### Reference Files
- `VOICEOVER_QUICK_START.md` - Quick reference
- `VOICEOVER_IMPLEMENTATION_GUIDE.md` - Technical details
- `backend/services/ttsService.js` - Service code

---

## 🎉 You're Ready!

Once you see:
- ✅ Packages installed
- ✅ `.env` configured
- ✅ Directory created
- ✅ Test script passing

**You're all set to use the VoiceOver feature!**

Start with the Quick Start guide and you'll be generating voiceovers in minutes.

---

**Installation Status**: Ready to proceed ✅

Go to `VOICEOVER_QUICK_START.md` for the next steps!
