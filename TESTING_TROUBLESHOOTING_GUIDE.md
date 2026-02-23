# 🧪 Video Mass Production - Testing & Troubleshooting Guide

---

## 📋 Pre-Implementation Checklist

### Backend Requirements
- [ ] All services implemented (`videoQueueService`, `videoMashupService`, etc.)
- [ ] All API routes registered in `server.js`
- [ ] `/backend/media/` directory structure created
- [ ] FFmpeg installed on server
- [ ] Environment variables configured
- [ ] Database (if using persistence) initialized

### Frontend Requirements
- [ ] React 18+ setup
- [ ] Zustand store configured
- [ ] Axios client installed
- [ ] React Hot Toast installed
- [ ] Lucide React icons installed

---

## 🧪 Testing Scenarios

### Test 1: API Connectivity Test

```bash
# Test backend is running
curl http://localhost:5000/api/health

# Test video production routes exist
curl http://localhost:5000/api/video-production/system/status

# Expected response:
# {
#   "queue": { "total": 0, "stats": {...} },
#   "accounts": { "total": 0, ... },
#   "uploads": { "total": 0, ... },
#   "jobs": { "total": 0, ... }
# }
```

### Test 2: Queue Operations Test

```javascript
// Test adding to queue
async function testQueue() {
  const response = await fetch('http://localhost:5000/api/video-production/queue/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoConfig: {
        layout: 'side-by-side',
        duration: 30
      },
      platform: 'youtube',
      contentType: 'hot_mashup',
      priority: 'high'
    })
  });
  
  const result = await response.json();
  console.log('Queue item added:', result.queueItem?.queueId);
  
  // Get queue stats
  const statsResponse = await fetch(
    'http://localhost:5000/api/video-production/queue/stats'
  );
  const stats = await statsResponse.json();
  console.log('Queue stats:', stats);
}

testQueue();
```

### Test 3: Media Library Test

```javascript
async function testMediaLibrary() {
  // Get stats
  const statsResponse = await fetch(
    'http://localhost:5000/api/video-production/media/stats'
  );
  const stats = await statsResponse.json();
  console.log('Media stats:', stats);

  // Get random template
  const templateResponse = await fetch(
    'http://localhost:5000/api/video-production/media/random/template?platform=youtube'
  );
  const template = await templateResponse.json();
  console.log('Random template:', template.data?.name);

  // Get random audio
  const audioResponse = await fetch(
    'http://localhost:5000/api/video-production/media/random/audio?mood=upbeat'
  );
  const audio = await audioResponse.json();
  console.log('Random audio:', audio.data?.name);
}

testMediaLibrary();
```

### Test 4: Account Management Test

```javascript
async function testAccounts() {
  // Add account
  const addResponse = await fetch(
    'http://localhost:5000/api/video-production/accounts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'youtube',
        username: 'test@example.com',
        password: 'secure_password',
        displayName: 'Test Channel'
      })
    }
  );
  
  const addResult = await addResponse.json();
  console.log('Account added:', addResult.account?.accountId);

  // Get all accounts
  const getAllResponse = await fetch(
    'http://localhost:5000/api/video-production/accounts'
  );
  const accounts = await getAllResponse.json();
  console.log('All accounts:', accounts.accounts?.length);
}

testAccounts();
```

### Test 5: Full End-to-End Flow

