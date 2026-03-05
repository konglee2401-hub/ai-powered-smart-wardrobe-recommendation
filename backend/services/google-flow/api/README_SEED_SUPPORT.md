**# Google Flow Seed Support - Quick Start**

## Tóm tắt
Google Flow API **hỗ trợ `seed` parameter** để kiểm soát sự tuy nhiên (reproducibility) của hình ảnh sinh ra.

### Cách sử dụng:
- **Cách 1** (đơn giản): Thêm seed vào prompt text
- **Cách 2** (advanced): Gửi seed via direct API call (bypass browser UI)

---

## **Cách 1: Seed trong Prompt Text** (Hiện tại khả thi)

Thêm `SEED: {số}` vào đầu prompt:

```javascript
import { prependSeedToPrompt } from './SeedUtility.js';

// Option A: Tự chọn seed cố định
const customSeed = 925090;
const prompt = prependSeedToPrompt(basePrompt, customSeed);
// Result: "SEED: 925090 \n[IMAGE MAPPING]..."

// Option B: Random seed (mỗi lần khác)
const prompt = prependSeedToPrompt(basePrompt);
// Result: "SEED: 123456 \n[IMAGE MAPPING]..."
```

### Lợi ích:
✅ Hoạt động với UI hiện tại, không cần thay đổi backend  
✅ Google Flow nhận diện `SEED:` trong prompt và sử dụng nó  
✅ Đơn giản, không cần extract credentials  

### Nhược điểm:
⚠️ Seed được gửi trong prompt text, không phải request parameter  
⚠️ Người dùng có thể đánh máy lại prompt và thay đổi seed  

---

## **Cách 2: Seed via Direct API Request** (Advanced/Future)

Bypass browser UI, gửi trực tiếp API request với seed trong request body:

```javascript
import GoogleFlowAPIClient from './GoogleFlowAPIClient.js';

// Trong GoogleFlowAutomationService hoặc controller
const apiClient = new GoogleFlowAPIClient(this.page);

// Capture auth tokens từ browser
await apiClient.setupRequestInterceptor();

// Gửi generation request với seed
const result = await apiClient.batchGenerateImages({
  prompt: basePrompt,
  imageAspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT',
  seed: 925090,              // 💫 Seed trong request body
  imageInputs: [
    { id: 'image-1', type: 'IMAGE_INPUT_TYPE_REFERENCE' },
    { id: 'image-2', type: 'IMAGE_INPUT_TYPE_REFERENCE' }
  ]
});
```

### Request Format:
```json
POST https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages

{
  "requests": [{
    "imageModelName": "GEM_PIX_2",
    "imageAspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT",
    "structuredPrompt": {"parts": [{"text": "...prompt..."}]},
    "seed": 925090,      // 💫 Seed parameter
    "imageInputs": [...]
  }]
}
```

### Lợi ích:
✅ Full control, không phụ thuộc prompt text  
✅ Seed trong request body, an toàn hơn  
✅ Có thể kết hợp với monitoring/logging  
✅ Tương lai-proof (khi cần direct API calls)  

### Nhược điểm:
⚠️ Phức tạp hơn, cần extract auth tokens  
⚠️ Cần setup interceptor trong browser  
⚠️ Có thể bị changes Google API endpoint  

---

## **Cách 3: Hybrid** (Khuyến nghị cho tương lai)

Dùng cả 2 cách:
- Seed trong prompt text (cho backward compatibility)
- Seed trong request body (cho API control)

```javascript
const seed = 925090;
const promptWithSeed = prependSeedToPrompt(basePrompt, seed);

// Browser UI sẽ nhận prompt: "SEED: 925090 \n..."
// API request sẽ có: "seed": 925090

// Mọi layer đều biết seed, tối đa reproducibility
```

---

## **File Hướng dẫn**

| File | Mục đích |
|------|---------|
| `GoogleFlowAPIClient.js` | Direct API calls với seed |
| `SeedUtility.js` | Helper functions (prepend, extract, parse seed) |
| `SEED_IMPLEMENTATION_GUIDE.md` | Chi tiết từng approach + use cases |

---

## **Quick Integration Examples**

### Example 1: Add seed to current flow (5 minutes)

```javascript
// File: backend/services/googleFlowAutomationService.js
import { prependSeedToPrompt } from './utilities/SeedUtility.js';

async _internalEnterPromptViaManager(promptText) {
  // 💫 NEW: Add seed support
  const seed = this.options.seed || Math.floor(Math.random() * 1000000);
  const finalPrompt = prependSeedToPrompt(promptText, seed);
  console.log(`   📊 Seed: ${seed}`);
  
  // Continue as normal
  await this.promptManager.enterPrompt(finalPrompt);
  return await this.promptManager.submit();
}
```

