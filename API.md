# 📚 API Documentation

Smart Fashion Prompt Builder - Complete API Reference

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Request/Response Format](#requestresponse-format)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)
8. [Webhooks](#webhooks)

---

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.fashionpromptbuilder.com/api
```

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

**Future Implementation:**
- API Key authentication
- OAuth 2.0 support
- JWT tokens

---

## Request/Response Format

### Request Headers

```
Content-Type: application/json
Accept: application/json
```

### Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Endpoints

### 1. Health Check

Check if the API is running and healthy.

**Endpoint:** `GET /health`

**Request:**
```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

**Status Codes:**
- `200 OK` - Server is healthy
- `503 Service Unavailable` - Server is down

---

### 2. Generate Prompt

Generate a fashion photography prompt from user inputs.

**Endpoint:** `POST /api/generate-prompt`

**Request Body:**
```json
{
  "age": "20-30",
  "gender": "female",
  "style": "elegant",
  "colors": "white and black",
  "material": "silk blend",
  "setting": "studio",
  "mood": "elegant"
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "A vibrant female model, age 20-30, wearing elegant evening wear in white and black silk blend. The luxurious drape of the fabric creates a sophisticated silhouette. Studio setting with professional lighting. The mood is elegant and refined. High resolution, professional studio lighting, perfect composition, fashion editorial style.",
  "stats": {
    "characters": 287,
    "words": 52,
    "sentences": 4,
    "paragraphs": 1
  },
  "useCase": "elegantEvening",
  "message": "Prompt generated successfully"
}
```

**Parameters:**

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| age | string | Yes | 18-25, 25-30, 30-40, 40-50, 50+ |
| gender | string | Yes | male, female, non-binary |
| style | string | Yes | casual, formal, elegant, sporty, vintage, luxury, bohemian, minimalist, edgy |
| colors | string | Yes | vibrant, monochrome, pastel, jewel tones, earth tones, white and black |
| material | string | Yes | silk blend, cotton, wool, leather, linen, polyester |
| setting | string | Yes | studio, beach, office, urban, gym, nature |
| mood | string | Yes | playful, serious, romantic, energetic, calm, elegant |

**Status Codes:**
- `200 OK` - Prompt generated successfully
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

**Example with cURL:**
```bash
curl -X POST http://localhost:5000/api/generate-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "age": "20-30",
    "gender": "female",
    "style": "elegant",
    "colors": "white and black",
    "material": "silk blend",
    "setting": "studio",
    "mood": "elegant"
  }'
```

**Example with JavaScript:**
```javascript
const response = await fetch('http://localhost:5000/api/generate-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  })
});

const data = await response.json();
console.log(data.prompt);
```

**Example with Python:**
```python
import requests

response = requests.post(
    'http://localhost:5000/api/generate-prompt',
    json={
        'age': '20-30',
        'gender': 'female',
        'style': 'elegant',
        'colors': 'white and black',
        'material': 'silk blend',
        'setting': 'studio',
        'mood': 'elegant'
    }
)

print(response.json()['prompt'])
```

---

### 3. Enhance Prompt

Enhance an existing prompt with customizations and improvements.

**Endpoint:** `POST /api/enhance-prompt`

**Request Body:**
```json
{
  "prompt": "Original prompt text...",
  "customizations": {
    "silk": "cotton",
    "studio": "beach"
  },
  "enhancements": [
    "Ultra high resolution",
    "Professional lighting",
    "Cinematic composition"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "originalPrompt": "Original prompt text...",
  "enhancedPrompt": "Enhanced prompt text... Ultra high resolution, professional lighting, cinematic composition.",
  "stats": {
    "characters": 350,
    "words": 65,
    "sentences": 5,
    "paragraphs": 1
  },
  "message": "Prompt enhanced successfully"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | Original prompt to enhance |
| customizations | object | No | Word replacements {old: new} |
| enhancements | array | No | Array of enhancement phrases |

**Status Codes:**
- `200 OK` - Prompt enhanced successfully
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

**Example with cURL:**
```bash
curl -X POST http://localhost:5000/api/enhance-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A female model wearing elegant dress",
    "customizations": {
      "dress": "gown"
    },
    "enhancements": [
      "Ultra high resolution",
      "Professional lighting"
    ]
  }'
```

---

### 4. Get All Use Cases

Retrieve all available fashion use cases.

**Endpoint:** `GET /api/use-cases`

**Request:**
```bash
curl http://localhost:5000/api/use-cases
```

**Response:**
```json
{
  "success": true,
  "useCases": [
    "casualBeach",
    "formalBusiness",
    "elegantEvening",
    "casualStreetwear",
    "sportyAthleisure",
    "vintageRetro",
    "luxuryHighFashion",
    "bohemianHippie",
    "minimalistModern",
    "edgyAlternative"
  ],
  "count": 10,
  "message": "Use cases retrieved successfully"
}
```

**Status Codes:**
- `200 OK` - Use cases retrieved successfully
- `500 Internal Server Error` - Server error

**Example with JavaScript:**
```javascript
const response = await fetch('http://localhost:5000/api/use-cases');
const data = await response.json();
console.log(data.useCases);
```

---

### 5. Get Use Case Template

Retrieve template for a specific use case.

**Endpoint:** `GET /api/use-cases/:useCase`

**Request:**
```bash
curl http://localhost:5000/api/use-cases/casualBeach
```

**Response:**
```json
{
  "success": true,
  "useCase": "casualBeach",
  "template": {
    "name": "Casual Beach Wear",
    "template": "A {gender} model, age {age}, wearing casual beach wear in {colors}. The {material} fabric is comfortable and breathable. Beach setting with natural lighting. The mood is {mood} and relaxed. High resolution, natural lighting, perfect composition, fashion editorial style.",
    "keywords": [
      "beach",
      "ocean",
      "golden hour",
      "casual",
      "summer",
      "relaxed",
      "natural light"
    ]
  },
  "message": "Template retrieved successfully"
}
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| useCase | string | Yes | Use case identifier |

**Status Codes:**
- `200 OK` - Template retrieved successfully
- `404 Not Found` - Use case not found
- `500 Internal Server Error` - Server error

**Example with JavaScript:**
```javascript
const useCase = 'casualBeach';
const response = await fetch(`http://localhost:5000/api/use-cases/${useCase}`);
const data = await response.json();
console.log(data.template);
```

---

### 6. Validate Inputs

Validate user inputs before generating prompt.

**Endpoint:** `POST /api/validate-inputs`

**Request Body:**
```json
{
  "age": "20-30",
  "gender": "female",
  "style": "elegant",
  "colors": "white and black",
  "material": "silk blend",
  "setting": "studio",
  "mood": "elegant"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "isValid": true,
  "errors": [],
  "message": "Inputs are valid"
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "isValid": false,
  "errors": [
    "age is required",
    "gender must be one of: male, female, non-binary"
  ],
  "message": "Validation failed"
}
```

**Status Codes:**
- `200 OK` - Validation completed
- `400 Bad Request` - Invalid request format
- `500 Internal Server Error` - Server error

**Example with JavaScript:**
```javascript
const response = await fetch('http://localhost:5000/api/validate-inputs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  })
});

