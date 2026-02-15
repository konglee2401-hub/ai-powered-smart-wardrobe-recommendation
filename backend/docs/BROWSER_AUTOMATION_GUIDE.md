# Browser Automation Guide

## Overview
Automate Z.AI Chat and Grok for image analysis using Playwright browser automation.

## Why Browser Automation?

### Advantages
- ✅ Access to latest models without API keys
- ✅ Bypass API rate limits
- ✅ Use free tiers of premium services
- ✅ No API cost
- ✅ Access to web-only features

### Disadvantages
- ❌ Slower than API calls
- ❌ Requires browser (more resources)
- ❌ UI changes can break automation
- ❌ May require authentication
- ❌ Less reliable than APIs

## Supported Services

### 1. Z.AI Chat (chat.z.ai)
**Status:** ✅ Implemented

**Features:**
- Free access to GLM-4V models
- No API key required
- Good image analysis quality

**Authentication:** May require login

**Speed:** ~15-30 seconds per analysis

---

### 2. Grok (grok.com)
**Status:** ✅ Implemented

**Features:**
- Access to Grok-2 Vision
- Excellent analysis quality
- Real-time capabilities

**Authentication:** ⚠️ Requires X/Twitter login

**Speed:** ~20-40 seconds per analysis

---

## Installation

### Install Dependencies
```bash
npm install playwright
npx playwright install chromium
```

### Verify Installation
```bash
npx playwright --version
```

---

## Usage

### Basic Usage

#### Test Z.AI Chat
```bash
npm run test:browser:zai
```

#### Test Grok
```bash
npm run test:browser:grok
```

#### Test Both
```bash
npm run test:browser:both
```

---

### Advanced Options

#### Custom Image
```bash
node test-browser-automation.js --file ./my-image.jpg --service zai
```

#### Custom Prompt
```bash
node test-browser-automation.js \
  --service zai \
  --prompt "Analyze the fashion style and colors in this image"
```

#### Headless Mode
```bash
node test-browser-automation.js --service zai --headless
```

#### Debug Mode (Slow + Screenshots)
```bash
npm run test:browser:debug
```

---

## Authentication

### Z.AI Chat
**Method 1: No Auth (Limited)**
- Works for basic queries
- May have rate limits

**Method 2: Manual Login**
1. Run in non-headless mode
2. Login manually when browser opens
3. Script continues after login

**Method 3: Session Persistence (TODO)**
- Save cookies after login
- Reuse session for future runs

---

### Grok
**Requires X/Twitter Account**

**Method 1: Manual Login (Current)**
```bash
# Run in non-headless mode
node test-browser-automation.js --service grok

# Browser opens, login manually
# Script waits 60 seconds for login
# Then continues with analysis
```

**Method 2: OAuth Flow (TODO)**
- Implement X OAuth
- Store tokens securely
- Auto-refresh tokens

---

## Troubleshooting

### "Could not find upload input"
**Cause:** UI changed or element not loaded

**Solutions:**
1. Run in debug mode to see what's happening:
```bash
npm run test:browser:debug
```

2. Check screenshot in `temp/` folder

3. Update selectors in service file

---

### "Login required"
**Cause:** Service requires authentication

**Solutions:**
1. Run in non-headless mode:
```bash
node test-browser-automation.js --service grok
```

2. Login manually when browser opens

3. Implement session persistence (see below)

---

### "Timeout waiting for response"
**Cause:** Response taking too long or not detected

**Solutions:**
1. Increase timeout in service file:
```javascript
const maxWait = 120000; // 2 minutes
```

2. Check if response selector is correct

3. Run in slow mode to debug:
```bash
node test-browser-automation.js --slow
```

---

### Browser crashes or hangs
**Cause:** Resource issues or detection

**Solutions:**
1. Close other applications

2. Run in headless mode:
```bash
node test-browser-automation.js --headless
```

3. Restart computer and try again

---

## Advanced Configuration

### Session Persistence

#### Save Session (TODO)
```javascript
// After successful login
await context.storageState({ path: 'auth-state.json' });
```

#### Load Session (TODO)
```javascript
// On next run
const context = await browser.newContext({
  storageState: 'auth-state.json'
});
```

---

### Custom Selectors

If UI changes, update selectors in service files:

#### Z.AI Chat (`services/browser/zaiChatService.js`)
```javascript
const uploadSelectors = [
  'input[type="file"]',
  'input[accept*="image"]',
  // Add new selectors here
];
```

#### Grok (`services/browser/grokService.js`)
```javascript
const textInputSelectors = [
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="Message"]',
  // Add new selectors here
];
```

