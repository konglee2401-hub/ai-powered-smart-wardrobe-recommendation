# 📺 Video Mass Production - Frontend Integration & Data Flow Analysis

## 🎯 Executive Summary

Hệ thống video mass production hiện tại có backend hoàn thiện nhưng **frontend chưa tích hợp đầy đủ**. Cần phải:
1. **Hiểu rõ data flow**: Từ upload video → queue → processging → output
2. **Xác định storage locations**: Mỗi file được lưu ở đâu
3. **Tạo UI workflow trực quan**: Cho phép user control từng bước
4. **Build end-to-end test flow**: Upload → Queue → Process → Upload → Output

---

## 🏗️ System Architecture Overview

### **Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INPUTS                                  │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│   Upload     │  Select      │  Select      │   Configure        │
│   Source     │  Template    │  Audio       │   Parameters       │
│   Videos     │   Videos     │   Track      │   & Accounts       │
└──────────────┴──────────────┴──────────────┴────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              QUEUE MANAGEMENT LAYER                             │
├──────────────────────────────────────────────────────────────────┤
│ Status: PENDING → PROCESSING → READY → UPLOADED → SUCCESS/FAIL  │
│ Storage: /backend/media/queue/queue.json                         │
│ Process Log: /backend/media/queue/process-log.json               │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              GENERATION LAYER                                   │
├──────────────────────────────────────────────────────────────────┤
│ • Select/Download source & template video                        │
│ • Extract metadata (duration, dimensions)                        │
│ • Generate Product Video (if needed)                             │
│ • Mashup 2 videos (2/3 + 1/3 layout)                            │
│ • Add audio track with fade in/out                               │
│ • Add captions/effects                                           │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              OUTPUT STORAGE LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│ Generated Video: /backend/media/mashups/{queueId}.mp4            │
│ Screenshots: /backend/media/mashups/{queueId}-thumb.png          │
│ Metadata: /backend/media/mashups/{queueId}.json                  │
└──────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              UPLOAD LAYER                                       │
├──────────────────────────────────────────────────────────────────┤
│ Register Upload: /api/uploads/register (queueId + accountId)     │
│ Select Account: TikTok, YouTube, Facebook                        │
│ Apply Platform Settings: Resolution, fps, bitrate                │
│ Upload Status: /backend/media/uploads/uploads.json               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Storage Structure - Where Everything Lives

### **Backend Media Directory**

```
backend/media/
├── queue/
│   ├── queue.json              # All queue items (status, metadata, paths)
│   └── process-log.json        # Processing logs (errors, timestamps)
│
├── templates/                  # Template videos for mashup (1/3 screen)
│   ├── template-1.mp4
│   ├── template-2.mp4
│   └── metadata.json           # Template metadata index
│
├── hot-videos/                 # Downloaded trending videos (can be deleted after use)
│   ├── hot-1.mp4
│   ├── hot-2.mp4
│   └── library.json
│
├── audio/                      # Music library (royalty-free)
│   ├── upbeat/
│   │   ├── upbeat-1.mp3
│   │   └── upbeat-2.mp3
│   ├── calm/
│   ├── trending/
│   └── metadata.json           # Audio metadata & usage count
│
├── products/                   # Generated or uploaded product videos
│   ├── product-1-sample.mp4
│   └── metadata.json
│
├── mashups/                    # ⭐ FINAL OUTPUT - Generated mashup videos
│   ├── queue-001-qwerty.mp4    # Format: queue-{sequence}-{queueId}.mp4
│   ├── queue-001-qwerty-thumb.png
│   ├── queue-001-qwerty.json   # Metadata: inputs, settings, quality
│   └── library-index.json      # All mashups registry
│
├── uploads/                    # Upload tracking
│   ├── uploads.json            # Upload status & platform-specific data
│   └── retry-failed.json       # Failed uploads for retry
│
├── accounts/
│   ├── accounts.json           # Encrypted account credentials
│   └── rotation-mapping.json   # Account rotation strategy
│
├── cron/                       # Cron job tracking
│   ├── jobs.json               # Scheduled jobs (generate, upload, cleanup)
│   └── execution-history.json
│
└── library-index.json          # Master index of all media
```