const data = await response.json();
if (data.isValid) {
  console.log('Inputs are valid');
} else {
  console.log('Errors:', data.errors);
}
```

---

### 7. Get Prompt Statistics

Get statistics for a prompt.

**Endpoint:** `POST /api/prompt-stats`

**Request Body:**
```json
{
  "prompt": "A female model, age 20-30, wearing elegant evening wear..."
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "characters": 287,
    "words": 52,
    "sentences": 4,
    "paragraphs": 1
  },
  "message": "Statistics calculated successfully"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | Prompt text to analyze |

**Status Codes:**
- `200 OK` - Statistics calculated successfully
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

**Example with cURL:**
```bash
curl -X POST http://localhost:5000/api/prompt-stats \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A female model wearing elegant dress"
  }'
```

---

## Error Handling

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| NOT_FOUND | 404 | Resource not found |
| SERVER_ERROR | 500 | Internal server error |
| TIMEOUT | 504 | Request timeout |
| OFFLINE | 0 | No internet connection |

### Error Response Examples

**Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    "age is required",
    "gender is required"
  ]
}
```

**Not Found:**
```json
{
  "success": false,
  "error": "Use case 'invalidUseCase' not found",
  "code": "NOT_FOUND"
}
```

**Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "SERVER_ERROR"
}
```

