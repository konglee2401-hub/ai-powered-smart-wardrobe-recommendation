# Browser Automation + Grok Conversation Reuse Guide

## Overview

This guide explains how to use the session history system with browser automation to:
1. ✅ Capture Grok conversation URL during automated analysis
2. ✅ Reuse the same conversation for prompt enhancement
3. ✅ Keep enhancement in context of original analysis
4. ✅ Track everything for later review

## Architecture

```
┌──────────────────────────────┐
│  Browser Automation Script   │
│  (Run Grok Analysis)         │
└──────────────────────────────┘
            ↓
    Capture Grok URL:
    https://grok.com/c/{id}?rid={rid}
            ↓
┌──────────────────────────────┐
│  Save to SessionHistory      │
│  analysisStage.              │
│  grokConversation            │
└──────────────────────────────┘
            ↓
    ┌──────────────────────┐
    │  User selects options│
    │  Customizes prompt   │
    └──────────────────────┘
            ↓
┌──────────────────────────────┐
│  Prompt Enhancement Request  │
│  (Reuse stored conversation) │
└──────────────────────────────┘
            ↓
    Send message to:
    grok.com/c/{storedId}?rid={storedRid}
            ↓
    Grok remembers context of
    original analysis →
    Better enhancements!
```

## Step 1: Browser Automation - Capture Grok URL

### During Automated Analysis Run

```javascript
// In your browser automation test file (e.g., test-browser-automation.js)
const puppeteer = require('puppeteer');

async function runGrokAnalysisWithSessionTracking(imagePath, useCase) {
  const browser = await puppeteer.launch({
    headless: false // See what's happening
  });

  const page = await browser.newPage();

  // Start session before analyzing
  const sessionId = generateSessionId();
  console.log(`Starting session: ${sessionId}`);

  try {
    // Navigate to Grok
    await page.goto('https://grok.com', { waitUntil: 'networkidle2' });

    // Find and click upload button
    const uploadInput = await page.$('input[type="file"]');
    await uploadInput.uploadFile(imagePath);

    // Enter analysis prompt
    const promptInput = await page.$('textarea');
    const analysisPrompt = `
      Analyze this ${useCase} image for:
      1. Style and fashion elements
      2. Recommended modifications
      3. Color palette
      4. Lighting conditions
      5. Mood and atmosphere
    `;
    await promptInput.type(analysisPrompt);

    // Submit analysis
    await page.click('button[aria-label="Send"][type="button"]');

    // Wait for response
    await page.waitForNavigation();

    // ⭐ CAPTURE GROK CONVERSATION URL
    const finalUrl = page.url();
    console.log('Final Grok URL:', finalUrl);
    const conversationId = extractConversationId(finalUrl); // Extract from URL

    // Save to session
    const analysisData = {
      useCase,
      timestamp: new Date().toISOString(),
      conversationId,
      grokUrl: finalUrl,
      imagePath,
      success: true
    };

    console.log('Analysis complete!');
    console.log('Conversation ID for reuse:', conversationId);
    console.log('Full URL:', finalUrl);

    // Return for use in backend
    return {
      sessionId,
      grokConversationUrl: finalUrl,
      analysisData
    };

  } catch (error) {
    console.error('Analysis failed:', error);
    return { error: error.message };
  } finally {
    await browser.close();
  }
}

// Helper function
function extractConversationId(url) {
  /**
   * From URL: https://grok.com/c/eb1bfdbe-c184-4996-854d-a4a9c1576078?rid=2b08a219...
   * Extract: eb1bfdbe-c184-4996-854d-a4a9c1576078
   */
  const match = url.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

module.exports = { runGrokAnalysisWithSessionTracking };
```

### Save to Backend Session

```javascript
// After running browser automation
const sessionData = await runGrokAnalysisWithSessionTracking(imagePath, useCase);

if (!sessionData.error) {
  // Save to backend
  const response = await SessionHistoryService.saveAnalysis(
    sessionData.sessionId,
    {
      provider: 'grok',
      analysisData: sessionData.analysisData,
      grokConversationUrl: sessionData.grokConversationUrl, // ⭐ URL saved here
      analysisTime: endTime - startTime
    }
  );

  console.log('✅ Analysis saved with Grok conversation URL');
  console.log('Grok Conversation ID:', response.grokData.conversationId);
  console.log('Can be reused for enhancement!');
}
```