---

## 🔄 Complete End-to-End Workflow

### **Scenario 1: Upload Video (2→1 Mashup for YouTube)**

#### **Step 1: User Upload Source Video**

**Frontend:**
```jsx
// VideoMashupCreator.jsx
const handleUploadSource = async (file) => {
  // Upload to server
  const formData = new FormData();
  formData.append('videoFile', file);
  formData.append('contentType', 'source');
  
  const response = await fetch('/api/media/upload-source', {
    method: 'POST',
    body: formData
  });
  
  const { mediaId, path } = await response.json();
  // mediaId: identifier for this video
  // path: /backend/media/products/media-uuid.mp4
};
```

**Backend Storage:**
```
/backend/media/products/{mediaId}.mp4
/backend/media/products/{mediaId}.json (metadata)
  {
    "mediaId": "uuid",
    "type": "source",
    "uploadedAt": "2024-02-23T...",
    "duration": 45,
    "width": 1080,
    "height": 1920,
    "size": 52428800
  }
```

#### **Step 2: User Selects Template Video from Library**

**Frontend:**
```jsx
// VideoMashupCreator.jsx
const handleSelectTemplate = async (platform = 'youtube') => {
  // Get random template or user selects from list
  const response = await fetch(
    `/api/video-production/media/random/template?platform=${platform}`
  );
  
  const { data } = await response.json();
  // data: {
  //   mediaId: "template-uuid",
  //   filePath: "/backend/media/templates/template-uuid.mp4",
  //   duration: 15,
  //   thumbnail: "data:image/..."
  // }
};
```

**Backend Storage (Templates):**
```
/backend/media/templates/template-uuid.mp4
/backend/media/templates/metadata.json
  {
    "templates": [
      {
        "mediaId": "template-1-uuid",
        "name": "Modern Showcase",
        "platform": "youtube",
        "duration": 15,
        "dimensions": "1080x1920",
        "usageCount": 45
      }
    ]
  }
```

#### **Step 3: User Selects Audio Track**

**Frontend:**
```jsx
const handleSelectAudio = async (mood = 'upbeat') => {
  const response = await fetch(
    `/api/video-production/media/random/audio?mood=${mood}`
  );
  
  const { data } = await response.json();
  // data: {
  //   mediaId: "audio-uuid",
  //   name: "Energetic Beats",
  //   category: "upbeat",
  //   duration: 120,
  //   path: "/backend/media/audio/upbeat/audio-uuid.mp3"
  // }
};
```

**Backend Storage (Audio):**
```
/backend/media/audio/
├── upbeat/
│   ├── upbeat-1-uuid.mp3
│   └── upbeat-2-uuid.mp3
├── metadata.json
  {
    "audios": [
      {
        "mediaId": "audio-uuid",
        "name": "Energetic Beats",
        "category": "upbeat",
        "mood": "energetic",
        "duration": 120,
        "usageCount": 23
      }
    ]
  }
```

#### **Step 4: Create Queue Item**

**Frontend:**
```jsx
const handleCreateMashup = async () => {
  const videoConfig = {
    layout: 'side-by-side',           // 2/3 main + 1/3 template
    duration: 30,
    platform: 'youtube',
    sourceMediaId: 'source-uuid',     // User uploaded video
    templateMediaId: 'template-uuid', // Selected template
    audioMediaId: 'audio-uuid',       // Selected audio
    effects: ['fade-transition'],
    captionStyle: 'ai-generated'
  };
  
  const response = await fetch('/api/video-production/queue/add', {
    method: 'POST',
    body: JSON.stringify({
      videoConfig,
      platform: 'youtube',
      contentType: 'hot_mashup',
      priority: 'high'
    })
  });
  
  const { queueItem } = await response.json();
  // queueItem.queueId: "queue-123abc..."
  // queueItem.status: "pending"
  // queueItem.createdAt: "2024-02-23T..."
};
```

