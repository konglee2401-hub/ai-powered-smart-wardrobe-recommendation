# Google Drive Integration - Quick Setup Guide

This guide helps you quickly integrate the Cloud Gallery and Cloud Batch Queue features into your Smart Wardrobe frontend.

## Prerequisites

- Backend server running (`npm start` in backend directory)
- Google Drive API key already configured in `.env`
- Frontend React application running

## Step 1: Backend Routes Already Mounted ✅

Routes are already added to `backend/server.js`:
- `GET /api/cloud-gallery/*` - 14 gallery endpoints
- `GET /api/batch-queue/*` - 12 batch queue endpoints

**No additional backend setup needed.**

## Step 2: Add Components to Frontend

### Option A: Add as Separate Pages

1. **Copy the components** to your frontend:

```bash
# Place these files in your frontend/src/pages/
frontend/src/pages/CloudGallery.jsx
frontend/src/pages/CloudBatchQueue.jsx
```

2. **Update your router** (e.g., `frontend/src/App.jsx`):

```jsx
import CloudGallery from './pages/CloudGallery';
import CloudBatchQueue from './pages/CloudBatchQueue';

<Routes>
  {/* Existing routes */}
  <Route path="/gallery/cloud" element={<CloudGallery />} />
  <Route path="/batch/cloud" element={<CloudBatchQueue />} />
</Routes>
```

3. **Add navigation links**:

```jsx
// In your main navigation or menu
<Link to="/gallery/cloud">Cloud Gallery</Link>
<Link to="/batch/cloud">Cloud Batch Queue</Link>
```

### Option B: Add as Modal/Tab Components

Use the same components but render them in modals or tabs:

```jsx
// Example: Add to existing Gallery page
import { useState } from 'react';
import CloudGallery from './components/CloudGallery';

export function GalleryPage() {
  const [showCloudGallery, setShowCloudGallery] = useState(false);

  return (
    <div>
      <button onClick={() => setShowCloudGallery(true)}>
        View Cloud Gallery
      </button>
      
      {showCloudGallery && (
        <CloudGallery onClose={() => setShowCloudGallery(false)} />
      )}
    </div>
  );
}
```

## Step 3: Initialize Gallery (First Time Only)

The first time users visit the Cloud Gallery:

```javascript
// This happens automatically when component mounts
POST /api/cloud-gallery/init

// Creates folder structure on Google Drive:
// SmartWardrobe-Production/
//   ├── inputs/
//   ├── outputs/
//   ├── templates/
//   ├── media-library/
//   ├── batches/
//   └── analytics/
```

**Check your Google Drive** - folder should appear within 5 seconds.

## Step 4: Test the Integration

### Quick Test Checklist

```bash
# Terminal 1: Backend running
cd backend && npm start

# Terminal 2: Frontend running  
cd frontend && npm run dev

# In browser:
1. Navigate to Cloud Gallery (or /gallery/cloud)
2. Wait for initialization complete
3. Check Google Drive browser tab - "SmartWardrobe-Production" folder created?
4. ✓ If yes, integration is working!
```

### Test Batch Queue

```
1. Navigate to Cloud Batch Queue (or /batch/cloud)
2. Fill in batch creation form:
   - Name: "Test Batch"
   - Type: "image"
   - Input Folder: "inputs/images"
   - Check "Recursive"
3. Click "Create Batch"
4. Should see batch in left panel with status "pending"
5. ✓ If yes, batch queue is ready!
```

## Step 5: Optional - Add Processing Logic

If you want batches to actually process files:

### Update `backend/services/cloudBatchQueue.js`

Find the `processItem()` method and implement actual logic:

```javascript
async processItem(item, batchId) {
  // Download from cloud
  const localPath = await this.drive.downloadFile(
    item.cloudId,
    './temp'
  );

  // Process based on type
  let result;
  if (item.type === 'image') {
    // TODO: Use your image processing service
    result = await imageProcessingService.process(localPath);
  } else if (item.type === 'video') {
    // TODO: Use your video processing service
    result = await videoProcessingService.process(localPath);
  }

  // Upload result to batch outputs
  const outputPath = await this.drive.uploadFile(
    result,
    this.batchFolders[batchId].outputs
  );

  return outputPath;
}
```

## Prerequisites for Features