## Step 2: Retrieve Stored Conversation for Enhancement

### From Frontend/Component

```javascript
// In Step3EnhancedWithSession or anywhere in Step 3
import { GrokConversationEnhancer } from '../utils/advancedPromptEngineering';
import SessionHistoryService from '../services/sessionHistoryService';

const enhancePromptWithStoredGrokConversation = async (
  sessionId,
  currentPrompt,
  useCase
) => {
  try {
    // 1. Get session from backend
    const session = await SessionHistoryService.getSession(sessionId);

    // 2. Extract Grok conversation
    const grokConversation = session.analysisStage?.grokConversation;

    if (!grokConversation?.conversationId) {
      throw new Error('No Grok conversation found. Was analysis performed with Grok?');
    }

    console.log('Found Grok Conversation:');
    console.log('ID:', grokConversation.conversationId);
    console.log('URL:', grokConversation.fullUrl);

    // 3. Create enhancer with stored IDs
    const enhancer = new GrokConversationEnhancer(
      grokConversation.conversationId,
      grokConversation.requestId // Optional, but useful
    );

    // 4. Build enhancement request
    const enhancementRequest = enhancer.buildEnhancementRequest(
      currentPrompt,
      useCase,
      { maxLength: 250, style: 'professional' }
    );

    console.log('Enhancement request prepared');
    console.log('Message:', enhancementRequest.message);

    // 5. Send to Grok API
    // This would use grok-automation or direct API call
    const enhancedResponse = await grokAPI.sendMessageToConversation(
      grokConversation.conversationId,
      enhancementRequest.message
      // Grok will remember the original analysis context!
    );

    const enhancedPrompt = enhancedResponse.content.trim();

    console.log('✅ Enhancement received from Grok');
    console.log('Enhanced:', enhancedPrompt);

    // 6. Save enhancement with conversation link
    await SessionHistoryService.savePromptEnhancement(sessionId, {
      enhancedPrompt,
      enhancementMethod: 'grok_conversation',
      grokConversationUrl: grokConversation.fullUrl
    });

    console.log('✅ Enhancement saved to session');

    return enhancedPrompt;

  } catch (error) {
    console.error('Enhancement failed:', error.message);
    throw error;
  }
};

// Usage
const enhancedPrompt = await enhancePromptWithStoredGrokConversation(
  sessionId,
  'A woman in black blazer, confident...',
  'change-clothes'
);
```

## Step 3: Grok API Integration

### Setup Grok API Handler