---

## Rate Limiting

### Limits

- **General API:** 30 requests per second
- **Generate Prompt:** 10 requests per second
- **Burst Limit:** 50 requests per second

### Rate Limit Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 1609459200
```

### Handling Rate Limits

```javascript
const response = await fetch('http://localhost:5000/api/generate-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(inputs)
});

if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset');
  console.log('Rate limited. Reset at:', new Date(resetTime * 1000));
  
  // Wait and retry
  const waitTime = resetTime * 1000 - Date.now();
  setTimeout(() => {
    // Retry request
  }, waitTime);
}
```

---

## Examples

### Complete Workflow

```javascript
// 1. Validate inputs
const validation = await fetch('http://localhost:5000/api/validate-inputs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  })
});

const validationData = await validation.json();

if (!validationData.isValid) {
  console.error('Validation errors:', validationData.errors);
  return;
}

// 2. Generate prompt
const generation = await fetch('http://localhost:5000/api/generate-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  })
});

const generationData = await generation.json();
console.log('Generated prompt:', generationData.prompt);

// 3. Enhance prompt
const enhancement = await fetch('http://localhost:5000/api/enhance-prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: generationData.prompt,
    customizations: { 'studio': 'beach' },
    enhancements: ['Ultra high resolution', 'Professional lighting']
  })
});

const enhancementData = await enhancement.json();
console.log('Enhanced prompt:', enhancementData.enhancedPrompt);

// 4. Get statistics
const stats = await fetch('http://localhost:5000/api/prompt-stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: enhancementData.enhancedPrompt
  })
});

const statsData = await stats.json();
console.log('Prompt statistics:', statsData.stats);
```

### Using Async/Await

```javascript
async function generateFashionPrompt(inputs) {
  try {
    // Validate
    const validation = await fetch('http://localhost:5000/api/validate-inputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    }).then(r => r.json());

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate
    const generation = await fetch('http://localhost:5000/api/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    }).then(r => r.json());

    if (!generation.success) {
      throw new Error(generation.error);
    }

    return generation;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Usage
const result = await generateFashionPrompt({
  age: '20-30',
  gender: 'female',
  style: 'elegant',
  colors: 'white and black',
  material: 'silk blend',
  setting: 'studio',
  mood: 'elegant'
});

console.log(result.prompt);
```

### Using Fetch with Error Handling

```javascript
async function callAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:5000${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// Usage
try {
  const result = await callAPI('/api/generate-prompt', 'POST', {
    age: '20-30',
    gender: 'female',
    style: 'elegant',
    colors: 'white and black',
    material: 'silk blend',
    setting: 'studio',
    mood: 'elegant'
  });
  console.log(result.prompt);
} catch (error) {
  console.error('Failed to generate prompt:', error);
}
```

---

## Webhooks

**Coming Soon**

Webhooks will allow you to receive real-time notifications for:
- Prompt generation completed
- Rate limit warnings
- API status changes
- Error alerts

---

## SDK & Libraries

### JavaScript/TypeScript

```javascript
import { generatePrompt, enhancePrompt } from 'fashion-prompt-sdk';

const prompt = await generatePrompt({
  age: '20-30',
  gender: 'female',
  style: 'elegant',
  colors: 'white and black',
  material: 'silk blend',
  setting: 'studio',
  mood: 'elegant'
});

console.log(prompt);
```

### Python

```python
from fashion_prompt_sdk import FashionPromptBuilder

client = FashionPromptBuilder()

prompt = client.generate_prompt(
    age='20-30',
    gender='female',
    style='elegant',
    colors='white and black',
    material='silk blend',
    setting='studio',
    mood='elegant'
)

print(prompt)
```

---

## Changelog

### Version 1.0.0 (2024-01-01)

- Initial release
- 7 API endpoints
- Request validation
- Error handling
- Rate limiting
- Caching support

---

## Support

- **Documentation:** https://docs.fashionpromptbuilder.com
- **Issues:** https://github.com/yourusername/smart-fashion-prompt-builder/issues
- **Email:** support@fashionpromptbuilder.com
- **Discord:** https://discord.gg/your-invite

---

**API Version:** 1.0.0
**Last Updated:** 2024-01-01