**Backend Storage (Queue):**
```
/backend/media/queue/queue.json
{
  "items": [
    {
      "queueId": "queue-20240223-001-abc123",
      "videoConfig": {
        "layout": "side-by-side",
        "duration": 30,
        "platform": "youtube",
        "sourceMediaId": "source-uuid",
        "templateMediaId": "template-uuid",
        "audioMediaId": "audio-uuid"
      },
      "contentType": "hot_mashup",
      "platform": "youtube",
      "priority": "high",
      "status": "pending",
      "createdAt": "2024-02-23T10:30:00Z",
      "startedAt": null,
      "completedAt": null,
      "videoPath": null,
      "errorCount": 0,
      "errorLog": []
    }
  ]
}
```

#### **Step 5: Process Queue (Manual or Auto)**

**Frontend - Manual Trigger:**
```jsx
const handleProcessQueue = async () => {
  const response = await fetch('/api/video-production/workflow/process-next', {
    method: 'POST'
  });
  
  const result = await response.json();
  // result.success: true/false
  // result.message: "Processing started..."
  // Track progress via polling getQueueItem()
};

// Monitor processing progress
const pollQueueStatus = async (queueId) => {
  const response = await fetch(
    `/api/video-production/queue/${queueId}`
  );
  
  const { data } = await response.json();
  // data.status: "processing" | "ready" | "failed"
  // data.videoPath: "/backend/media/mashups/queue-001-abc123.mp4"
  // data.processingLogs: [{ timestamp, stage, status, duration }]
};
```

**Backend Processing (Service Layer):**
```javascript
// VideoMashupService.generateMashupVideo()
// Process steps:
// 1. Load source video from /backend/media/products/source-uuid.mp4
// 2. Load template from /backend/media/templates/template-uuid.mp4
// 3. Load audio from /backend/media/audio/upbeat/audio-uuid.mp3
// 4. FFmpeg merge: side-by-side layout
// 5. Add audio with fade in/out
// 6. Encode to platform specs
// 7. Generate thumbnail
// 8. Save to /backend/media/mashups/
```

**Process Log Entry:**
```
/backend/media/queue/process-log.json
{
  "processId": "proc-20240223-001",
  "queueId": "queue-20240223-001-abc123",
  "stages": [
    {
      "stage": "load-source",
      "status": "completed",
      "duration": 1000,
      "timestamp": "2024-02-23T10:30:05Z"
    },
    {
      "stage": "merge-videos",
      "status": "completed",
      "duration": 3500,
      "timestamp": "2024-02-23T10:30:08Z"
    },
    {
      "stage": "add-audio",
      "status": "completed",
      "duration": 2000,
      "timestamp": "2024-02-23T10:30:10Z"
    },
    {
      "stage": "encode",
      "status": "completed",
      "duration": 8000,
      "timestamp": "2024-02-23T10:30:18Z"
    }
  ],
  "totalDuration": 14500,
  "finalStatus": "success",
  "outputPath": "/backend/media/mashups/queue-001-abc123.mp4"
}
```

#### **Step 6: Output Generated & Ready**

**Backend Storage (Mashup Output):**
```
/backend/media/mashups/
├── queue-001-abc123.mp4        # Final video (1920x1080, 30s, h264)
├── queue-001-abc123-thumb.png  # Thumbnail (1280x720)
└── queue-001-abc123.json       # Metadata
  {
    "queueId": "queue-20240223-001-abc123",
    "inputSource": "source-uuid",
    "inputTemplate": "template-uuid",
    "inputAudio": "audio-uuid",
    "outputPath": "/backend/media/mashups/queue-001-abc123.mp4",
    "status": "ready",
    "metadata": {
      "duration": 30,
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "bitrate": "5000k",
      "codec": "h264",
      "fileSize": 18750000
    },
    "generatedAt": "2024-02-23T10:30:18Z",
    "quality": "high"
  }
```

