# API Documentation

Base URL: `http://localhost:5000/api`

---

## Analysis Endpoints

### Get Available Models

```http
GET /ai/models
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "claude-sonnet-4",
        "name": "Claude Sonnet 4",
        "provider": "anthropic",
        "available": true,
        "free": false,
        "priority": 1
      }
    ],
    "total": 10,
    "available": 5
  }
}
```

### Analyze Character Image

```http
POST /ai/analyze-character
Content-Type: multipart/form-data
```

**Body:**
- `image` (file): Character/model image
- `preferredModel` (string, optional): Model ID or "auto"

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": "25 year old East Asian woman with oval face...",
    "modelUsed": "claude-sonnet-4",
    "duration": 12.5,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Analyze Product Image

```http
POST /ai/analyze-product
Content-Type: multipart/form-data
```

**Body:**
- `image` (file): Product/outfit image
- `preferredModel` (string, optional): Model ID or "auto"

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": "Black satin babydoll lingerie set...",
    "modelUsed": "gemini-2.0-flash",
    "duration": 8.2,
    "timestamp": "2024-01-15T10:30:15Z"
  }
}
```

### Build Prompt

```http
POST /ai/build-prompt
Content-Type: application/json
```

**Body:**
```json
{
  "characterAnalysis": "25 year old East Asian woman...",
  "productAnalysis": "Black satin lingerie...",
  "mode": "auto",
  "useCase": "fashion-editorial",
  "userSelections": {
    "scene": "studio",
    "lighting": "natural",
    "mood": "confident",
    "style": "fashion-editorial",
    "colorPalette": "vibrant"
  },
  "customPrompt": "with soft focus background",
  "maxLength": 2000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prompt": "High-fashion editorial photography, 25 year old East Asian woman...",
    "length": 1250,
    "mode": "auto",
    "useCase": "fashion-editorial"
  }
}
```

---

## Prompt Options Endpoints

### Get All Options

```http
GET /prompt-options
```

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": {
    "options": {
      "scene": [
        {
          "value": "studio",
          "label": "Studio (Clean White)",
          "description": "Professional studio with clean white background",
          "isAiGenerated": false,
          "usageCount": 45
        }
      ],
      "lighting": [...],
      "mood": [...],
      "style": [...],
      "colorPalette": [...]
    },
    "total": 53
  }
}
```

### Get Options by Category

```http
GET /prompt-options/:category
```

**Example:**
```http
GET /prompt-options/scene
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "scene",
    "options": [
      {
        "value": "studio",
        "label": "Studio (Clean White)",
        "description": "Professional studio with clean white background",
        "isAiGenerated": false,
        "usageCount": 45
      }
    ],
    "total": 9
  }
}
```

### Add New Option

```http
POST /prompt-options
Content-Type: application/json
```

**Body:**
```json
{
  "category": "scene",
  "value": "underwater",
  "label": "Underwater Scene",
  "description": "Underwater photography setting",
  "metadata": {
    "source": "user-created",
    "addedBy": "user"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "category": "scene",
    "value": "underwater",
    "label": "Underwater Scene",
    "isAiGenerated": false,
    "usageCount": 0
  }
}
```

### Increment Usage

```http
POST /prompt-options/:category/:value/use
```

**Example:**
```http
POST /prompt-options/scene/studio/use
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "scene",
    "value": "studio",
    "usageCount": 46
  }
}
```

### Extract from AI Analysis

```http
POST /prompt-options/ai-extract
Content-Type: application/json
```

**Body:**
```json
{
  "category": "scene",
  "text": "rooftop setting with city views"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "category": "scene",
    "value": "rooftop",
    "label": "Rooftop",
    "isAiGenerated": true
  },
  "created": true
}
```

---

## Image Generation Endpoints

### Get Available Providers

