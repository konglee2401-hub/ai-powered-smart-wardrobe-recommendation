# Image Generation Providers

Complete guide to all supported image generation providers.

## 📊 Overview

Total Providers: **26 models across 11 providers**

### Priority System

- **0-9**: OpenRouter (10 models, 1 API key)
- **10-11**: Google (2 models, free)
- **12-13**: NVIDIA (2 models, free)
- **14-15**: Fireworks AI (2 models, free credits)
- **16-17**: Together AI (2 models, free credits)
- **18-19**: FAL.ai (2 models, free tier)
- **20-21**: Segmind (2 models, free tier)
- **22-23**: DeepInfra (2 models, free tier)
- **24**: Hugging Face (1 model, free)
- **25**: Replicate (1 model, paid)
- **99**: Pollinations (fallback, no key needed)

---

## 🚀 Tier 1: OpenRouter (Priority 0-9)

**Best Option**: 1 API key for 10 models!

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 0 | Flux 1.1 Pro | $0.04 | ⭐⭐⭐⭐⭐ Best |
| 1 | Flux Pro | $0.055 | ⭐⭐⭐⭐⭐ Excellent |
| 2 | Flux Dev | $0.025 | ⭐⭐⭐⭐ Very Good |
| 3 | Flux Schnell | $0.003 | ⭐⭐⭐ Good & Fast |
| 4 | Stable Diffusion 3 | $0.035 | ⭐⭐⭐⭐ Good |
| 5 | SDXL | $0.002 | ⭐⭐⭐ Decent |
| 6 | Ideogram V2 | $0.08 | ⭐⭐⭐⭐ Text rendering |
| 7 | Recraft V3 | $0.05 | ⭐⭐⭐⭐ Vector style |
| 8 | FAL Flux Pro | $0.055 | ⭐⭐⭐⭐ Alternative |
| 9 | FAL Flux Realism | $0.05 | ⭐⭐⭐⭐ Photorealistic |

### Setup

```bash
# Get API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY_1=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...
OPENROUTER_API_KEY_3=sk-or-v1-...
```

### Usage

```javascript
// Auto mode (will use OpenRouter first)
POST /api/generate
{
  "prompt": "A beautiful sunset",
  "provider": "auto"
}

// Specific model
POST /api/generate
{
  "prompt": "A beautiful sunset",
  "provider": "openrouter-flux-1.1-pro"
}
```

---

## 🆓 Tier 2: Google (Priority 10-11)

**Free** with generous limits

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 10 | Gemini 2.0 Flash | FREE | ⭐⭐⭐⭐ Very Good |
| 11 | Imagen 3 | FREE | ⭐⭐⭐⭐⭐ Excellent |

### Setup

```bash
# Get API key from: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY_1=AIza...
GOOGLE_API_KEY_2=AIza...
```

---

## 🎮 Tier 3: NVIDIA (Priority 12-13)

**Free** tier available

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 12 | SDXL | FREE | ⭐⭐⭐ Good |
| 13 | Stable Diffusion 3 | FREE | ⭐⭐⭐⭐ Very Good |

### Setup

```bash
# Get API key from: https://build.nvidia.com/
NVIDIA_API_KEY_1=nvapi-...
NVIDIA_API_KEY_2=nvapi-...
```

---

## 🔥 Tier 4: Fireworks AI (Priority 14-15)

**Free credits** on signup

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 14 | Stable Diffusion 3 | FREE | ⭐⭐⭐⭐ Very Good |
| 15 | Playground v2.5 | FREE | ⭐⭐⭐⭐ Good |

### Setup

```bash
# Get API key from: https://fireworks.ai/
FIREWORKS_API_KEY_1=...
FIREWORKS_API_KEY_2=...
```

---

## 🤝 Tier 5: Together AI (Priority 16-17)

**Free credits** on signup

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 16 | Flux Schnell | FREE | ⭐⭐⭐ Good |
| 17 | SDXL | FREE | ⭐⭐⭐ Good |

### Setup

```bash
# Get API key from: https://api.together.xyz/
TOGETHER_API_KEY_1=...
TOGETHER_API_KEY_2=...
```

---

## 🌟 Tier 6: FAL.ai (Priority 18-19)

**Free tier** available

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 18 | Flux Pro | FREE | ⭐⭐⭐⭐ Very Good |
| 19 | Flux Realism | FREE | ⭐⭐⭐⭐ Photorealistic |

### Setup

```bash
# Get API key from: https://fal.ai/dashboard/keys
FAL_API_KEY_1=...
FAL_API_KEY_2=...
```

---

## 🎨 Tier 7: Segmind (Priority 20-21)

**Free tier** available

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 20 | Stable Diffusion 3 | FREE | ⭐⭐⭐⭐ Very Good |
| 21 | SDXL | FREE | ⭐⭐⭐ Good |

### Setup

```bash
# Get API key from: https://www.segmind.com/
SEGMIND_API_KEY_1=...
SEGMIND_API_KEY_2=...
```

---

## 🚀 Tier 8: DeepInfra (Priority 22-23)

**Free tier** available

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 22 | SDXL | FREE | ⭐⭐⭐ Good |
| 23 | Flux Schnell | FREE | ⭐⭐⭐ Good |

### Setup

```bash
# Get API key from: https://deepinfra.com/
DEEPINFRA_API_KEY_1=...
DEEPINFRA_API_KEY_2=...
```