#### **Step 7: Register Upload to Platform Account**

**Frontend:**
```jsx
const handleUploadToPlatform = async (queueId, accountId) => {
  // 1. Get generated video path from queue
  const queueResponse = await fetch(
    `/api/video-production/queue/${queueId}`
  );
  const { data: queueItem } = await queueResponse.json();
  
  // 2. Register upload
  const uploadResponse = await fetch('/api/video-production/uploads/register', {
    method: 'POST',
    body: JSON.stringify({
      queueId,
      videoPath: queueItem.videoPath,  // /backend/media/mashups/queue-001-abc123.mp4
      platform: 'youtube',
      accountId,
      uploadConfig: {
        title: 'Fashion Mashup - Hot Trending',
        description: 'Amazing fashion transformation...',
        tags: ['fashion', 'trending', 'viral'],
        thumbnail: `${queueItem.videoPath}-thumb.png`,
        visibility: 'public'
      }
    })
  });
  
  const { uploadId } = await uploadResponse.json();
  // uploadId: "upload-20240223-001-xyz789"
};
```

**Backend Storage (Upload):**
```
/backend/media/uploads/uploads.json
{
  "uploads": [
    {
      "uploadId": "upload-20240223-001-xyz789",
      "queueId": "queue-20240223-001-abc123",
      "videoPath": "/backend/media/mashups/queue-001-abc123.mp4",
      "platform": "youtube",
      "accountId": "acc-youtube-001",
      "status": "pending",           // pending → uploading → success/failed
      "createdAt": "2024-02-23T10:30:20Z",
      "startedAt": null,
      "completedAt": null,
      "uploadUrl": null,
      "fileSize": 18750000,
      "duration": 30,
      "retries": 0,
      "maxRetries": 3,
      "errorLog": []
    }
  ]
}
```

#### **Step 8: Process Upload & Track Results**

**Frontend - Monitor Upload:**
```jsx
const pollUploadStatus = async (uploadId) => {
  const response = await fetch(
    `/api/video-production/uploads/${uploadId}`
  );
  
  const { data } = await response.json();
  // data.status: "uploading" | "success" | "failed"
  // data.uploadUrl: "https://youtube.com/watch?v=..." (if success)
  // data.platformResponse: { videoId, duration, views, etc }
};
```

---

## 🎬 Video Type Examples

### **Example 1: Hot Video Download (For TikTok)**

```
TikTok Shop Strategy:
├─ Purpose: Product promo videos on TikTok Shop
├─ Duration: 20-30 seconds
├─ Layout: Full screen product showcase
└─ Upload: Direct TikTok Shop API

Storage Path: /backend/media/products/{productId}.mp4
Queue Flow: PENDING → PROCESSING → READY → UPLOADED
```

### **Example 2: YouTube Mashup (2→1)**

```
YouTube Strategy:
├─ Purpose: Viral fashion transformation mashup
├─ Layout: 2/3 trending video + 1/3 template
├─ Policy: Ensure original content > 50%
├─ Duration: 30-60 seconds
└─ Compliance: Add watermark + attribution

Process:
1. User uploads hot video: /backend/media/products/hot-video.mp4
2. System selects template: /backend/media/templates/template-123.mp4
3. Select audio: /backend/media/audio/upbeat/audio-456.mp3
4. Mashup: FFmpeg side-by-side merge
5. Output: /backend/media/mashups/queue-001-abc123.mp4
6. Upload to YouTube account
```

### **Example 3: Facebook Reels (Xào Nấu)**

