# Google Drive Integration Documentation

Complete guide for integrating Google Drive API with the Smart Wardrobe application for cloud-based media management and batch processing.

## Table of Contents

1. [Overview](#overview)
2. [Setup & Configuration](#setup--configuration)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Batch Processing](#batch-processing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Google Drive integration provides:

- **Cloud Storage**: Upload and manage media (images, videos, audio, templates) directly on Google Drive
- **Intelligent Organization**: Automatic folder structure with inputs, outputs, templates, and analytics
- **Media Management**: Browse, search, download, and organize media by type and collection
- **Batch Processing**: Create batches from cloud folders with automatic media detection
- **Real-time Monitoring**: WebSocket-based progress tracking for batch operations
- **Gallery Integration**: Display cloud media in the existing gallery interface
- **Smart Caching**: 5-minute cache for fast media browsing

## Setup & Configuration

### Prerequisites

- Google Drive API Key (already in `.env`)
- Node.js 16+
- Existing Smart Wardrobe backend running

### Environment Variables

```env
# .env (backend root)
DRIVE_API_KEY=AIzaSyAXu74opVlrRL5FU8Rmai1nCcDyFxKJHNY
```

### Folder Structure (Auto-created)

When you initialize the gallery, Google Drive automatically creates this structure:

```
SmartWardrobe-Production/
├── inputs/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── documents/
├── outputs/
│   ├── generated-videos/
│   ├── processed-images/
│   ├── batch-results/
│   ├── reports/
│   └── thumbnails/
├── templates/
├── media-library/
│   ├── videos/
│   ├── images/
│   ├── audio/
│   ├── templates/
│   └── presets/
├── batches/
│   └── {batchName}-{batchId}/
│       ├── inputs/
│       ├── outputs/
│       └── logs/
└── analytics/
```

---

## Architecture

### Service Layers

#### 1. **googleDriveService.js** (Low-level)
Core Google Drive API wrapper

**Key Methods:**
- `initialize()` - Creates folder hierarchy
- `uploadFile(filePath, folderId)` - Single file upload
- `uploadLargeFile(filePath, folderId)` - Resumable upload for large files (>5MB)
- `downloadFile(fileId, outputDir)` - Download file to local storage
- `listFiles(folderId, recursive)` - Browse folders
- `getFileMetadata(fileId)` - Get file details
- `createBatchFolder(batchName, batchId)` - Create batch-specific folders
- `getFolderStats(folderId)` - Get folder statistics
- `searchFiles(query, folderId)` - Search across Drive

**Dependencies:**
- `axios` - HTTP requests
- `fs` - File system operations

#### 2. **cloudMediaManager.js** (Middle layer)
Unified interface for media operations

**Key Methods:**
- `uploadMedia(filePath, type, tags)` - Upload with type detection
- `getMediaByType(type)` - Retrieve all media of type
- `getMediaOverview()` - Aggregate all media with statistics
- `organizeMediaByCollection()` - Group media by collection tags
- `generateGalleryUrls()` - Create gallery-ready URLs
- `manageBatchMedia(batchId, operation, items)` - Batch-specific operations

**Features:**
- Automatic MIME type detection
- 5-minute cache for performance
- Collection-based organization from filename patterns

#### 3. **Controllers** (High-level API)

**cloudGalleryController.js**
- REST endpoints for gallery features
- File upload/download handling
- Search and preview generation
- Media overview aggregation

**cloudBatchQueueController.js**
- Batch creation and management
- Queue status monitoring
- Async and sync processing options
- Output file retrieval

---

## API Endpoints

### Gallery Endpoints

**Base URL:** `/api/cloud-gallery`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/init` | Initialize gallery (create folder structure) |
| GET | `/library` | Get media library overview |
| GET | `/type/:type` | Get media by type (image, video, audio, template) |
| POST | `/upload` | Upload media file |
| POST | `/download/:fileId` | Download file to local storage |
| GET | `/preview/:fileId` | Get media preview |
| GET | `/search?query=...&type=...` | Search media |
| GET | `/urls` | Get all gallery URLs |
| GET | `/collections` | Organize by collections |
| POST | `/batch-media` | Manage batch media |

### Batch Queue Endpoints

**Base URL:** `/api/batch-queue`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/init` | Initialize batch queue |
| POST | `/create` | Create new batch |
| GET | `/all` | List all batches |
| GET | `/:batchId/status` | Get batch status |
| POST | `/:batchId/process` | Process batch (async) |
| POST | `/:batchId/process-sync` | Process batch (wait for completion) |
| POST | `/:batchId/add-item` | Add item to batch |
| GET | `/:batchId/output` | Get output files |
| DELETE | `/:batchId` | Delete batch |
| GET | `/stats` | Get queue statistics |
| POST | `/:batchId/next-item` | Process next item |

---

## Frontend Integration

### Installation

1. **Add Cloud Gallery Page**

```jsx
// frontend/src/pages/CloudGallery.jsx
import { CloudGallery } from './pages/CloudGallery';
```

2. **Add Cloud Batch Queue Page**

```jsx
// frontend/src/pages/CloudBatchQueue.jsx
import { CloudBatchQueue } from './pages/CloudBatchQueue';
```

3. **Update Router**

```jsx
// frontend/src/App.jsx
import CloudGallery from './pages/CloudGallery';
import CloudBatchQueue from './pages/CloudBatchQueue';

<Routes>
  <Route path="/cloud-gallery" element={<CloudGallery />} />
  <Route path="/cloud-batch" element={<CloudBatchQueue />} />
</Routes>
```

### Component Features

#### CloudGallery Component
- Grid/List view toggle
- Search functionality
- Media type filtering
- Collection browser
- Download/Delete options
- Real-time upload status

#### CloudBatchQueue Component
- Create batches from cloud folders
- Monitor batch processing
- View batch statistics
- Download output files
- Real-time progress via WebSocket
- Async/Sync processing options

---

## Batch Processing

### Creating a Batch

```javascript
POST /api/batch-queue/create

{
  "name": "My Photo Batch",
  "type": "image",
  "config": {
    "inputFolder": "inputs/images",
    "recursive": true
  }
}
```

### Processing a Batch

**Asynchronous (Non-blocking):**
```javascript
POST /api/batch-queue/{batchId}/process
```

**Synchronous (Waits for completion):**
```javascript
POST /api/batch-queue/{batchId}/process-sync
```

### Batch Status

```javascript
GET /api/batch-queue/{batchId}/status

Response:
{
  "success": true,
  "data": {
    "id": "batch-123",
    "name": "My Photo Batch",
    "status": "processing",
    "type": "image",
    "itemCount": 10,
    "completedCount": 3,
    "progress": 30,
    "items": [
      {
        "name": "photo1.jpg",
        "status": "completed",
        "cloudPath": "gs://..."
      }
    ]
  }
}
```

### Processing Flow

1. **Download** - Media downloaded from Google Drive to temp storage
2. **Process** - Apply transformations (image effects, video generation, etc.)
3. **Upload** - Results uploaded to batch output folder
4. **Track** - Progress emitted via WebSocket for real-time UI updates

---

## Usage Examples

### Example 1: Upload Image and Use in Gallery

```bash
# Frontend: Select file from CloudGallery
# - Choose file
# - Click "Upload File"
# - Select type: "Images"
# - File uploaded to: inputs/images/ on Google Drive
```

### Example 2: Create Batch from Cloud Folder

```javascript
// Frontend: Navigate to CloudBatchQueue
// - Click "Create New Batch"
// - Name: "Q1 Assets"
// - Type: "video"
// - Input Folder: "media/videos"
// - Check Recursive
// - Click Create

// Backend automatically:
// 1. Scans media/videos recursively
// 2. Detects all video files
// 3. Creates batch with detected items
// 4. Creates batch/Q1-Assets-{id}/ folder structure
```

### Example 3: Process Batch with Progress Monitoring

```javascript
// Frontend: Click "Process Async"
const batchId = "batch-123";

// Backend:
// 1. Starts async processing
// 2. Emits WebSocket events: batch-created, item-processing, item-completed
// 3. Downloads item from cloud
// 4. Applies processing logic
// 5. Uploads result to outputs/
// 6. Emits completion event

// Frontend receives updates in real-time
// Progress bar updates automatically
```

---

## Error Handling

### Common Issues

#### 1. API Key Invalid
```
Error: Invalid Google Drive API key
Solution: Verify DRIVE_API_KEY in .env
```

#### 2. Folder Not Found
```
Error: Root folder not found
Solution: Run POST /api/cloud-gallery/init first
```

#### 3. Upload Failed
```
Error: File too large
Solution: Use resumable upload for files >5MB (automatic in cloudMediaManager)
```

#### 4. Batch Processing Stalled
```
Error: Item processing timeout
Solution: Increase request timeout in server.js or check processing logic
```

---

## Performance Optimization

### Caching Strategy

- **Media Metadata**: Cached for 5 minutes
- **Preview Images**: Cached for 5 minutes  
- **Folder Listings**: Cached for 5 minutes

Clear cache with:
```javascript
POST /api/cloud-gallery/cache/clear
```

### Concurrent Processing

- **Max concurrent items**: 3 (configurable in cloudBatchQueue.js)
- **Queue system**: Automatically manages item order
- **WebSocket updates**: Real-time progress without polling

---

## Testing

### Run Integration Tests

```bash
cd backend
npm test -- test-cloud-integration.js
```

### Manual Testing Checklist

- [ ] Navigate to Cloud Gallery
- [ ] Initialize gallery (check Google Drive)
- [ ] Upload test image
- [ ] View uploaded image in library
- [ ] Search for media
- [ ] Navigate to Cloud Batch Queue
- [ ] Create batch from cloud folder
- [ ] Process batch (async)
- [ ] Monitor progress
- [ ] Download output files
- [ ] Check Google Drive for organized folders

---

## Advanced Configuration

### Modify Max Concurrent Processing

**File:** `backend/services/cloudBatchQueue.js`

```javascript
// Change this value (currently 3)
const MAX_CONCURRENT_PROCESSING = 3;
```

### Customize Cache Duration

**File:** `backend/services/cloudMediaManager.js`

```javascript
// Change this value (currently 5 minutes = 300000ms)
const CACHE_EXPIRY = 300000; // 5 minutes
```

### Change Upload Directory

**File:** `backend/server.js`

```javascript
const uploadTempDir = path.join(process.cwd(), 'uploads', 'temp');
// Change path as needed
```

---

## Troubleshooting

### Server won't start

1. Check if port 3000 is available
2. Ensure `.env` has DRIVE_API_KEY set
3. Check Node.js version (16+)
4. Clear node_modules and reinstall

### Gallery initialization fails

1. Verify internet connection
2. Check Google Drive is accessible
3. Verify API key is valid
4. Check firewall/proxy settings

### Files not appearing in library

1. Wait 5 seconds (cache initialized)
2. Refresh browser
3. Check Google Drive manually
4. Try POST /api/cloud-gallery/cache/clear

### Batch processing stuck

1. Check server logs for errors
2. Verify processing logic is implemented
3. Try sync processing to see actual error
4. Check available disk space for temp files

### WebSocket not connecting

1. Ensure server supports WebSocket
2. Check browser console for errors
3. Verify cors configuration
4. Try refreshing the page

---

## Future Enhancements

- [ ] Image preview thumbnails in gallery
- [ ] Video thumbnail generation
- [ ] Advanced search filters
- [ ] Batch scheduling
- [ ] Automatic batch creation from folder changes
- [ ] Processing templates
- [ ] Analytics dashboard
- [ ] Export batch results as ZIP
- [ ] Sharing permissions management
- [ ] Activity log/audit trail

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs (`backend/logs/`)
3. Test with `test-cloud-integration.js`
4. Check browser console for frontend errors
5. Verify Google Drive folder structure manually

---

## License

This Google Drive integration is part of the Smart Wardrobe project.
