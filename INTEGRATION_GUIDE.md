# Video Production Integration Guide

**Status**: Complete | **Version**: 1.0 | **Last Updated**: 2025-02-20

---

## Quick Start (5 Minutes)

### 1. Start Backend Services

```bash
cd backend
npm start
```

Backend runs on `http://localhost:3000/api`

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Access Video Production Dashboard

Navigate to: **Video Production** in the navbar

---

## System Overview

The Video Production System is a comprehensive automation framework for:
- ✅ Automated 2-video mashup generation
- ✅ Multi-platform video distribution (TikTok, Instagram, YouTube, Facebook)
- ✅ Multi-account management with rotation & load balancing
- ✅ Smart media library with template management
- ✅ Real-time queue monitoring
- ✅ Cron-based scheduling & automation
- ✅ Performance tracking & analytics

---

## Architecture

### Frontend Stack
- **Framework**: React 18.2 + React Router v6
- **Styling**: Tailwind CSS v3.3.5
- **State**: Zustand (with `videoProductionStore`)
- **API Client**: Axios (with `videoProductionApi`)
- **UI Components**: Lucide React icons, react-hot-toast

### Backend Stack (7 Services)
1. **VideoMashupService** - Video generation & editing
2. **MediaLibraryService** - Template & media management
3. **VideoQueueService** - Queue tracking & priority
4. **CronJobService** - Scheduled automation
5. **MultiAccountService** - Platform account management
6. **AutoUploadService** - Platform integration & uploads
7. **ProcessOrchestratorService** - Job orchestration

---

## Features & Pages

### 1. **Overview Dashboard**
- System health status
- Queue metrics (pending, processing, completed, failed)
- Performance metrics (CPU, Memory, Uptime)
- Active process count
- Quick action buttons

**Route**: `/video-production` (default tab)

### 2. **Accounts Management**
- Connect accounts across 4 platforms (TikTok, Instagram, YouTube, Facebook)
- View account status (active, pending, inactive)
- Upload capacity tracking
- Account verification & testing
- Batch account operations

**Features**:
- Add new accounts with credentials
- Auto-detect platform requirements
- Monitor last login time
- Track upload errors per account
- Quick verify/edit/delete actions

### 3. **Queue Monitor**
- Real-time queue status
- Filter by status (pending, processing, completed)
- Priority distribution (high, normal, low)
- Per-platform queue breakdown
- Recent queue item history

**Metrics**:
- Total queued videos
- Currently processing count
- Completed today count
- Failed videos
- Platform-specific breakdown

### 4. **Media Library**
- Upload & manage video templates
- Store audio tracks & clips
- Hot video templates (trending)
- Media tagging & organization
- Quick media picker (random selection)

---

## Core Components

### State Management (`videoProductionStore.js`)

```javascript
// Get system status
const { systemStatus, getSystemStatus } = useVideoProductionStore();

// Queue operations
const { addToQueue, batchAddToQueue, getQueueStats } = useVideoProductionStore();

// Account operations
const { addAccount, getAllAccounts, getAccountStats } = useVideoProductionStore();

// Media operations
const { getMediaStats } = useVideoProductionStore();

// Job operations
const { getAllJobs, createJob, getJobStats } = useVideoProductionStore();

// Workflow operations
const { generateVideo, initializeAutomation } = useVideoProductionStore();
```

### UI Components

#### `SystemStatus.jsx`
- Displays 4-panel system stats
- Auto-refresh every 5 seconds
- Color-coded health status
- Performance metrics display

#### `QueueStatus.jsx`
- 4-stat grid (total, processing, completed, failed)
- Filterable queue item list
- Priority distribution breakdown
- Platform distribution stats

#### `AccountCard.jsx`
- Individual account display
- Status indicator (active/pending/inactive)
- Verification button
- Edit & delete actions
- Error tracking

#### `VideoProduction.jsx` (Main Page)
- Multi-tab interface (Overview, Accounts, Queue, Media)
- Account add form (with platform selection)
- Real-time data updates
- Toast notifications for actions

---

## API Reference

### Queue Endpoints
```
POST   /api/queue/add              Add single video to queue
POST   /api/queue/batch-add        Batch add multiple videos
GET    /api/queue/stats            Get queue statistics
GET    /api/queue/next-pending/:platform  Get next video for platform
```

### Accounts Endpoints
```
POST   /api/accounts/add                Add new account
GET    /api/accounts                    Get all accounts
GET    /api/accounts/stats              Get account statistics
GET    /api/accounts/by-platform/:platform  Get accounts by platform
GET    /api/accounts/best/:platform    Get best account for platform
POST   /api/accounts/:id/verify        Verify account credentials
PUT    /api/accounts/:id               Update account
DELETE /api/accounts/:id               Delete account
```