### Upload to Cloud
- [ ] Frontend has file input
- [ ] `cloudGalleryRoutes.js` has upload endpoint (✅ already done)
- [ ] `./uploads/temp` directory exists (✅ auto-created by server.js)

### Batch Processing  
- [ ] cloudBatchQueue.js initialized (✅ done)
- [ ] Processing logic implemented (⚠️ needs your custom code)
- [ ] Event emitters working (✅ done)

### Gallery Display
- [ ] CloudGallery component added (✅ created)
- [ ] API endpoints working (✅ mounted)
- [ ] Caching functioning (✅ 5-min cache)

### Real-time Updates
- [ ] WebSocket connection (✅ handled by Socket.IO)
- [ ] CloudBatchQueue component (✅ created)
- [ ] Event listeners active (✅ mounted)

## Troubleshooting

### "Failed to initialize gallery"
```
1. Check browser console for error message
2. Verify API_BASE in component matches your backend
3. Ensure server is running on correct port
4. Check DRIVE_API_KEY in .env
```

### "Folder not created on Google Drive"
```
1. Check Google Drive is logged in
2. Wait 10 seconds and refresh
3. Go to drive.google.com and search for "SmartWardrobe"
4. Check server logs for API errors
```

### "Upload shows 'uploading' forever"
```
1. Check network tab in browser DevTools
2. Ensure file is not too large (>100MB needs special handling)
3. Check server logs for timeouts
4. Try smaller test file first
```

### "Batch won't process"
```
1. Verify batch has items (check in batch detail panel)
2. Check that input files exist on Google Drive
3. Implement processing logic (see Step 5)
4. Check server logs for processing errors
```

## API Testing (without Frontend)

### Test Gallery Init
```bash
curl -X POST http://localhost:3000/api/cloud-gallery/init
```

### Test Media Library Load
```bash
curl http://localhost:3000/api/cloud-gallery/library
```

### Test Batch Creation
```bash
curl -X POST http://localhost:3000/api/batch-queue/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Batch",
    "type": "image",
    "config": {
      "inputFolder": "inputs/images",
      "recursive": true
    }
  }'
```

### Run Full Test Suite
```bash
cd backend
npm test -- test-cloud-integration.js
```

## Environment Check

Run this to verify setup:

```bash
# Backend check
cd backend
npm list axios body-parser express multer

# Should show all packages installed

# Frontend check  
cd frontend
npm list axios react react-hot-toast lucide-react

# Should show all packages installed
```

## File Structure

After integration, your project should look like:

```
frontend/
  src/
    pages/
      CloudGallery.jsx      ← New
      CloudBatchQueue.jsx   ← New
    App.jsx                 ← Updated (added routes)

backend/
  controllers/
    cloudGalleryController.js     ← Already created
    cloudBatchQueueController.js  ← Already created
  services/
    googleDriveService.js         ← Already created
    cloudMediaManager.js          ← Already created
    cloudBatchQueue.js            ← Already created
  routes/
    cloudGalleryRoutes.js         ← Already created
    cloudBatchQueueRoutes.js      ← Already created
  server.js                        ← Updated (routes mounted)
  test-cloud-integration.js        ← Already created

Google Drive (Cloud):
  SmartWardrobe-Production/        ← Auto-created
    inputs/
    outputs/
    templates/
    media-library/
    batches/
    analytics/
```

## Performance Tips

1. **Lazy load components**: Only load gallery when user clicks
2. **Use pagination**: For large media libraries (100+files)
3. **Enable caching**: Already enabled (5-min cache)
4. **Batch in groups**: Process 3-5 items at a time
5. **Monitor disk space**: Temp files cleaned up automatically

## Next Steps

1. ✅ Components created and documented
2. ✅ Routes mounted in backend
3. ✅ Environment configured
4. → Add to your frontend router and navigation
5. → Test with Cloud Gallery initialization
6. → Implement custom processing logic
7. → Add to your deployment pipeline

## Support Resources

- Full documentation: [GOOGLE_DRIVE_INTEGRATION.md](./GOOGLE_DRIVE_INTEGRATION.md)
- Test suite: `backend/test-cloud-integration.js`
- API endpoints: See documentation
- Component props: Check JSDoc comments in components

---

**Ready to integrate?** 🚀

1. Copy components to frontend
2. Update router
3. Add navigation links
4. Test initialization
5. Implement processing logic (optional)

**Done!** Your app now has cloud storage and batch processing capabilities.
