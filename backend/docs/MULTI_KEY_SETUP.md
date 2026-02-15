# Multi-Key API Configuration Guide

## Overview
This system supports multiple API keys per provider for automatic failover and rate limit handling.

## Supported Providers

### 1. Z.AI (FREE)
- **Models**: GLM-4.6V-Flash (FREE Vision), GLM-4.6V, GLM-4.5V, GLM-5
- **Free Tier**: GLM-4.6V-Flash is completely FREE
- **Multi-account**: Supported
- **Get API Key**: https://open.bigmodel.cn

### 2. NVIDIA NIM (FREE)
- **Models**: Llama 3.2 11B/90B Vision, Phi-3.5 Vision
- **Free Credits**: $10/month per account
- **Multi-account**: Supported
- **Get API Key**: https://build.nvidia.com

### 3. Groq (FREE)
- **Models**: Llama 3.2 11B/90B Vision
- **Free Tier**: 14,400 requests/day per account
- **Multi-account**: Supported
- **Get API Key**: https://console.groq.com

### 4. Mistral AI (TRIAL)
- **Models**: Pixtral 12B, Pixtral Large
- **Trial Credits**: €5 per account
- **Multi-account**: Supported
- **Get API Key**: https://console.mistral.ai

### 5. Anthropic (PAID)
- **Models**: Claude 3.5 Sonnet, Opus, Haiku
- **Multi-account**: Supported for load balancing
- **Get API Key**: https://console.anthropic.com

### 6. OpenAI (PAID)
- **Models**: GPT-4o, GPT-4 Vision
- **Multi-account**: Supported for load balancing
- **Get API Key**: https://platform.openai.com

### 7. Google (PAID)
- **Models**: Gemini 2.5/1.5 Flash/Pro
- **Multi-account**: Supported for load balancing
- **Get API Key**: https://aistudio.google.com

## Configuration

### .env Format
```env
# Provider with 3 accounts
PROVIDER_API_KEY_1=key1
PROVIDER_API_KEY_2=key2
PROVIDER_API_KEY_3=key3

# Up to 10 keys supported
PROVIDER_API_KEY_10=key10
```

### Example Configuration
```env
# Z.AI - 3 accounts
ZAI_API_KEY_1=xxx.yyy
ZAI_API_KEY_2=aaa.bbb
ZAI_API_KEY_3=ccc.ddd

# NVIDIA - 5 accounts
NVIDIA_API_KEY_1=nvapi-xxx
NVIDIA_API_KEY_2=nvapi-yyy
NVIDIA_API_KEY_3=nvapi-zzz
NVIDIA_API_KEY_4=nvapi-aaa
NVIDIA_API_KEY_5=nvapi-bbb

# Groq - 3 accounts
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_yyy
GROQ_API_KEY_3=gsk_zzz

# Mistral - 2 accounts
MISTRAL_API_KEY_1=xxx
MISTRAL_API_KEY_2=yyy

# Anthropic - 2 accounts
ANTHROPIC_API_KEY_1=sk-ant-xxx
ANTHROPIC_API_KEY_2=sk-ant-yyy

# OpenAI - 2 accounts
OPENAI_API_KEY_1=sk-xxx
OPENAI_API_KEY_2=sk-yyy

# Google - 2 accounts
GOOGLE_API_KEY_1=AIzaSyxxx
GOOGLE_API_KEY_2=AIzaSyyyy
```

## How It Works

### 1. Round-Robin Selection
Keys are selected in rotation:
```
Request 1 → Key 1
Request 2 → Key 2
Request 3 → Key 3
Request 4 → Key 1 (cycle repeats)
```

### 2. Automatic Failover
When a key hits rate limit:
```
Request → Key 1 (rate limited) → Auto switch to Key 2
```

### 3. Temporary Lockout
Rate-limited keys are locked for 60 seconds:
```
Key 1: Rate limited at 10:00 → Available again at 10:01
```

### 4. Statistics Tracking
System tracks:
- Total requests per key
- Failure count per key
- Last used timestamp
- Availability status

## Getting Multiple API Keys

### Z.AI
1. Visit https://open.bigmodel.cn
2. Sign up with different emails
3. Get API key from each account
4. Add to .env as ZAI_API_KEY_1, ZAI_API_KEY_2, etc.

### NVIDIA NIM
1. Visit https://build.nvidia.com
2. Sign up with different emails
3. Each account gets $10/month free
4. Get API key from each account
5. Add to .env as NVIDIA_API_KEY_1, NVIDIA_API_KEY_2, etc.

### Groq
1. Visit https://console.groq.com
2. Sign up with different emails
3. Each account gets 14,400 requests/day
4. Get API key from each account
5. Add to .env as GROQ_API_KEY_1, GROQ_API_KEY_2, etc.