```javascript
async function testEndToEndFlow() {
  console.log('🚀 Starting E2E test flow...\n');

  try {
    // 1. Check system status
    console.log('1️⃣ Checking system status...');
    const statusRes = await fetch(
      'http://localhost:5000/api/video-production/system/status'
    );
    const status = await statusRes.json();
    console.log('✅ System status:', status.data?.queue?.total);

    // 2. Add to queue
    console.log('\n2️⃣ Adding video to queue...');
    const queueRes = await fetch(
      'http://localhost:5000/api/video-production/queue/add',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoConfig: {
            layout: 'side-by-side',
            duration: 30,
            sourceMediaId: 'test-source',
            templateMediaId: 'test-template',
            audioMediaId: 'test-audio'
          },
          platform: 'youtube',
          contentType: 'hot_mashup'
        })
      }
    );
    const queueResult = await queueRes.json();
    const queueId = queueResult.queueItem?.queueId;
    console.log(`✅ Queue item created: ${queueId}`);

    // 3. Process next
    console.log('\n3️⃣ Starting processing...');
    const processRes = await fetch(
      'http://localhost:5000/api/video-production/workflow/process-next',
      { method: 'POST' }
    );
    const processResult = await processRes.json();
    console.log('✅ Processing started');

    // 4. Monitor progress
    console.log('\n4️⃣ Monitoring progress...');
    let processing = true;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes with 2s intervals

    while (processing && attempts < maxAttempts) {
      const checkRes = await fetch(
        `http://localhost:5000/api/video-production/queue/${queueId}`
      );
      const checkResult = await checkRes.json();
      const queueItem = checkResult.data;

      console.log(
        `  Status: ${queueItem.status} | Attempt: ${attempts + 1}/${maxAttempts}`
      );

      if (['ready', 'failed'].includes(queueItem.status)) {
        processing = false;
        
        if (queueItem.status === 'ready') {
          console.log(`✅ Video ready at: ${queueItem.videoPath}`);
          
          // 5. Register upload
          console.log('\n5️⃣ Registering upload...');
          const uploadRes = await fetch(
            'http://localhost:5000/api/video-production/uploads/register',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                queueId,
                videoPath: queueItem.videoPath,
                platform: 'youtube',
                accountId: 'acc-youtube-001'
              })
            }
          );
          const uploadResult = await uploadRes.json();
          console.log(`✅ Upload registered: ${uploadResult.uploadId}`);
        } else {
          console.log('❌ Processing failed');
          console.log('Error log:', queueItem.errorLog);
        }
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (attempts >= maxAttempts) {
      console.log('⏱️ Timeout waiting for processing');
    }

    console.log('\n🎉 E2E test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testEndToEndFlow();
```

---

## 🐛 Troubleshooting Guide

### Issue 1: Queue Item Stuck in "pending" Status

**Symptoms:**
- Queue item created but status never changes from "pending"
- No processing logs generated

**Debugging Steps:**
```javascript
// 1. Check if VideoQueueService is working
const queueRes = await fetch(
  'http://localhost:5000/api/video-production/queue/stats'
);
const stats = await queueRes.json();
console.log('Queue items:', stats.data?.items?.length);

// 2. Check process logs
const logsRes = await fetch(
  'http://localhost:5000/api/video-production/queue/{queueId}/logs'
);
const logs = await logsRes.json();
console.log('Process log:', logs.data?.processLog);

// 3. Check backend server logs
// Look for errors in console output
```

**Solutions:**
- [ ] Ensure FFmpeg is installed: `ffmpeg -version`
- [ ] Check media files exist at specified paths
- [ ] Verify permissions on `/backend/media/` directory
- [ ] Check disk space available
- [ ] Review server logs for errors

---

### Issue 2: Media Library Empty

**Symptoms:**
- All media selection endpoints return empty results
- Error getting random template/audio

**Debugging Steps:**
```javascript
// Check actual files on disk
const mediaIndexRes = await fetch(
  'http://localhost:5000/api/video-production/media/stats'
);
const stats = await mediaIndexRes.json();
console.log('Media counts:', {
  templates: stats.data?.templates?.total,
  hotVideos: stats.data?.hotVideos?.total,
  audioTracks: stats.data?.audio?.total
});
```

**Solutions:**
- [ ] Upload sample files to `/backend/media/templates/`
- [ ] Upload sample audio to `/backend/media/audio/upbeat/`
- [ ] Verify media index is being read from disk
- [ ] Check file permissions

---

### Issue 3: Account Upload Failing

**Symptoms:**
- Upload registered but status remains "pending"
- Files uploaded but marked as "failed"

**Debugging Steps:**
```javascript
// 1. Verify account is active
const accountRes = await fetch(
  'http://localhost:5000/api/video-production/accounts'
);
const accounts = await accountRes.json();
const account = accounts.accounts?.find(a => a.accountId === 'your-account-id');
console.log('Account active:', account?.active);

// 2. Check upload status details
const uploadRes = await fetch(
  'http://localhost:5000/api/video-production/uploads/{uploadId}'
);
const upload = await uploadRes.json();
console.log('Upload:', upload.data);
```

**Solutions:**
- [ ] Verify account credentials are correct (encrypted)
- [ ] Check account has not hit daily upload limit
- [ ] Verify platform API credentials/tokens
- [ ] Check for cooldown periods between uploads
- [ ] Review error logs in upload record

---

### Issue 4: Processing Timeout

**Symptoms:**
- Processing starts but takes very long
- Eventually times out or fails
- High CPU/memory usage

**Debugging Steps:**
```bash
# Monitor system resources
ps aux | grep ffmpeg  # Check FFmpeg process
top -p $(pgrep node)  # Monitor Node process
df -h                 # Check disk space
```

**Solutions:**
- [ ] Reduce video duration or resolution
- [ ] Check system has sufficient CPU/RAM
- [ ] Monitor disk I/O performance
- [ ] Run FFmpeg encoding separately to test
- [ ] Check for competing processes

---

### Issue 5: Frontend Store State Not Updating

**Symptoms:**
- UI not reflecting queue status changes
- Store actions complete but UI doesn't update
- Components not re-rendering

**Debugging Steps:**
```javascript
// Check store state directly
const state = useVideoProductionStore();
console.log('Store queue:', state.queue);
console.log('Store accounts:', state.accounts);

// Verify action is being called
console.log('Loading:', state.queue.loading);
console.log('Error:', state.queue.error);
```

**Solutions:**
- [ ] Ensure store actions have `set()` calls
- [ ] Check for async/await issues in actions
- [ ] Verify API response format matches expectations
- [ ] Clear browser cache and reload
- [ ] Check console for errors

---

### Issue 6: API CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Requests blocked from frontend
- Preflight requests failing

**Solutions:**
```javascript
// In backend server.js, ensure CORS is configured:
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

## 🔧 Debug Mode Setup

### Enable Detailed Logging

```javascript
// frontend/src/stores/videoProductionStore.js
const useVideoProductionStore = create((set, get) => {
  const DEBUG = true; // Set to false in production

  return {
    // ... store code ...

    addToQueue: async (videoConfig, platform, contentType, priority) => {
      if (DEBUG) console.log('🔷 addToQueue called:', {
        videoConfig,
        platform,
        contentType,
        priority
      });

      try {
        const result = await videoProductionApi.queue.add(...);
        if (DEBUG) console.log('✅ addToQueue success:', result);
        return result;
      } catch (error) {
        if (DEBUG) console.error('❌ addToQueue error:', error);
        throw error;
      }
    }
  };
});
```

### Enable Backend Logging

```javascript
// backend/controllers/videoProductionController.js
const DEBUG = process.env.DEBUG === 'true';

static addToQueue = asyncHandler((req, res) => {
  if (DEBUG) {
    console.log('🔷 addToQueue request:', req.body);
  }

  try {
    const result = VideoQueueService.addToQueue(req.body);
    if (DEBUG) console.log('✅ addToQueue response:', result);
    res.json(result);
  } catch (error) {
    if (DEBUG) console.error('❌ addToQueue error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Performance Testing

### Load Test: Queue Multiple Videos

```javascript
async function loadTest(count = 10) {
  console.log(`🔄 Starting load test: ${count} videos\n`);

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < count; i++) {
    try {
      const res = await fetch(
        'http://localhost:5000/api/video-production/queue/add',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoConfig: {
              layout: 'side-by-side',
              duration: 30
            },
            platform: 'youtube'
          })
        }
      );

      const result = await res.json();
      results.push({
        queueId: result.queueItem?.queueId,
        status: result.queueItem?.status,
        success: true
      });

      console.log(`✅ Video ${i + 1}/${count} queued`);
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
      console.error(`❌ Video ${i + 1}/${count} failed:`, error);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;

  console.log(`\n📊 Results:`);
  console.log(`  Total: ${count}`);
  console.log(`  Success: ${successful}`);
  console.log(`  Failed: ${count - successful}`);
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Avg time/item: ${(duration / count).toFixed(2)}ms`);
}

loadTest(10);
```