---

### Stealth Mode

Already enabled by default:
- ✅ Override navigator.webdriver
- ✅ Add chrome runtime
- ✅ Mock plugins and languages
- ✅ Bypass CSP
- ✅ Random user agent

To enhance:
```javascript
// In browserService.js
args: [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins',
  // Add more stealth args
]
```

---

## Performance Comparison

| Method | Speed | Cost | Reliability | Quality |
|--------|-------|------|-------------|---------|
| API | ⚡⚡⚡ Fast (2-5s) | 💰 Paid | ✅ High | ⭐⭐⭐⭐⭐ |
| Browser Automation | ⚡ Slow (15-40s) | 🆓 Free | ⚠️ Medium | ⭐⭐⭐⭐ |

**Recommendation:**
- **Production:** Use APIs (faster, more reliable)
- **Development/Testing:** Use browser automation (free)
- **Backup:** Use browser automation as fallback

---

## Integration with Main System

### Add to AI Controller (TODO)

```javascript
// controllers/aiController.js

import ZAIChatService from '../services/browser/zaiChatService.js';
import GrokService from '../services/browser/grokService.js';

// Add to VISION_PROVIDERS
{
  name: 'Z.AI Chat (Browser)',
  provider: 'zai-browser',
  priority: 15,
  pricing: null, // FREE
  available: true,
  analyze: async (imagePath, prompt, options) => {
    const service = new ZAIChatService({ headless: true });
    try {
      await service.initialize();
      return await service.analyzeImage(imagePath, prompt);
    } finally {
      await service.close();
    }
  }
},
{
  name: 'Grok (Browser)',
  provider: 'grok-browser',
  priority: 16,
  pricing: null, // FREE
  available: false, // Requires auth
  analyze: async (imagePath, prompt, options) => {
    const service = new GrokService({ headless: false });
    try {
      await service.initialize();
      return await service.analyzeImage(imagePath, prompt);
    } finally {
      await service.close();
    }
  }
}
```

---

## Best Practices

### 1. Use Headless for Production
```javascript
const service = new ZAIChatService({ headless: true });
```

### 2. Always Close Browser
```javascript
try {
  await service.analyzeImage(imagePath, prompt);
} finally {
  await service.close(); // Always cleanup
}
```

### 3. Handle Errors Gracefully
```javascript
try {
  const result = await service.analyzeImage(imagePath, prompt);
  return result;
} catch (error) {
  console.error('Browser automation failed:', error);
  // Fallback to API
  return await analyzeWithAPI(imagePath, prompt);
}
```

### 4. Take Screenshots for Debugging
```javascript
await service.screenshot({ 
  path: `debug-${Date.now()}.png` 
});
```

### 5. Monitor for UI Changes
- Check services monthly
- Update selectors when needed
- Have API fallback ready

---

## Future Enhancements

### TODO
- [ ] Session persistence (save/load cookies)
- [ ] OAuth integration for Grok
- [ ] Parallel browser instances
- [ ] Response streaming
- [ ] Error recovery
- [ ] Rate limit handling
- [ ] Proxy support
- [ ] CAPTCHA solving

---

## Support

- Issues: Create GitHub issue
- Docs: See `/docs` folder
- Test: `npm run test:browser`
- Debug: `npm run test:browser:debug`

---

## Legal & Ethics

### Terms of Service
- ✅ Check each service's ToS
- ✅ Respect rate limits
- ✅ Don't abuse free tiers
- ✅ Use responsibly

### Best Practices
- Don't run 24/7
- Add delays between requests
- Use for personal/development only
- Have proper authentication
- Respect robots.txt

---

## Examples

### Example 1: Analyze Fashion Image
```bash
node test-browser-automation.js \
  --service zai \
  --file ./fashion.jpg \
  --prompt "Describe the clothing style, colors, and fashion trends in this image"
```

### Example 2: Compare Both Services
```bash
node test-browser-automation.js \
  --service both \
  --file ./product.jpg \
  --prompt "Analyze this product image for e-commerce listing"
```

### Example 3: Debug Mode
```bash
node test-browser-automation.js \
  --service zai \
  --slow \
  --screenshot \
  --prompt "Detailed analysis"
```

---

## Conclusion

Browser automation provides a free alternative to paid APIs, but comes with trade-offs in speed and reliability. Use it wisely as a backup or for development/testing purposes.

**Recommended Strategy:**
1. Primary: Use API services (fast, reliable)
2. Backup: Use browser automation (free, slower)
3. Fallback: Use free API models (NVIDIA, Gemini)
