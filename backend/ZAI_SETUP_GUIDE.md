# 🎨 Z.AI Vision API Setup Guide

Z.AI provides **FREE** vision models for image analysis through their OpenAPI platform.

## ✅ Why Use Z.AI Vision?

- **FREE**: GLM-4.6V-Flash is completely FREE
- **HIGH QUALITY**: Professional-grade vision analysis
- **FAST**: ~2-3 seconds per image
- **OCR SUPPORT**: Built-in OCR capability
- **MULTI-LANGUAGE**: Supports Chinese and English

## 📋 Available Models

### 1. GLM-4.6V-Flash (FREE) ⚡
- **Priority**: 8
- **Speed**: Very fast
- **Cost**: $0 (completely free)
- **Best for**: Quick vision analysis, OCR
- **Context**: 128K tokens
- **Output**: 4K tokens
- **Features**: Vision, OCR, Fast

### 2. GLM-4.6V (PAID) 🎯
- **Priority**: 20
- **Speed**: Fast
- **Cost**: $0.3 input / $0.9 output per 1M tokens
- **Best for**: Advanced vision analysis with reasoning
- **Context**: 128K tokens
- **Output**: 4K tokens
- **Features**: Vision, OCR, Reasoning

### 3. GLM-4.5V (PAID) 💎
- **Priority**: 21
- **Speed**: Moderate
- **Cost**: $0.6 input / $1.8 output per 1M tokens
- **Best for**: Premium vision analysis
- **Context**: 128K tokens
- **Output**: 4K tokens
- **Features**: Vision, OCR, Advanced Reasoning

### 4. GLM-5 (PAID) 🚀
- **Priority**: 25
- **Speed**: Moderate
- **Cost**: $1.0 input / $3.2 output per 1M tokens
- **Best for**: Complex analysis with thinking capability
- **Context**: 128K tokens
- **Output**: 8K tokens
- **Features**: Vision, Reasoning, Thinking, Most Advanced

## 📝 Setup Instructions

### Step 1: Create Z.AI Account

1. Visit https://open.bigmodel.cn
2. Click "Sign Up" (register)
3. Verify your email

### Step 2: Get API Key

1. Login to https://open.bigmodel.cn
2. Go to **API Keys** section
3. Click **"Create New API Key"**
4. Copy the API key (format: `xxx.yyy`)

### Step 3: Add to .env

Open `backend/.env` and add:

```env
# Single key
ZAI_API_KEY=your_api_key_here

# Or multiple keys for load balancing
ZAI_API_KEY_1=xxx.yyy
ZAI_API_KEY_2=aaa.bbb
ZAI_API_KEY_3=ccc.ddd
```

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

### Step 5: Test

```bash
cd backend
npm run test:zai
```

## 🔄 Rate Limits

- **FREE Tier**: Generous limits
- **Rate Limit Handling**: System auto-rotates keys
- **Multi-key Support**: Up to 10 keys per provider

## 🎯 Usage in App

Once configured, Z.AI will be available as:

**Z.AI GLM-4.6V-Flash** (Priority 8 - FREE)

in the vision analysis fallback chain.

## 🔐 Security Notes

- **Keep your API key private** - don't share it
- **Don't commit** `.env` to Git
- API keys can be regenerated if compromised

## 💡 Tips

- Use **GLM-4.6V-Flash** for FREE analysis
- Supports **detailed prompts** in Chinese or English
- Works great for **character analysis**
- Excellent **OCR** for text in images

## ❓ Troubleshooting

### Error: "Z.AI API key not configured"

- Make sure `ZAI_API_KEY` or `ZAI_API_KEY_1` is in `.env`
- Check that the value is complete
- Restart backend after adding

### Error: "Invalid API key"

- Verify your API key at https://open.bigmodel.cn
- Check if your account is active
- Generate a new key if needed

### Error: "Rate limit exceeded"

- Wait a moment and retry
- Add more API keys for load balancing
- System will auto-rotate to next available key

### Error: "Model not found"

- Use correct model names:
  - `glm-4v-flash` (FREE)
  - `glm-4v` (PAID)
  - `glm-4v-plus` (PAID)
  - `glm-5` (PAID)

## 🚀 Ready to Use!

Once configured, Z.AI provides **FREE** vision analysis with:

- Character recognition
- Clothing analysis
- OCR text extraction
- Style detection
- Color analysis

Enjoy FREE professional-grade vision analysis! 🎉