```
Facebook Strategy:
├─ Purpose: Spam view + viral strategy
├─ Layout: Similar to YouTube mashup
├─ Content: Hot trending videos + templates
├─ Duration: 15-30 seconds
└─ Multi-account: Distribute across 5 accounts

Process:
1. Download hot videos from social platforms
2. Auto-select templates based on viral trends
3. Generate mashups in batches
4. Upload to multiple accounts with time gaps
5. Monitor view counts & engagement
```

---

## ⚡ CronJob Automation

### **Scheduled Jobs Storage**

```
/backend/media/cron/jobs.json
{
  "jobs": [
    {
      "jobId": "job-generate-daily",
      "name": "Generate Daily Videos",
      "schedule": "0 10 * * *",           # 10 AM daily
      "jobType": "generate",
      "platform": "all",
      "enabled": true,
      "metadata": {
        "videosPerRun": 5,
        "contentType": "hot_mashup",
        "platforms": ["youtube", "tiktok", "facebook"]
      },
      "createdAt": "2024-01-01T...",
      "lastRun": "2024-02-23T10:00:00Z",
      "nextRun": "2024-02-24T10:00:00Z",
      "successfulRuns": 57,
      "failedRuns": 2
    },
    {
      "jobId": "job-upload-hourly",
      "name": "Upload Ready Videos",
      "schedule": "0 * * * *",             # Every hour
      "jobType": "upload",
      "platform": "youtube",
      "enabled": true,
      "metadata": {
        "uploadsPerRun": 2,
        "accountRotation": true
      }
    },
    {
      "jobId": "job-cleanup-daily",
      "name": "Cleanup Old Videos",
      "schedule": "0 3 * * *",            # 3 AM daily
      "jobType": "cleanup",
      "platform": "all",
      "enabled": true,
      "metadata": {
        "keepDays": 7,
        "cleanupPaths": [
          "/backend/media/hot-videos/",
          "/backend/media/queue/"
        ]
      }
    }
  ]
}
```

### **Execution History**

```
/backend/media/cron/execution-history.json
{
  "executions": [
    {
      "executionId": "exec-20240223-001",
      "jobId": "job-generate-daily",
      "startedAt": "2024-02-23T10:00:00Z",
      "completedAt": "2024-02-23T10:14:30Z",
      "duration": 870000,
      "status": "success",
      "videosGenerated": 5,
      "queueItemsCreated": [
        "queue-20240223-001-abc123",
        "queue-20240223-002-def456"
      ]
    }
  ]
}
```

---

## 🎨 Frontend Components Needed

### **1. VideoMashupCreator** (Main Wizard)

```jsx
// Steps:
// 1. Upload Source Video
// 2. Select Template Video (Gallery)
// 3. Select Audio Track (Library)
// 4. Configure Mashup Settings
// 5. Select Platform & Accounts
// 6. Preview & Submit
// 7. Monitor Queue Status
```

### **2. QueueMonitor** (Tracking)

```jsx
// Display:
// - Queue stats (total, pending, processing, ready, failed)
// - Individual items with progress bars
// - Process logs & error details
// - Action buttons (Retry, Cancel, Reprocess)
```

### **3. MediaLibraryBrowser** (Selection)

```jsx
// Tabs:
// - Templates: Browse, preview, select
// - Hot Videos: Browse, category filter
// - Audio Tracks: Mood filter, preview
// - Products: Previously generated
```

### **4. AccountDistributor** (Multi-Account)

```jsx
// Show:
// - Available accounts per platform
// - Upload capability & cooldown
// - Account health metrics
// - Select account(s) for upload
```

### **5. ProcessingMonitor** (Real-time)

```jsx
// Display:
// - Current processing stage
// - Progress percentage
// - Estimated time remaining
// - Process logs streaming
// - Generated thumbnail preview
```

### **6. CronJobManager** (Automation)