### Mistral
1. Visit https://console.mistral.ai
2. Sign up with different emails
3. Each account gets €5 trial credits
4. Get API key from each account
5. Add to .env as MISTRAL_API_KEY_1, MISTRAL_API_KEY_2, etc.

## Testing

### Test All Providers
```bash
npm run test:all
```

### Test Specific Provider
```bash
npm run test:nvidia
npm run test:mistral
npm run test:groq
npm run test:zai
```

### View Key Statistics
Start server and upload an image. Console will show:
```
📊 API KEY STATISTICS
================================================================================

🔑 NVIDIA
   Total keys: 5
   Available: 5
   Rate limited: 0
   ✅ NVIDIA_API_KEY_1: 10 requests, 0 failures
   ✅ NVIDIA_API_KEY_2: 8 requests, 0 failures
   ✅ NVIDIA_API_KEY_3: 12 requests, 1 failures
   ✅ NVIDIA_API_KEY_4: 5 requests, 0 failures
   ✅ NVIDIA_API_KEY_5: 3 requests, 0 failures
```

## Best Practices

### 1. Prioritize FREE Providers
Configure multiple accounts for:
- Groq (highest priority for free)
- NVIDIA (good free credits)
- Z.AI (generous free tier)

### 2. Use Paid as Fallback
Keep 1-2 paid keys for critical requests:
- Claude 3.5 Sonnet (best quality)
- GPT-4o (reliable)

### 3. Monitor Usage
Check key statistics regularly to:
- Identify rate-limited keys
- Balance load across accounts
- Replace expired trial credits

### 4. Rotate Accounts
For trial-based providers (Mistral):
- Create new accounts when credits expire
- Add new keys to .env
- Remove old keys

## Troubleshooting

### All Keys Rate Limited
**Symptom**: "All XXX API keys are rate limited"

**Solution**:
1. Wait 60 seconds for automatic reset
2. Add more API keys from new accounts
3. Switch to different provider

### Key Not Working
**Symptom**: "Invalid API key"

**Solution**:
1. Check key is correct in .env
2. Verify account is active
3. Check if trial credits expired
4. Generate new key if needed

### Uneven Load Distribution
**Symptom**: Some keys used more than others

**Solution**:
- System uses round-robin automatically
- This is normal and expected
- Keys will balance over time

## Cost Optimization Strategy

### Maximize FREE Usage
```
Priority 1-7: Paid models (for quality)
Priority 8-9: FREE models (Z.AI)
Priority 10-11: FREE models (Groq)
Priority 12-14: FREE models (NVIDIA)
Priority 15-16: Trial models (Mistral)
Priority 17-19: Other Gemini models
Priority 25: Paid fallback (Z.AI GLM-5)
```

### Monthly Budget Example
With 5 accounts per FREE provider:
- Groq: 5 × 14,400 = 72,000 requests/day (FREE)
- NVIDIA: 5 × $10 = $50/month (FREE credits)
- Z.AI: Unlimited (FREE with rate limits)
- **Total: ~2M requests/month for FREE**

### Paid Fallback
Only use paid models when:
- All FREE keys exhausted
- Require highest quality
- Critical production requests

## Provider Priority Order

| Priority | Provider | Model | Pricing |
|----------|----------|-------|---------|
| 1 | Anthropic | Claude 3.5 Sonnet | $3.00/M tokens |
| 2 | OpenAI | GPT-4o | $5.00/M tokens |
| 3 | Anthropic | Claude 3 Opus | $15.00/M tokens |
| 4 | OpenAI | GPT-4 Vision | $10.00/M tokens |
| 5 | Anthropic | Claude 3 Haiku | $0.25/M tokens |
| 6 | Google | Gemini 2.5 Flash | $0.075/M tokens |
| 7 | Google | Gemini 2.5 Pro | $1.25/M tokens |
| 8 | Z.AI | GLM-4.6V-Flash | **FREE** |
| 9 | Groq | Llama 3.2 11B Vision | FREE |
| 10 | Groq | Llama 3.2 90B Vision | FREE |
| 11 | NVIDIA | Llama 3.2 11B Vision | FREE |
| 12 | NVIDIA | Llama 3.2 90B Vision | FREE |
| 13 | NVIDIA | Phi-3.5 Vision | FREE |
| 14 | Mistral | Pixtral 12B | $0.15/M tokens |
| 15 | Mistral | Pixtral Large | $2.00/M tokens |
| 16 | Google | Gemini 3.0 Flash | $0.10/M tokens |
| 17 | Google | Gemini 1.5 Pro | $1.25/M tokens |
| 18 | Google | Gemini 1.5 Flash | $0.075/M tokens |
| 20 | Z.AI | GLM-4.6V | $0.3/M tokens |
| 21 | Z.AI | GLM-4.5V | $0.6/M tokens |
| 25 | Z.AI | GLM-5 | $1.0/M tokens |

## Support
- Issues: Create GitHub issue
- Docs: See /docs folder
- Examples: See /tests folder