### Media Endpoints
```
GET    /api/media/stats             Get media statistics
POST   /api/media/template/add      Add template
GET    /api/media/hot-videos        Get trending templates
POST   /api/media/audio/add         Add audio track
```

### Upload Endpoints
```
POST   /api/uploads/register        Register upload
GET    /api/uploads/stats/:platform Get upload statistics
PUT    /api/uploads/:id             Update upload status
```

### Jobs Endpoints
```
GET    /api/jobs                    Get all jobs
POST   /api/jobs/create             Create new scheduled job
GET    /api/jobs/stats              Get job statistics
DELETE /api/jobs/:id                Delete job
```

### Workflow Endpoints
```
POST   /api/workflow/generate       Generate video (one-shot)
POST   /api/workflow/automation     Initialize automation
GET    /api/workflow/running-jobs   Get running jobs
GET    /api/workflow/system-status  Get system status
```

---

## Usage Examples

### Add Video to Queue
```javascript
const store = useVideoProductionStore();

// Single video
await store.addToQueue(
  { title: 'Product Promo', duration: 15 },
  'tiktok',           // platform
  'product_promo',    // content type
  'normal'            // priority
);

// Batch add
await store.batchAddToQueue([
  { title: 'Video 1', duration: 15 },
  { title: 'Video 2', duration: 15 },
  { title: 'Video 3', duration: 15 },
]);
```

### Add Account
```javascript
await store.addAccount(
  'tiktok',
  '@myaccount',
  'password123',
  'My TikTok Account',
  'email@example.com',
  { businessAccount: true, followers: 1000 }
);
```

### Create Scheduled Job
```javascript
await store.createJob(
  'Daily TikTok Upload',
  '0 8 * * *',        // 8 AM daily
  'generate_and_upload',
  'tiktok',
  true,               // enabled
  { videoCount: 5, contentType: 'product_promo' }
);
```

### Initialize Full Automation
```javascript
const config = {
  generateInterval: 3600,           // 1 hour
  uploadInterval: 1800,             // 30 minutes
  accounts: ['account_id_1'],
  contentTypes: ['product_promo', 'lifestyle'],
  platforms: ['tiktok', 'instagram']
};

await store.initializeAutomation(config);
```

---

## Color Scheme Reference

**Matches existing system theme:**

```
Backgrounds:
  - Primary: gray-900 (#111827)
  - Secondary: gray-800 (#1f2937)
  - Hover: gray-700 (#374151)

Accents:
  - Primary: purple-600 (#9333ea)
  - Light: purple-300 (#d8b4fe)
  - Status: purple-500/50

Text:
  - Primary: white (#ffffff)
  - Secondary: gray-300 (#d1d5db)
  - Muted: gray-400 (#9ca3af)

Status Colors:
  - Success: green-400 (#4ade80)
  - Warning: yellow-400 (#facc15)
  - Error: red-400 (#f87171)
  - Info: blue-400 (#60a5fa)

Borders:
  - Primary: gray-700 (#374151)
  - Accent: purple-500/50
```

---

## Performance Considerations

### Queue Processing
- **Batch Size**: Max 100 videos per batch
- **Retry Policy**: 3 attempts with exponential backoff
- **Timeout**: 30 seconds per request

### Account Management
- **Max Accounts**: 50 total across all platforms
- **Capacity Check**: Before each upload
- **Auto-rotation**: Based on upload capacity

### Media Library
- **Max Templates**: 1000 templates
- **Max Audio Tracks**: 500 tracks
- **Storage**: 100 GB default

---

## Troubleshooting

### Issue: Backend not connecting
**Solution**: Ensure backend is running on port 3000
```bash
cd backend
npm start
```

### Issue: Accounts show "pending" status
**Solution**: Click "Verify" button to test credentials
```javascript
// Manual verification
await store.getAccountStats();
```

### Issue: Queue not processing
**Solution**: Check system status & queue metrics
```javascript
const status = await store.getSystemStatus();
console.log(status.health);  // Should be 'healthy'
```

### Issue: Upload failures
**Solution**: Check account upload capacity
```javascript
const stats = await store.getAccountStats();
console.log(stats.uploadCapacity);
```

---

## Development Setup

### Add New Feature
1. Create component in `src/components/VideoProduction/`
2. Add store methods in `videoProductionStore.js`
3. Create page if needed in `src/pages/`
4. Update Navbar for navigation
5. Add route in `src/App.jsx`