```javascript
// services/grokService.js (Create this if not exists)

const GROK_API_BASE = 'https://grok.com/api'; // Adjust based on actual API
const GROK_API_KEY = process.env.GROK_API_KEY;

export class GrokService {
  /**
   * Send message to existing conversation
   */
  static async sendMessageToConversation(conversationId, message) {
    try {
      const response = await fetch(
        `${GROK_API_BASE}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: message,
            role: 'user'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Grok API request failed:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(conversationId) {
    try {
      const response = await fetch(
        `${GROK_API_BASE}/conversations/${conversationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${GROK_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation from URL
   */
  static extractConversationIdFromUrl(url) {
    /**
     * URL format: https://grok.com/c/{conversationId}?rid={requestId}
     * Example: https://grok.com/c/eb1bfdbe-c184-4996?rid=2b08a219
     */
    const match = url.match(/\/c\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }
}

export default GrokService;
```

## Step 4: Full Flow Example

### Complete Workflow

```javascript
// Complete workflow: Test → Analysis → Enhancement → Generation

import { runGrokAnalysisWithSessionTracking } from './backend/test-browser-automation';
import SessionHistoryService from './frontend/src/services/sessionHistoryService';
import { enhancePromptWithStoredGrokConversation } from './frontend/src/utils/enhancementUtils';

const completeWorkflowWithGrok = async (imagePath, useCase, userId) => {
  console.log('🚀 STARTING COMPLETE WORKFLOW WITH GROK\n');

  // PHASE 1: Analysis
  console.log('📸 PHASE 1: Running Grok analysis...\n');
  
  const analysisResult = await runGrokAnalysisWithSessionTracking(imagePath, useCase);

  if (analysisResult.error) {
    console.error('❌ Analysis failed:', analysisResult.error);
    return;
  }

  const sessionId = analysisResult.sessionId;
  const grokUrl = analysisResult.grokConversationUrl;

  console.log(`✅ Analysis complete!`);
  console.log(`Session: ${sessionId}`);
  console.log(`Grok Conversation: ${grokUrl}\n`);

  // PHASE 2: Save to Backend
  console.log('💾 PHASE 2: Saving to backend...\n');

  const savedSession = await SessionHistoryService.saveAnalysis(sessionId, {
    provider: 'grok',
    analysisData: analysisResult.analysisData,
    grokConversationUrl: grokUrl,
    analysisTime: 2350
  });

  console.log('✅ Session saved');
  console.log(`Grok Conversation ID: ${savedSession.grokData.conversationId}\n`);

  // PHASE 3: Generate Initial Prompt
  console.log('✍️  PHASE 3: Generating initial prompt...\n');

  const basePrompt = `A person in professional attire, 
    confident expression, ${useCase === 'change-clothes' ? 'ready for virtual try-on' : 'ready for photography'},
    clean background, studio lighting, sharp focus`;

  console.log('Base Prompt:', basePrompt);
  console.log();

  // PHASE 4: Enhance with Grok
  console.log('🚀 PHASE 4: Enhancing with Grok (using original conversation)...\n');

  const enhancedPrompt = await enhancePromptWithStoredGrokConversation(
    sessionId,
    basePrompt,
    useCase
  );

  console.log('✅ Enhancement complete!');
  console.log('Enhanced:', enhancedPrompt);
  console.log();

  // PHASE 5: Generate Images
  console.log('🎨 PHASE 5: Generating images with enhanced prompt...\n');

  const generatedImages = [
    { id: 'img-001', url: 'https://...generated-1.jpg' },
    { id: 'img-002', url: 'https://...generated-2.jpg' }
  ];

  console.log('Generated', generatedImages.length, 'images');
  console.log();

  // PHASE 6: Save Results
  console.log('💾 PHASE 6: Saving final results...\n');

  await SessionHistoryService.saveGenerationResults(sessionId, {
    provider: 'stable-diffusion',
    finalPrompt: enhancedPrompt,
    generatedImages,
    settings: {
      guidance: 7.5,
      steps: 30
    }
  });

  console.log('✅ Results saved');
  console.log();

  // PHASE 7: Get Statistics
  console.log('📊 PHASE 7: Session statistics...\n');

  const stats = await SessionHistoryService.getSessionStatistics(sessionId);
  console.log('Duration:', stats.statistics.duration, 'seconds');
  console.log('Grok Conversation:', stats.statistics.analysis.hasGrokConversation ? '✓' : '✗');
  console.log('Generated Images:', stats.statistics.generation.imageCount);
  console.log();

  console.log('🎉 WORKFLOW COMPLETE!\n');

  return {
    sessionId,
    grokConversation: savedSession.grokData,
    enhancedPrompt,
    generatedImages
  };
};

// Usage
await completeWorkflowWithGrok(
  './uploads/character-image.jpg',
  'change-clothes',
  'user-123'
);
```

## Available Grok Conversation Methods

Once conversation is captured, you can:

```javascript
// 1. Send follow-up messages
await grokAPI.sendMessageToConversation(conversationId, newMessage);

// 2. Get conversation history
const history = await grokAPI.getConversationHistory(conversationId);

// 3. Extract tips from original analysis
const originalAnalysis = history.messages[0];

// 4. Refine based on analysis context
const contextualEnhancement = buildFromContext(originalAnalysis, newPrompt);

// 5. Multiple enhancements in same conversation
const variation1 = await grokAPI.sendMessageToConversation(conversationId, 'Make it more dramatic');
const variation2 = await grokAPI.sendMessageToConversation(conversationId, 'Make it softer');

// All variations remember the original analysis context!
```

## MongoDB Session Structure for Grok Tracking

```javascript
{
  _id: ObjectId,
  sessionId: "session-1708473600000-abc123",
  useCase: "change-clothes",
  
  analysisStage: {
    status: "analyzed",
    provider: "grok",
    grokConversation: {
      conversationId: "eb1bfdbe-c184-4996-854d-a4a9c1576078", // ⭐
      requestId: "2b08a219-8166-4f76-9b7e-113075438cfb",      // ⭐
      fullUrl: "https://grok.com/c/eb1bfdbe-c184...?rid=2b08a219...",
      parsedAt: "2026-02-20T10:00:00Z"
    },
    analysisData: {
      recommendedStyle: "editorial",
      colors: ["warm", "neutral"],
      lighting: "soft-diffused",
      mood: "confident"
    },
    analysisTime: 2350,
    completedAt: "2026-02-20T10:05:00Z"
  },

  promptStage: {
    enhancedPrompt: "Enhanced version from Grok",
    enhancementMethod: "grok_conversation",
    grokEnhancementConversation: {
      conversationId: "eb1bfdbe-c184-4996-854d-a4a9c1576078", // Same as above
      requestId: "2b08a219-8166-4f76-9b7e-113075438cfb",
      fullUrl: "https://grok.com/c/eb1bfdbe-c184...?rid=2b08a219...",
      messages: [
        {
          role: "user",
          content: "Enhance this prompt: ...",
          timestamp: "2026-02-20T10:10:00Z"
        },
        {
          role: "assistant",
          content: "Enhanced: ...",
          timestamp: "2026-02-20T10:10:05Z"
        }
      ]
    }
  },

  createdAt: "2026-02-20T10:00:00Z",
  updatedAt: "2026-02-20T10:15:00Z"
}
```

## Environment Setup

```bash
# .env
GROK_API_KEY=your-api-key-here
GROK_API_BASE=https://grok.com/api

# If using browser automation
CHROME_PATH=/path/to/chrome
HEADLESS_MODE=false # For testing, true for production
```

## Troubleshooting Grok Conversation

### Issue: Conversation ID not captured

**Checklist:**
- [ ] Browser automation actually navigates to Grok
- [ ] Grok page fully loads (wait for network idle)
- [ ] URL contains `/c/{id}` pattern
- [ ] Extract function correctly parses URL

**Solution:**
```javascript
const url = 'https://grok.com/c/eb1bfdbe-c184-4996-854d-a4a9c1576078?rid=2b08a219';
const id = url.match(/\/c\/([a-f0-9-]+)/)[1];
console.log(id); // Should print: eb1bfdbe-c184-4996-854d-a4a9c1576078
```

### Issue: Can't reuse conversation

**Verify:**
- [ ] Conversation ID saved correctly in DB
- [ ] Grok API has proper authentication
- [ ] Conversation is still active (not expired)
- [ ] Message format matches Grok API expectations

**Check stored data:**
```javascript
const session = await SessionHistoryService.getSession(sessionId);
console.log(session.analysisStage.grokConversation);
// Should show: { conversationId: "...", requestId: "...", fullUrl: "..." }
```

### Issue: Enhancement loses context

**Reason:** Using different conversation
**Solution:** Always use stored `conversationId` from original analysis

```javascript
// ❌ Wrong: Creates new conversation
const enhancer = new GrokConversationEnhancer('new-random-id');

// ✅ Correct: Reuses original
const grokConv = session.analysisStage.grokConversation;
const enhancer = new GrokConversationEnhancer(grokConv.conversationId);
```

## Best Practices

1. **Always save Grok conversation URL after analysis**
   ```javascript
   grokConversationUrl: finalUrl // From browser automation
   ```

2. **Reuse same conversation for related enhancements**
   ```javascript
   // Same conversation ID for multiple enhancement requests
   ```

3. **Track conversation history in session**
   ```javascript
   grokEnhancementConversation.messages // All back-and-forth
   ```

4. **Export session for debugging**
   ```javascript
   const exported = await SessionHistoryService.exportSession(sessionId);
   // Shows complete conversation thread
   ```

5. **Set reasonable timeouts**
   ```javascript
   const timeout = 60000; // 60 seconds for Grok response
   ```

---

**Status**: Ready for Implementation  
**Version**: 1.0  
**Last Updated**: February 20, 2026
