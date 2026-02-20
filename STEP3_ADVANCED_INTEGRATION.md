# Step 3 Advanced Integration Guide - Session History & Prompt Engineering

## Overview

This guide covers the integration of session history tracking, prompt layering, and variation generation into the Step 3 workflow.

## Files Created

### Frontend Files

1. **src/utils/sessionHistory.js** (~300 lines)
   - `SessionHistory` class for tracking complete flow
   - `parseGrokConversationUrl()` for parsing Grok URLs
   - `generateSessionId()` for unique session IDs
   - Session metadata and state management

2. **src/utils/advancedPromptEngineering.js** (~350 lines)
   - `PromptLayering` class for main/refiner/negative separation
   - `PromptVariationGenerator` class for A/B testing variations
   - `GrokConversationEnhancer` class for Grok integration
   - Synonym map for intelligent variation generation

3. **src/services/sessionHistoryService.js** (~150 lines)
   - Async API calls for session management
   - Methods: createSession, updateSession, getSession, getUserSessions
   - Methods: saveAnalysis, savePromptVariations, savePromptEnhancement
   - Methods: saveGenerationResults, getStatistics, exportSession

4. **src/components/PromptLayeringDialog.jsx** (~350 lines)
   - Modal dialog for displaying layered prompts
   - A/B testing variation selector
   - Copy-to-clipboard functionality
   - Quality scoring for variations

5. **src/components/Step3EnhancedWithSession.jsx** (~500 lines)
   - Complete Step 3 with session tracking
   - Prompt layering integration
   - Batch variation generation
   - Advanced optimization with 3-tier strategy

### Backend Files

1. **models/SessionHistory.js** (~400 lines)
   - MongoDB schema for session storage
   - Supports all session stages: analysis, style, prompt, generation
   - Grok conversation tracking
   - Complete metadata logging

2. **controllers/sessionHistoryController.js** (~400 lines)
   - Session CRUD operations
   - Grok conversation URL parsing and storage
   - Statistics calculation
   - Session export functionality

3. **routes/sessionHistory.js** (~60 lines)
   - API routes for all session operations
   - Authentication middleware integration
   - RESTful endpoints

4. **utils/sessionHistory.js** (~200 lines)
   - Server-side utility functions
   - Session validation
   - Metrics calculation
   - Activity logging

## Integration Steps

### Step 1: Backend Setup

1. **Register Session History Routes**
   ```javascript
   // In server.js
   const sessionHistoryRoutes = require('./routes/sessionHistory');
   app.use('/api/sessions', sessionHistoryRoutes);
   ```

2. **Ensure MongoDB Connection**
   ```javascript
   // SessionHistory model requires MongoDB
   // Make sure mongoose is connected before starting server
   ```

3. **Add Authentication Middleware**
   ```javascript
   // Ensure authenticateToken middleware is available
   // Used for all POST/PUT/DELETE operations
   ```

### Step 2: Frontend Services Setup