### Update Store
```javascript
export const useVideoProductionStore = create((set, get) => ({
  // State
  yourFeature: { data: [], loading: false, error: null },
  
  // Action
  fetchYourFeature: async () => {
    set(state => ({ yourFeature: { ...state.yourFeature, loading: true } }));
    try {
      const result = await videoProductionApi.yourEndpoint.fetch();
      set(state => ({
        yourFeature: { ...state.yourFeature, data: result, loading: false }
      }));
    } catch (error) {
      set(state => ({
        yourFeature: { ...state.yourFeature, error: error.message, loading: false }
      }));
    }
  }
}));
```

---

## Testing

### Manual Testing Checklist
- [ ] System status loads correctly
- [ ] Can add account (all 4 platforms)
- [ ] Account verification works
- [ ] Can add video to queue
- [ ] Queue filters work (all status types)
- [ ] Real-time updates occur every 3-5 seconds
- [ ] All buttons are responsive
- [ ] Toast notifications appear
- [ ] Mobile responsive layout works
- [ ] No console errors

### Sample Data
For testing without real accounts:
```javascript
// Dummy account
{
  platform: 'tiktok',
  username: 'test_account',
  displayName: 'Test Account',
  email: 'test@example.com',
  status: 'active',
  uploadCapacity: { used: 10, total: 500 }
}

// Dummy video
{
  id: 'video_1',
  title: 'Product Demo',
  contentType: 'product_promo',
  platform: 'tiktok',
  status: 'pending',
  priority: 'normal',
  createdAt: new Date()
}
```

---

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── VideoProduction.jsx          Main page
│   ├── components/
│   │   └── VideoProduction/
│   │       ├── SystemStatus.jsx         System metrics
│   │       ├── QueueStatus.jsx          Queue dashboard
│   │       └── AccountCard.jsx          Account display
│   ├── services/
│   │   └── videoProductionApi.js        API client (180 lines)
│   ├── stores/
│   │   └── videoProductionStore.js      State management (250 lines)
│   └── App.jsx                          Updated with route

backend/
├── controllers/
│   ├── queueController.js               Queue endpoints
│   ├── accountController.js             Account endpoints
│   ├── mediaController.js               Media endpoints
│   ├── uploadController.js              Upload endpoints
│   ├── jobController.js                 Job endpoints
│   └── workflowController.js            Workflow endpoints
├── services/
│   ├── VideoMashupService.js            Video generation
│   ├── MediaLibraryService.js           Media management
│   ├── VideoQueueService.js             Queue management
│   ├── CronJobService.js                Job scheduling
│   ├── MultiAccountService.js           Account management
│   ├── AutoUploadService.js             Platform uploads
│   └── ProcessOrchestratorService.js    Job orchestration
└── routes/
    ├── queue.js
    ├── accounts.js
    ├── media.js
    ├── uploads.js
    ├── jobs.js
    └── workflow.js
```

---

## API Base URL

**Development**: `http://localhost:3000/api`

**Environment Variable**: `VITE_API_BASE`

Update in `.env.development`:
```
VITE_API_BASE=http://localhost:3000/api
```

---

## Common Workflows

### 1. One-Shot Video Generation
```
UI → Add to Queue → Select Platform → Set Priority → 
Queue Processes → Auto-Upload → Complete
```

### 2. Automated Daily Production
```
Create Daily Job (8 AM) → Auto-generate 5 videos → 
Queue Processing → Scheduled Upload (5 PM) → 
Distribute across platforms
```

### 3. Multi-Account Load Balancing
```
Detect Account Capacity → Select Best Account → 
Queue Video → Auto-Upload → Monitor Status → 
Update Account Stats
```

### 4. Media Library Management
```
Upload Template/Audio → Tag with metadata → 
System indexes automatically → Random selection 
during video generation
```

---

## Support & Debugging

### Enable All Logs
```javascript
// In videoProductionApi.js
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000/api',
  timeout: 30000,
});

// Add detailed logging
instance.interceptors.response.use(
  response => {
    console.log('API Response:', response.config.url, response.data);
    return response.data;
  },
  error => {
    console.error('API Error:', error.config?.url, error.message);
    throw error;
  }
);
```

### Check System Health
```javascript
const status = await getSystemStatus();
console.log({
  health: status.health,
  queueStats: status.queueStats,
  performance: status.performance,
  activeProcesses: status.activeProcesses
});
```

---

## Next Steps

1. **Test all features** with sample data
2. **Configure platforms** with real accounts
3. **Create custom media library** with your content
4. **Set up automation** with cron jobs
5. **Monitor analytics** and optimize performance

---

**Created**: 2025-02-20 | **Status**: Production Ready | **Version**: 1.0