```http
GET /image-gen/providers
```

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "google-labs",
        "name": "Google Labs (Imagen 3)",
        "free": true,
        "requiresAuth": true
      },
      {
        "id": "replicate",
        "name": "Replicate (FLUX)",
        "free": false,
        "requiresAuth": true
      }
    ],
    "total": 6
  }
}
```

### Generate Images

```http
POST /image-gen/generate
Content-Type: multipart/form-data
```

**Body:**
- `prompt` (string): Full prompt
- `negativePrompt` (string, optional): Negative prompt
- `count` (number): Number of images (1, 2, or 4)
- `selectedModel` (string): Provider ID or "auto"
- `characterImage` (file, optional): Character reference
- `productImage` (file, optional): Product reference

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "url": "https://...",
        "provider": "google-labs",
        "index": 0
      }
    ],
    "count": 4,
    "provider": "google-labs",
    "prompt": "High-fashion editorial photography..."
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev mode only)"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

## Rate Limits

### Analysis
- **Anthropic**: 50 requests/minute
- **OpenAI**: 60 requests/minute
- **Gemini**: 60 requests/minute (free tier)
- **Fireworks**: 100 requests/minute

### Image Generation
- **Google Labs**: Manual rate limit (browser-based)
- **Replicate**: Based on plan
- **Fireworks**: 100 requests/minute

---

## Webhooks (Coming Soon)

Subscribe to events:

```http
POST /webhooks/subscribe
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["analysis.complete", "generation.complete"]
}
```

**Events:**
- `analysis.complete` - Analysis finished
- `generation.complete` - Images generated
- `video.complete` - Video created
- `error` - Error occurred

---

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Analyze character
async function analyzeCharacter(imagePath) {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));
  formData.append('preferredModel', 'auto');

  const response = await axios.post(`${API_BASE}/ai/analyze-character`, formData, {
    headers: formData.getHeaders()
  });

  return response.data.data;
}

// Build prompt
async function buildPrompt(characterAnalysis, productAnalysis) {
  const response = await axios.post(`${API_BASE}/ai/build-prompt`, {
    characterAnalysis,
    productAnalysis,
    mode: 'auto',
    useCase: 'fashion-editorial',
    userSelections: {
      scene: 'studio',
      lighting: 'natural',
      mood: 'confident',
      style: 'fashion-editorial',
      colorPalette: 'vibrant'
    }
  });

  return response.data.data.prompt;
}

// Generate images
async function generateImages(prompt) {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('count', '4');
  formData.append('selectedModel', 'auto');

  const response = await axios.post(`${API_BASE}/image-gen/generate`, formData);

  return response.data.data.images;
}
```

### Python

```python
import requests

API_BASE = 'http://localhost:5000/api'

# Analyze character
def analyze_character(image_path):
    with open(image_path, 'rb') as f:
        files = {'image': f}
        data = {'preferredModel': 'auto'}
        response = requests.post(f'{API_BASE}/ai/analyze-character', files=files, data=data)
        return response.json()['data']

# Build prompt
def build_prompt(character_analysis, product_analysis):
    payload = {
        'characterAnalysis': character_analysis,
        'productAnalysis': product_analysis,
        'mode': 'auto',
        'useCase': 'fashion-editorial',
        'userSelections': {
            'scene': 'studio',
            'lighting': 'natural',
            'mood': 'confident',
            'style': 'fashion-editorial',
            'colorPalette': 'vibrant'
        }
    }
    response = requests.post(f'{API_BASE}/ai/build-prompt', json=payload)
    return response.json()['data']['prompt']

# Generate images
def generate_images(prompt):
    data = {
        'prompt': prompt,
        'count': 4,
        'selectedModel': 'auto'
    }
    response = requests.post(f'{API_BASE}/image-gen/generate', data=data)
    return response.json()['data']['images']
```

### cURL

```bash
# Analyze character
curl -X POST http://localhost:5000/api/ai/analyze-character \
  -F "image=@character.jpg" \
  -F "preferredModel=auto"

# Build prompt
curl -X POST http://localhost:5000/api/ai/build-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "characterAnalysis": "25 year old woman...",
    "productAnalysis": "Black dress...",
    "mode": "auto",
    "useCase": "fashion-editorial"
  }'

# Generate images
curl -X POST http://localhost:5000/api/image-gen/generate \
  -F "prompt=Fashion photography..." \
  -F "count=4" \
  -F "selectedModel=auto"
```

---

## Best Practices

### 1. Error Handling
Always wrap API calls in try-catch:

```javascript
try {
  const result = await analyzeCharacter('image.jpg');
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limit - retry after delay
  } else if (error.response?.status === 401) {
    // Invalid API key
  } else {
    // Other error
  }
}
```

### 2. Retries
Implement exponential backoff:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 3. Caching
Cache analysis results:

```javascript
const cache = new Map();

async function analyzeWithCache(imagePath) {
  const hash = await hashFile(imagePath);
  
  if (cache.has(hash)) {
    return cache.get(hash);
  }
  
  const result = await analyzeCharacter(imagePath);
  cache.set(hash, result);
  return result;
}
```

### 4. Batch Processing
Process multiple images:

```javascript
async function batchAnalyze(imagePaths) {
  const results = await Promise.all(
    imagePaths.map(path => analyzeCharacter(path))
  );
  return results;
}
```

---

## Changelog

### v2.1.0 (2024-01-15)
- Added dynamic options system
- Added auto/manual modes
- Added prompt preview
- Added multi-provider support
- Added usage tracking

### v2.0.0 (2024-01-01)
- Complete rewrite
- Multi-model analysis
- Intelligent prompt building
- Database integration

### v1.0.0 (2023-12-01)
- Initial release
- Basic analysis
- Single provider generation