---

## ✅ Post-Implementation Validation

After implementation, verify:

```javascript
async function validateImplementation() {
  const checks = [];

  // 1. API endpoints accessible
  try {
    const res = await fetch('http://localhost:5000/api/video-production/system/status');
    checks.push({ name: 'API endpoints', status: res.ok });
  } catch (e) {
    checks.push({ name: 'API endpoints', status: false, error: e.message });
  }

  // 2. Queue operations
  try {
    const res = await fetch(
      'http://localhost:5000/api/video-production/queue/stats'
    );
    const data = await res.json();
    checks.push({ 
      name: 'Queue operations', 
      status: data.data?.total !== undefined 
    });
  } catch (e) {
    checks.push({ name: 'Queue operations', status: false, error: e.message });
  }

  // 3. Media library
  try {
    const res = await fetch(
      'http://localhost:5000/api/video-production/media/stats'
    );
    const data = await res.json();
    checks.push({ 
      name: 'Media library', 
      status: data.data?.templates !== undefined 
    });
  } catch (e) {
    checks.push({ name: 'Media library', status: false, error: e.message });
  }

  // 4. Accounts
  try {
    const res = await fetch(
      'http://localhost:5000/api/video-production/accounts'
    );
    const data = await res.json();
    checks.push({ 
      name: 'Account management', 
      status: Array.isArray(data.accounts) 
    });
  } catch (e) {
    checks.push({ name: 'Account management', status: false, error: e.message });
  }

  // 5. Frontend store
  try {
    // This would be tested in browser console
    console.log('ℹ️ Test frontend store in browser console:');
    console.log('const store = useVideoProductionStore();');
    console.log('console.log(store.queue);');
    checks.push({ 
      name: 'Frontend store', 
      status: 'Manual verification required' 
    });
  } catch (e) {
    checks.push({ name: 'Frontend store', status: false, error: e.message });
  }

  // Summary
  console.log('\n📋 Implementation Validation:\n');
  checks.forEach(check => {
    const emoji = check.status === true ? '✅' : check.status === false ? '❌' : 'ℹ️';
    console.log(`${emoji} ${check.name}`);
    if (check.error) console.log(`   └─ ${check.error}`);
  });

  const allPassed = checks.every(c => c.status !== false);
  console.log(`\n${allPassed ? '✅' : '⚠️'} Validation ${allPassed ? 'passed' : 'has issues'}`);
}

validateImplementation();
```

---

## 📞 Common Support Issues

### "Cannot find module" Errors
- Run `npm install` in both frontend and backend directories
- Restart development server

### Port Already in Use
```bash
# Find and kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm start
```

### Database Connection Issues
- Verify MongoDB/PostgreSQL is running
- Check connection string in `.env`
- Verify database exists and has correct schema

### File Permission Issues
```bash
# Fix permissions on media directory
chmod -R 755 /backend/media/
chown -R $(whoami) /backend/media/
```

---

**Last Updated:** February 23, 2026  
**Status:** Ready for Production Testing