```jsx
// Manage:
// - Create automated jobs
// - Schedule & cron expression editor
// - Enable/disable jobs
// - View execution history
// - Monitor next scheduled run
```

---

## 🐛 Current Issues

### **Issue 1: Frontend Missing Key Components**
```jsx
❌ VideoMashupCreator
❌ QueueMonitor  
❌ ProcessingMonitor (Real-time)
❌ CronJobManager UI
⚠️ MediaLibraryBrowser (Partial)
```

### **Issue 2: No Unified Data Flow UI**
```
- User can't see full journey: Upload → Queue → Process → Upload
- Queue status not auto-updating
- No visual feedback during processing
- Storage paths not transparent to user
```

### **Issue 3: No Direct File Upload/Managing**
```
- Can't upload source videos easily
- Can't download generated videos
- Can't manually manage media library
- Can't preview before queuing
```

### **Issue 4: No CronJob Automation UI**
```
- Can't create scheduled jobs
- Can't see execution history
- Can't test job manually
- No visual cron schedule builder
```

---

## ✅ Recommended Frontend Integration Plan

### **Phase 1: Core Upload & Queue UI (Priority 1)**

```jsx
// NEW: VideoProduction/VideoMashupCreator.jsx
- Step 1: Upload source video (drag-drop UI)
- Step 2: Gallery picker for templates
- Step 3: Audio library selector
- Step 4: Preview mashup settings
- Step 5: Select account & queue

// ENHANCE: VideoProduction/QueueStatus.jsx
- Real-time queue monitoring
- Individual item status with progress
- Process logs viewer
- Action buttons (retry, cancel)
```

### **Phase 2: Processing & Monitoring UI (Priority 2)**

```jsx
// NEW: VideoProduction/ProcessingMonitor.jsx
- Show current job processing
- Real-time stage tracking
- Estimated time calculation
- Generated thumbnail preview
- Browse generated output

// NEW: VideoProduction/DownloadManager.jsx
- Download generated videos
- Export metadata
- Share/copy URLs
```

### **Phase 3: Media Management & Automation (Priority 3)**

```jsx
// NEW: VideoProduction/MediaLibraryManager.jsx
- Template browser & upload
- Hot video importer
- Audio track organizer
- Usage statistics

// NEW: VideoProduction/CronJobBuilder.jsx
- Create scheduled jobs
- Cron expression editor
- Execution history
- Test job execution
```

---

## 📊 API Endpoints Reference

### **Queue Operations**
```
POST   /api/video-production/queue/add              # Add single video
POST   /api/video-production/queue/batch-add        # Add multiple
GET    /api/video-production/queue/stats            # Get statistics
GET    /api/video-production/queue/:queueId         # Get specific item
GET    /api/video-production/queue/:queueId/logs    # Get process logs
DELETE /api/video-production/queue                  # Clear queue
```

### **Media Library**
```
POST   /api/video-production/media/templates        # Add template
POST   /api/video-production/media/hot-videos       # Add hot video
POST   /api/video-production/media/audio            # Add audio track
GET    /api/video-production/media/stats            # Get library stats
GET    /api/video-production/media/random/template  # Get random template
GET    /api/video-production/media/random/hot-video # Get random hot video
GET    /api/video-production/media/random/audio     # Get random audio
```

### **Upload Management**
```
POST   /api/video-production/uploads/register       # Register upload
GET    /api/video-production/uploads/stats          # Get upload stats
GET    /api/video-production/uploads/:uploadId      # Get upload status
GET    /api/video-production/uploads/status/:status # Get by status
POST   /api/video-production/uploads/retry-failed   # Retry failed
```

### **Workflow & Automation**
```
POST   /api/video-production/workflow/generate           # Generate video
POST   /api/video-production/workflow/process-next       # Process next
POST   /api/video-production/workflow/upload-next        # Upload next
POST   /api/video-production/workflow/initialize-automation
GET    /api/video-production/workflow/running-jobs       # Get running
POST   /api/video-production/workflow/stop-all-jobs      # Stop all
```

