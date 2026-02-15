# ✅ TESTING CHECKLIST

## Backend Setup

- [ ] `npm install` completed without errors
- [ ] `.env` file created from `.env.example`
- [ ] At least one API key configured
- [ ] MongoDB running and accessible
- [ ] `npm run seed-options` successful (53 options added)
- [ ] `npm run dev` starts without errors
- [ ] Server shows: "✅ Loaded X prompt options from database"

## Backend API Tests

- [ ] `curl http://localhost:5000/api/prompt-options` returns options
- [ ] `npm run test:gemini` passes (if GOOGLE_API_KEY configured)
- [ ] `npm run test:fireworks` passes (if FIREWORKS_API_KEY configured)
- [ ] POST `/api/ai/analyze-character` works with test image
- [ ] POST `/api/ai/build-prompt` returns prompt

## Frontend Setup

- [ ] `npm install` completed without errors
- [ ] `npm run dev` opens browser to http://localhost:5173
- [ ] No console errors in browser DevTools
- [ ] UI loads correctly with all sections visible

## Frontend Features

### Upload & Analysis
- [ ] Can upload character image
- [ ] Can upload product image
- [ ] Can select analysis model from dropdown
- [ ] "Analyze Images with AI" button works
- [ ] Analysis completes and shows results
- [ ] Logs sidebar shows analysis progress

### Mode & Options
- [ ] Auto/Semi/Manual mode toggle visible and works
- [ ] Use Case dropdown populated
- [ ] Scene dropdown populated
- [ ] Lighting dropdown populated
- [ ] Mood dropdown populated
- [ ] Style dropdown populated
- [ ] Color Palette dropdown populated

### Auto Mode
- [ ] In Auto mode, dropdowns are disabled
- [ ] AI suggestions auto-applied to all fields
- [ ] Shows "⭐ AI selected: X" under each dropdown

### Manual Mode
- [ ] In Manual mode, dropdowns are enabled
- [ ] AI suggestions shown as tags with ⭐
- [ ] "Apply AI" button appears next to each field
- [ ] "Apply All" button works
- [ ] Can manually change any dropdown
- [ ] Changes reflected in prompt preview

### Prompt Preview
- [ ] Prompt preview section visible
- [ ] Click to expand/collapse works
- [ ] Shows character count
- [ ] Updates when selections change
- [ ] Updates when custom prompt added

### Image Generation
- [ ] Can select number of images (1, 2, 4)
- [ ] Can select image provider
- [ ] "Generate Images with AI" button works
- [ ] Loading state shows during generation
- [ ] Generated images display correctly

### Logs Sidebar
- [ ] Logs button visible in bottom-right
- [ ] Click opens logs sidebar
- [ ] Logs show timestamps
- [ ] Logs color-coded by type (info/success/error)
- [ ] Can clear logs
- [ ] Can close sidebar

### Re-analyze
- [ ] "Re-analyze" button visible after analysis
- [ ] Click re-runs analysis
- [ ] New suggestions generated
- [ ] Prompt preview updates

---

## Common Issues

❌ **"Cannot GET /api/prompt-options"**
- Fix: Ensure promptOptionsRoutes imported in server.js

❌ **Dropdowns empty**
- Fix: Run `npm run seed-options`

❌ **"Cannot find module './models/PromptOption'"**
- Fix: Create backend/models/PromptOption.js

❌ **Prompt preview empty**
- Fix: Ensure buildPrompt endpoint exists in aiController.js

❌ **No AI suggestions**
- Fix: Check extractSuggestions() function in frontend

❌ **Auto mode not working**
- Fix: Check mode state and useEffect dependencies

---

## Success Criteria

- ✅ All checkboxes above checked
- ✅ Can complete full workflow: Upload → Analyze → Generate
- ✅ No console errors
- ✅ No [object Object] in UI
- ✅ Logs show detailed information
- ✅ Database has 53+ options

---

## Performance Benchmarks

- Analysis: 5-15 seconds
- Prompt building: < 1 second
- Image generation: 20-60 seconds
- Total workflow: < 2 minutes

---

## Ready for Production?

- [ ] All tests pass
- [ ] Error handling works
- [ ] Loading states clear
- [ ] User feedback adequate
- [ ] Documentation complete
- [ ] .env.example up to date