1. **Update API Configuration**
   ```javascript
   // In src/services/api.js
   export const api = {
     // Existing endpoints...
     sessions: {
       create: async (data) => fetch('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
       get: async (sessionId) => fetch(`/api/sessions/${sessionId}`),
       update: async (sessionId, data) => fetch(`/api/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),
       // ... other endpoints
     }
   };
   ```

2. **Configure API Base URL**
   ```javascript
   // Create .env or .env.local with:
   // REACT_APP_API_BASE=http://localhost:3001/api
   // Or for production:
   // REACT_APP_API_BASE=https://your-api.com/api
   ```

### Step 3: VirtualTryOnPage Integration

1. **Import New Components**
   ```javascript
   import Step3EnhancedWithSession from '../components/Step3EnhancedWithSession';
   import SessionHistoryService from '../services/sessionHistoryService';
   import { SessionHistory } from '../utils/sessionHistory';
   ```

2. **Add Session State**
   ```javascript
   const [sessionHistory, setSessionHistory] = useState(null);
   const [userId, setUserId] = useState(null); // Get from auth context
   ```

3. **Initialize Session on Component Mount**
   ```javascript
   useEffect(() => {
     const session = new SessionHistory(
       generateSessionId(),
       useCase,
       characterImage?.id,
       productImage?.id
     );
     setSessionHistory(session);
     
     // Save to backend
     SessionHistoryService.createSession({
       sessionId: session.sessionId,
       userId,
       useCase,
       characterImageId: characterImage?.id,
       productImageId: productImage?.id
     });
   }, [useCase, characterImage, productImage, userId]);
   ```

4. **Replace Step 3 Component**
   ```javascript
   // Old:
   // <StyleCustomizer ... />
   
   // New:
   <Step3EnhancedWithSession
     characterImage={characterImage}
     productImage={productImage}
     selectedOptions={selectedOptions}
     onOptionChange={handleOptionChange}
     generatedPrompt={generatedPrompt}
     onPromptChange={handlePromptChange}
     useCase={useCase}
     isLoadingPrompt={isLoadingPrompt}
     referenceImages={referenceImages}
     onReferenceImagesChange={handleReferenceImagesChange}
     analysis={analysisData}
     userId={userId}
   />
   ```

5. **Handle Analysis with Grok Tracking**
   ```javascript
   const handleAnalysis = async (analysisUrl) => {
     // ... existing analysis code ...
     
     // Track Grok conversation
     if (sessionHistory && analysisUrl.includes('grok.com')) {
       await SessionHistoryService.saveAnalysis(
         sessionHistory.sessionId,
         {
           provider: 'grok',
           analysisData,
           grokConversationUrl: analysisUrl,
           analysisTime: Date.now() - startTime
         }
       );
     }
   };
   ```

### Step 4: Grok Conversation Integration (Browser Automation)

1. **Save Conversation URL on Analysis**
   ```javascript
   // After running Grok browser automation
   const grokConversationUrl = await getBrowserGrokUrl(); // Returns URL like https://grok.com/c/xxx?rid=yyy
   
   if (sessionHistory) {
     const grokData = parseGrokConversationUrl(grokConversationUrl);
     sessionHistory.analysisStage.grokConversation = grokData;
     
     // Save to backend
     await SessionHistoryService.saveAnalysis(sessionHistory.sessionId, {
       provider: 'grok',
       grokConversationUrl
     });
   }
   ```

2. **Reuse Conversation for Prompt Enhancement**
   ```javascript
   // When enhancing prompts, use stored Grok conversation
   const enhancePromptWithGrok = async (prompt) => {
     if (!sessionHistory?.analysisStage?.grokConversation) {
       console.error('No Grok conversation found');
       return;
     }
     
     const { conversationId } = sessionHistory.analysisStage.grokConversation;
     
     // Send new message to same conversation
     const enhanced = await grokAPI.sendMessage(conversationId, {
       message: `Enhance this image generation prompt:\n"${prompt}"\n\nMake it better without changing core meaning.`
     });
     
     // Save enhancement with conversation link
     await SessionHistoryService.savePromptEnhancement(
       sessionHistory.sessionId,
       {
         enhancedPrompt: enhanced,
         enhancementMethod: 'grok_conversation',
         grokConversationUrl: sessionHistory.analysisStage.grokConversation.fullUrl
       }
     );
   };
   ```

### Step 5: Prompt Layering Usage

1. **Access Layered Prompts**
   ```javascript
   // In Step 4 (PromptEditor) or Step 5 (GenerationOptions)
   const layeredPrompt = sessionHistory?.promptStage?.layeredPrompt;
   
   if (layeredPrompt && model.supportsLayering) {
     // Send main + refiner separately
     const layers = {
       main: layeredPrompt.main,
       refiner: layeredPrompt.refiner,
       negative: layeredPrompt.negative
     };
     await generateWithLayers(layers);
   } else {
     // Send combined
     await generateWithPrompt(layeredPrompt.combined.positive);
   }
   ```

2. **Provider-Specific Handling**
   ```javascript
   // For SDXL models (support layering)
   if (model.name.includes('SDXL')) {
     return {
       prompt: layeredPrompt.main,
       prompt_2: layeredPrompt.refiner,
       negative_prompt: layeredPrompt.negative,
       negative_prompt_2: layeredPrompt.negative // SDXL specific
     };
   }
   
   // For models without refiner support
   return {
     prompt: layeredPrompt.combined.positive,
     negative_prompt: layeredPrompt.negative
   };
   ```

### Step 6: A/B Testing Variations Setup

1. **Generate Variations**
   ```javascript
   const handleGenerateVariations = async () => {
     const generator = new PromptVariationGenerator(prompt);
     const variations = generator.generateAllVariations(3); // 3 variations
     
     setVariations(variations);
     
     // Save to session
     await SessionHistoryService.savePromptVariations(
       sessionHistory.sessionId,
       variations
     );
   };
   ```

2. **Use Variation Results**
   ```javascript
   // Generate with multiple variations for comparison
   const generateABTest = async (variations) => {
     const results = await Promise.all(
       variations.map(var => generateImage({
         prompt: var.variation,
         sessionId: sessionHistory.sessionId,
         variationId: var.id
       }))
     );
     
     return results; // Compare results side-by-side
   };
   ```

### Step 7: Data Persistence

1. **Save Session Throughout Flow**
   ```javascript
   // Save after each major operation
   const saveSession = async () => {
     if (!sessionHistory || !userId) return;
     
     await SessionHistoryService.updateSession(
       sessionHistory.sessionId,
       sessionHistory.toJSON()
     );
   };
   
   // Call after: analysis, style selection, prompt modification, generation
   ```

2. **Export Completed Session**
   ```javascript
   const exportSession = async () => {
     const exported = await SessionHistoryService.exportSession(sessionHistory.sessionId);
     
     // Download as JSON
     const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `session-${sessionHistory.sessionId}.json`;
     a.click();
   };
   ```

## API Endpoints Reference

### Create Session
```
POST /api/sessions
Body: {
  userId: string (required)
  useCase: string (required)
  characterImageId?: string
  productImageId?: string
  metadata?: object
}
Response: { success: boolean, sessionId: string, session: object }
```

### Save Analysis with Grok
```
POST /api/sessions/:sessionId/analysis
Body: {
  provider: string ('grok', 'zai', etc)
  analysisData: object
  rawResponse: any
  grokConversationUrl?: string (https://grok.com/c/xxx?rid=yyy)
  analysisTime?: number (milliseconds)
}
Response: { success: boolean, session: object, grokData: object }
```

### Save Prompt Enhancement
```
POST /api/sessions/:sessionId/prompt-enhancement
Body: {
  enhancedPrompt: string (required)
  enhancementMethod: string ('grok_conversation', 'ai_api', etc)
  grokConversationUrl?: string
}
Response: { success: boolean, session: object }
```

### Get Session Statistics
```
GET /api/sessions/:sessionId/statistics
Response: {
  success: boolean
  statistics: {
    duration: number (seconds)
    analysis: { provider, time, hasGrokConversation }
    style: { optionsSelected, referenceImages }
    prompt: { variations, hasLayered, hasEnhanced, optimizations, totalCharacterReduction }
    generation: { provider, imageCount }
  }
}
```

## Environment Variables

```
# Frontend (.env or .env.local)
REACT_APP_API_BASE=http://localhost:3001/api

# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/smart-wardrobe
JWT_SECRET=your-secret-key
```

## Database Schema Reference

### Session Collection
```javascript
{
  sessionId: string (unique, indexed)
  userId: ObjectId (indexed)
  useCase: string (indexed)
  createdAt: Date (indexed)
  currentStatus: string (indexed)
  
  analysisStage: {
    grokConversation: {
      conversationId: string
      requestId: string
      fullUrl: string
    },
    analysisData: object,
    analysisTime: number
  },
  
  styleStage: {
    selectedOptions: object,
    referenceImages: array
  },
  
  promptStage: {
    layeredPrompt: {
      main: string,
      refiner: string,
      negative: string
    },
    promptVariations: array,
    enhancedPrompt: string,
    grokEnhancementConversation: object
  },
  
  generationStage: {
    finalPrompt: string,
    generatedImages: array,
    provider: string
  }
}
```

## Testing Checklist

### Unit Tests
- [ ] SessionHistory class initialization and state updates
- [ ] Grok URL parsing with various formats
- [ ] PromptLayering with/without refiner and negative
- [ ] PromptVariationGenerator all methods
- [ ] GrokConversationEnhancer message building

### Integration Tests
- [ ] Create session → save to backend → retrieve session
- [ ] Save analysis with Grok URL → verify parsing
- [ ] Generate variations → save to session → retrieve
- [ ] Update prompt enhancement → track conversation
- [ ] Export session as complete JSON

### User Flow Tests
- [ ] Start Step 3 → session created automatically
- [ ] Selected styles → variations generated in real-time
- [ ] Click "Variations" button → dialog opens with 3 variations
- [ ] Select variation → prompt updated and saved
- [ ] Enter custom prompt → layering updated
- [ ] Optimize prompt → character count reduced
- [ ] Complete flow → session exported with all data

## Performance Considerations

1. **Session Size**: Each session can grow to ~50KB with images and variations
   - Consider archiving old sessions after 30 days
   - Compress image data using image-compression library

2. **Database Indexing**: Ensure indexes on:
   - userId + createdAt (for user session list)
   - useCase + currentStatus (for filtering)
   - sessionId (primary lookup)

3. **API Load**:
   - Debounce prompt generation: 500ms delay
   - Batch updates: save session every 5 seconds, not on every change
   - Use MongoDB connection pooling

4. **Frontend Memory**:
   - Limit reference images to 3 (already done)
   - Clear old sessions from component state
   - Use useCallback to prevent unnecessary re-renders

## Common Issues & Solutions

### Issue: Grok URL not parsing correctly
**Solution**: Verify URL format is exactly `https://grok.com/c/{id}?rid={rid}`
```javascript
const url = 'https://grok.com/c/eb1bfdbe-c184-4996-854d-a4a9c1576078?rid=2b08a219-8166-4f76-9b7e-113075438cfb';
const parsed = parseGrokConversationUrl(url);
console.log(parsed.conversationId); // eb1bfdbe-c184-4996-854d-a4a9c1576078
```

### Issue: Session not saving to backend
**Verification**:
- [ ] userId is provided to Step3EnhancedWithSession
- [ ] Backend is running and API_BASE is correct
- [ ] MongoDB connection is established
- [ ] Session routes are registered in server.js

### Issue: Variations not generating
**Solution**: Ensure promptLayering is populated
```javascript
// Check if generateLayeredPrompt useEffect is running
console.log('selectedOptions:', selectedOptions); // should not be empty
console.log('promptLayering:', promptLayering); // should exist
```

### Issue: Grok conversation not found when enhancing
**Solution**: Ensure analysis was saved with Grok URL
```javascript
if (!sessionHistory?.analysisStage?.grokConversation?.conversationId) {
  console.error('No Grok conversation found. Was analysis performed with Grok?');
}
```

## Security Considerations

1. **User Authentication**: All POST/PUT/DELETE require authenticateToken
   ```javascript
   // Automatically enforced by backend routes
   ```

2. **Input Validation**: Prompt text validated for injection attempts
   ```javascript
   const sanitizePrompt = (prompt) => {
     return prompt
       .substring(0, 5000) // Max length
       .replace(/[<>{}]/g, ''); // Remove dangerous chars
   };
   ```

3. **Image Data**: Base64 images stored in session
   - Consider implementing image size limits
   - Validate file types (jpg, png, webp only)
   - Compress images before storage

4. **Session Access**: Sessions linked to userId
   ```javascript
   // Backend ensures user can only access own sessions
   ```

## Future Enhancements

- [ ] Session sharing with team members
- [ ] Reuse prompts from past sessions
- [ ] Analytics dashboard (sessions per day, popular styles, etc)
- [ ] Batch session generation
- [ ] Session version control (compare variations over time)
- [ ] AI-powered session recommendations
- [ ] Multi-language prompt generation
- [ ] Provider-specific prompt optimization

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend logs: `tail -f logs/backend.log`
3. Check browser console for frontend errors: F12 → Console
4. Verify MongoDB is running: `mongo` or `mongosh`

---

**Last Updated**: February 20, 2026
**Version**: 1.0