### **Jobs Management**
```
POST   /api/video-production/jobs                   # Create job
GET    /api/video-production/jobs                   # Get all jobs
GET    /api/video-production/jobs/:jobId            # Get specific
POST   /api/video-production/jobs/:jobId/enable     # Enable job
POST   /api/video-production/jobs/:jobId/disable    # Disable job
PATCH  /api/video-production/jobs/:jobId            # Update job
DELETE /api/video-production/jobs/:jobId            # Delete job
```

---

## 🧪 Test Scenario: Complete Flow

### **Manual Test: Create YouTube Mashup Video**

```javascript
// 1. UPLOAD SOURCE VIDEO
const sourceResponse = await fetch('/api/media/upload', {
  method: 'POST',
  body: new FormData().append('file', sourceVideoFile)
});
const sourceId = sourceResponse.data.mediaId;
// Sleep: Wait for file to be saved

// 2. SELECT TEMPLATE
const templateResponse = await fetch(
  '/api/video-production/media/random/template?platform=youtube'
);
const templateId = templateResponse.data.mediaId;

// 3. SELECT AUDIO
const audioResponse = await fetch(
  '/api/video-production/media/random/audio?mood=upbeat'
);
const audioId = audioResponse.data.mediaId;

// 4. CREATE QUEUE ITEM
const queueResponse = await fetch('/api/video-production/queue/add', {
  method: 'POST',
  body: JSON.stringify({
    videoConfig: {
      layout: 'side-by-side',
      duration: 30,
      sourceMediaId: sourceId,
      templateMediaId: templateId,
      audioMediaId: audioId
    },
    platform: 'youtube',
    contentType: 'hot_mashup'
  })
});
const queueId = queueResponse.data.queueId;

// 5. PROCESS VIDEO
const processResponse = await fetch(
  '/api/video-production/workflow/process-next',
  { method: 'POST' }
);

// 6. MONITOR PROGRESS (Poll every 2 seconds)
const checkStatus = async () => {
  const status = await fetch(
    `/api/video-production/queue/${queueId}`
  );
  console.log(status.data.status); // pending → processing → ready
  if (status.data.status !== 'ready') {
    setTimeout(checkStatus, 2000);
  }
};

// 7. GET GENERATED VIDEO
const finalQueue = await fetch(
  `/api/video-production/queue/${queueId}`
);
const videoPath = finalQueue.data.videoPath;
// videoPath: /backend/media/mashups/queue-001-abc123.mp4

// 8. UPLOAD TO PLATFORM
const uploadResponse = await fetch(
  '/api/video-production/uploads/register',
  {
    method: 'POST',
    body: JSON.stringify({
      queueId,
      videoPath,
      platform: 'youtube',
      accountId: 'acc-youtube-001'
    })
  }
);
const uploadId = uploadResponse.data.uploadId;

// 9. MONITOR UPLOAD
const checkUpload = async () => {
  const upload = await fetch(
    `/api/video-production/uploads/${uploadId}`
  );
  console.log(upload.data.status); // pending → uploading → success
  if (upload.data.status !== 'success') {
    setTimeout(checkUpload, 3000);
  } else {
    console.log('Video URL:', upload.data.uploadUrl);
  }
};
```

---

## 🎯 Next Steps

1. **Create VideoMashupCreator component** with full wizard UI
2. **Implement real-time queue monitoring** with WebSocket polling
3. **Add media library browser** for template/audio selection
4. **Build processing monitor** with stage-by-stage tracking
5. **Create CronJob manager UI** for automation setup
6. **Add API methods** for download, preview, delete operations
7. **Implement error handling & retry UI**
8. **Test end-to-end flow** with manual execution

---

**Last Updated:** February 23, 2026  
**Status:** Ready for Implementation  
**Priority:** HIGH - Core functionality depends on this integration