---

## 🤗 Tier 9: Hugging Face (Priority 24)

**Free** with rate limits

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 24 | Flux Schnell | FREE | ⭐⭐⭐ Good |

### Setup

```bash
# Get API key from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY_1=hf_...
HUGGINGFACE_API_KEY_2=hf_...
```

---

## 🔷 Tier 10: Replicate (Priority 25)

**Paid** but has free credits

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 25 | Flux Pro | $0.055 | ⭐⭐⭐⭐⭐ Excellent |

### Setup

```bash
# Get API key from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN_1=r8_...
REPLICATE_API_TOKEN_2=r8_...
```

---

## 🌸 Fallback: Pollinations (Priority 99)

**No API key needed** - automatic fallback

### Models

| Priority | Model | Cost | Quality |
|----------|-------|------|---------|
| 99 | Flux | FREE | ⭐⭐ Basic |

**No setup required** - works automatically when all other providers fail.

---

## 🔧 Multi-Key Setup

All providers support multiple API keys for:
- **Rate limiting**: Distribute requests across keys
- **High volume**: Handle more requests
- **Reliability**: Fallback if one key fails

### Example

```bash
# Add multiple keys with _1, _2, _3 suffix
OPENROUTER_API_KEY_1=sk-or-v1-key1...
OPENROUTER_API_KEY_2=sk-or-v1-key2...
OPENROUTER_API_KEY_3=sk-or-v1-key3...

GOOGLE_API_KEY_1=AIza-key1...
GOOGLE_API_KEY_2=AIza-key2...
```

System will automatically rotate between keys (round-robin).

---

## 📊 Testing

### Test all providers

```bash
npm run test:keys
```

### Test specific provider

```bash
npm run test:keys openrouter-flux-1.1-pro
```

---

## 🎯 Recommended Setup

### Minimum (Free)

```bash
OPENROUTER_API_KEY_1=...  # 10 models
GOOGLE_API_KEY_1=...      # 2 models
NVIDIA_API_KEY_1=...      # 2 models
```

Total: **14 models with 3 API keys**

### Recommended (Free + Credits)

```bash
OPENROUTER_API_KEY_1=...  # 10 models
GOOGLE_API_KEY_1=...      # 2 models
NVIDIA_API_KEY_1=...      # 2 models
FIREWORKS_API_KEY_1=...   # 2 models
TOGETHER_API_KEY_1=...    # 2 models
FAL_API_KEY_1=...         # 2 models
```

Total: **20 models with 6 API keys**

### Maximum (All Free)

```bash
OPENROUTER_API_KEY_1=...  # 10 models
GOOGLE_API_KEY_1=...      # 2 models
NVIDIA_API_KEY_1=...      # 2 models
FIREWORKS_API_KEY_1=...   # 2 models
TOGETHER_API_KEY_1=...    # 2 models
FAL_API_KEY_1=...         # 2 models
SEGMIND_API_KEY_1=...     # 2 models
DEEPINFRA_API_KEY_1=...   # 2 models
HUGGINGFACE_API_KEY_1=... # 1 model
```

Total: **25 models with 9 API keys** (all free!)

---

## 🚀 Usage Examples

### Auto Mode (Recommended)

```javascript
// Will try providers in priority order
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    provider: 'auto',
    count: 1
  })
});
```

### Specific Provider

```javascript
// Use specific provider
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    provider: 'openrouter-flux-1.1-pro',
    count: 1
  })
});
```

### Batch Generation

```javascript
// Generate multiple images
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over mountains',
    provider: 'auto',
    count: 4
  })
});
```

---

## 🔍 Get Available Providers

```javascript
const response = await fetch('/api/image/providers');
const data = await response.json();

console.log('Total providers:', data.stats.total);
console.log('Free providers:', data.stats.free);
console.log('Available providers:', data.stats.available);
```

---

## 📈 Provider Statistics

Each provider tracks:
- Usage count
- Success count
- Failure count
- Average response time
- Last used timestamp

View in database or through API.

---

## 🛠️ Troubleshooting

### Provider not working?

1. Check API key is set correctly in `.env`
2. Run test script: `npm run test:keys provider-id`
3. Check API key validity on provider's website
4. Check rate limits

### All providers failing?

1. Check internet connection
2. Verify at least one API key is configured
3. System will automatically fallback to Pollinations

### Slow generation?

1. Use faster models (Flux Schnell, SDXL)
2. Add more API keys for load distribution
3. Use providers with lower priority (faster)

---

## 📝 Notes

- **Priority 0 = Highest priority** (tried first)
- **Priority 99 = Lowest priority** (fallback)
- System automatically tries next provider if one fails
- Pollinations is always available as ultimate fallback
- Multi-key support for all providers
- Round-robin key rotation for load balancing

---

## 🔗 Links

- [OpenRouter](https://openrouter.ai/)
- [Google AI Studio](https://makersuite.google.com/)
- [NVIDIA NIM](https://build.nvidia.com/)
- [Fireworks AI](https://fireworks.ai/)
- [Together AI](https://api.together.xyz/)
- [FAL.ai](https://fal.ai/)
- [Segmind](https://www.segmind.com/)
- [DeepInfra](https://deepinfra.com/)
- [Hugging Face](https://huggingface.co/)
- [Replicate](https://replicate.com/)
- [Pollinations](https://pollinations.ai/)