### Example 2: Accept seed from frontend

```javascript
// File: backend/controllers/browserAutomationController.js

import { prependSeedToPrompt } from '../services/google-flow/utilities/SeedUtility.js';

export async function generateWithBrowser(req, res) {
  // ... existing code ...
  
  // 💫 Handle seed from request
  const userSeed = req.body.seed;  // Optional seed from frontend
  
  // Pass to flow service
  const flowService = new GoogleFlowAutomationService({
    // ... existing options ...
    seed: userSeed  // Will be used in _internalEnterPromptViaManager
  });
}
```

### Example 3: Reproducible batch generation

```javascript
// Generate 4 related images with deterministic seeds
import { generateSeedRange, prependSeedToPrompt } from './SeedUtility.js';

async function generateRelatedImages(basePrompt) {
  const baseSeed = 925090;
  const seeds = generateSeedRange(baseSeed, 4);
  
  const results = [];
  for (const seed of seeds) {
    const prompt = prependSeedToPrompt(basePrompt, seed);
    const image = await generateImage(prompt);
    results.push({ image, seed });
  }
  
  return results;  // All images related via seed sequence
}
```

---

## **Seed Use Cases**

### 📸 Use Case 1: Reproducible Virtual Try-On
```
Lần 1: User upload ảnh, generate với SEED: 925090 → Image A
Lần 2: User muốn xem lại → Use same SEED: 925090 → Exact same Image A
```

### 🎨 Use Case 2: A/B Testing
```
Group A: SEED: 925090 → Image A1
Group B: SEED: 925091 → Image B1
Group C: SEED: 925092 → Image C1
(Same prompt, different results due to different seeds)
```

### 🔄 Use Case 3: Variation Series
```
Base: "Generate outfit on model"
SEED: 1000 → Variation 1
SEED: 1001 → Variation 2
SEED: 1002 → Variation 3
SEED: 1003 → Variation 4
(Related images, not completely random)
```

### 🏪 Use Case 4: Affiliate Product Consistency
```
Product launch: Generate 10 images with SEED: {fixed}
6 months later: Regenerate same product with SEED: {fixed}
→ Consistent look, can be used together in marketing
```

---

## **Frequently Asked Questions**

### Q: Nếu không pass seed, điều gì xảy ra?
A: Google Flow sẽ generate random image mỗi lần. Tức hành vi hiện tại.

### Q: SEED có được lưu trong database không?
A: Không. Seed chỉ được gửi trong request. Nếu muốn lưu, cần thêm vào MongoDB:
```javascript
// Schema mở rộng
{
  _id: ObjectId,
  generatedImages: [{
    url: string,
    seed: number,  // 💫 NEW
    createdAt: Date
  }]
}
```

### Q: Có thể random seed lại sau khi đã generate không?
A: Để reproducible, bạn sẽ cần lưu seed. Sau đó:
1. Theo dõi seed trong database
2. Khi regenerate, use same seed

### Q: Seed có impact tới quality không?
A: Không. Quality phụ thuộc model (GEM_PIX_2) và prompt. Seed chỉ ảnh hưởng **composition** (tổ hợp/sắp xếp) của ảnh.

---

## **Next Steps**

1. ✅ **Short term**: Implement Cách 1 (seed in prompt text)
   - 5 phút setup
   - Hoạt động ngay
   - Không cần thay đổi API

2. 🔄 **Medium term**: Add seed to frontend + database
   - Allow users to select/save seeds
   - Track seed in image metadata

3. 🚀 **Long term**: Implement Cách 2 (direct API calls)
   - Bypass browser UI cho generation
   - More control + faster execution
   - Requires API token management

---

## **Resources**

- API Endpoint: `https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages`
- Model: `GEM_PIX_2` (Google Generative Images 2)
- Supported aspect ratios:
  - `IMAGE_ASPECT_RATIO_PORTRAIT` (9:16)
  - `IMAGE_ASPECT_RATIO_LANDSCAPE` (16:9)

---

## **Support**

Các file được tạo:
- `backend/services/google-flow/api/GoogleFlowAPIClient.js` - Direct API client
- `backend/services/google-flow/utilities/SeedUtility.js` - Helpers
- `backend/services/google-flow/api/SEED_IMPLEMENTATION_GUIDE.md` - Chi tiết

Bắt đầu với SeedUtility.js helpers - đơn giản nhất!
