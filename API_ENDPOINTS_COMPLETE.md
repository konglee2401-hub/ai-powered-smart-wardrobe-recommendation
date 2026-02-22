# Complete API Endpoint Documentation

Database models and routes have been created for the complete video automation system. This document provides comprehensive API endpoint references.

## Controllers Created

1. **socialMediaController.js** - Social media account management
2. **videoGenerationConfigController.js** - Video generation configuration
3. **distributionTrackingController.js** - Distribution metrics tracking
4. **monitoringStatsController.js** - System monitoring and statistics
5. **batchProcessingController.js** - Batch processing management

---

## 1. Social Media Account API

**Route Base:** `/api/social-media-accounts` (requires authentication)

### Endpoints

#### Get All Accounts
```
GET /api/social-media-accounts
Response:
{
  "success": true,
  "accounts": [
    {
      "_id": "...",
      "userId": "...",
      "platform": "tiktok",
      "username": "username",
      "displayName": "Display Name",
      "status": "verified",
      "rateLimit": { ... },
      "postHistory": [ ... ],
      "errorHistory": [ ... ]
    }
  ]
}
```

#### Create Account
```
POST /api/social-media-accounts
Body:
{
  "platform": "tiktok",        // Required: tiktok, youtube, facebook, instagram, twitter
  "username": "username",       // Required
  "displayName": "Display Name",
  "accessToken": "token",
  "refreshToken": "token",
  "tokenExpiresAt": "2025-12-31T23:59:59Z",
  "apiKey": "key",
  "apiSecret": "secret"
}
Response:
{
  "success": true,
  "message": "tiktok account created successfully",
  "account": { ... }
}
```

#### Get Specific Account
```
GET /api/social-media-accounts/:id
Response:
{
  "success": true,
  "account": { ... }
}
```

#### Update Account
```
PUT /api/social-media-accounts/:id
Body:
{
  "displayName": "New Name",
  "accessToken": "new_token",
  "refreshToken": "new_token",
  "tokenExpiresAt": "2025-12-31T23:59:59Z",
  "statusMessage": "Active and verified"
}
Response:
{
  "success": true,
  "message": "Account updated successfully",
  "account": { ... }
}
```

#### Delete Account
```
DELETE /api/social-media-accounts/:id
Response:
{
  "success": true,
  "message": "Account deleted successfully"
}
```

#### Test Connection
```
POST /api/social-media-accounts/:id/test-connection
Response:
{
  "success": true,
  "connected": true,
  "platform": "tiktok",
  "message": "Connection successful"
}
```

#### Record Post
```
POST /api/social-media-accounts/:id/record-post
Body:
{
  "videoId": "video_id",
  "postUrl": "https://...",
  "timestamp": "2025-02-20T10:30:00Z"
}
Response:
{
  "success": true,
  "message": "Post recorded successfully",
  "account": { ... }
}
```

#### Check if Can Post Now
```
GET /api/social-media-accounts/:id/can-post
Response:
{
  "success": true,
  "can_post": true,
  "platform": "tiktok",
  "daily_limit": 100,
  "posts_today": 15,
  "cooldown_minutes": 5,
  "next_available_at": "2025-02-20T10:35:00Z"
}
```

#### Get Account Statistics
```
GET /api/social-media-accounts/:id/stats
Response:
{
  "success": true,
  "stats": {
    "platform": "tiktok",
    "username": "username",
    "status": "verified",
    "total_posts": 150,
    "posts_today": 15,
    "consecutive_errors": 0,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-02-20T10:30:00Z",
    "last_post": { ... }
  }
}
```

---

## 2. Video Generation Configuration API

**Route Base:** `/api/video-generation-config` (requires authentication)

### Endpoints

#### Get All Configurations
```
GET /api/video-generation-config
Response:
{
  "success": true,
  "configs": [
    {
      "_id": "...",
      "userId": "...",
      "configName": "TikTok Hourly",
      "automationFrequency": "hourly",
      "isActive": true,
      "videoStyle": { ... },
      "audioSettings": { ... },
      "contentGeneration": { ... },
      "distributionSettings": { ... },
      "platformSettings": { ... },
      "executionHistory": [ ... ]
    }
  ]
}
```

#### Create Configuration
```
POST /api/video-generation-config
Body:
{
  "configName": "TikTok Hourly",                    // Required
  "automationFrequency": "hourly",                  // hourly, every2hours, every4hours, etc
  "isActive": true,
  "videoStyle": {
    "style": "dynamic",                             // dynamic, static, minimal, cinematic
    "motionIntensity": "medium",                    // low, medium, high
    "aspectRatio": "9:16",
    "fps": 30,
    "resolution": "1080p"
  },
  "contentGeneration": {
    "contentType": "motivational",
    "moodSetting": "energetic",
    "useTextOverlay": true,
    "textPosition": "bottom"
  },
  "distributionSettings": {
    "enableAutoDistribution": true,
    "accountSelectionStrategy": "sequential",       // sequential, random, roundRobin, weighted
    "minAccountsToDistribute": 1,
    "enableRetryOnFailure": true,
    "maxRetries": 3
  },
  "platformSettings": {
    "tiktok": { ... },
    "youtube": { ... }
  }
}
Response:
{
  "success": true,
  "message": "Configuration created successfully",
  "config": { ... }
}
```

#### Get Configuration
```
GET /api/video-generation-config/:id
Response:
{
  "success": true,
  "config": { ... }
}
```

#### Update Configuration
```
PUT /api/video-generation-config/:id
Body: (same as create, all fields optional)
Response:
{
  "success": true,
  "message": "Configuration updated successfully",
  "config": { ... }
}
```

#### Delete Configuration
```
DELETE /api/video-generation-config/:id
Response:
{
  "success": true,
  "message": "Configuration deleted successfully"
}
```

#### Check if Due for Execution
```
GET /api/video-generation-config/:id/check-due
Response:
{
  "success": true,
  "isDue": true,
  "configName": "TikTok Hourly",
  "frequency": "hourly",
  "lastExecuted": "2025-02-20T10:00:00Z",
  "nextExecution": "2025-02-20T11:00:00Z"
}
```

#### Execute Now
```
POST /api/video-generation-config/:id/execute-now
Response:
{
  "success": true,
  "message": "Video generation triggered successfully",
  "nextExecution": "2025-02-20T11:00:00Z",
  "config": { ... }
}
```

#### Get Execution History
```
GET /api/video-generation-config/:id/execution-history
Response:
{
  "success": true,
  "configName": "TikTok Hourly",
  "totalExecutions": 45,
  "recentExecutions": [
    {
      "executedAt": "2025-02-20T10:00:00Z",
      "status": "completed",
      "generatedVideoId": "...",
      "distributionResults": [ ... ]
    }
  ]
}
```

#### Toggle Automation
```
POST /api/video-generation-config/:id/toggle-automation
Response:
{
  "success": true,
  "message": "Automation enabled",
  "isActive": true,
  "config": { ... }
}
```

#### Get Default Settings
```
GET /api/video-generation-config/defaults/all
Response:
{
  "success": true,
  "defaults": {
    "automationFrequencies": [ ... ],
    "videoStyles": [ ... ],
    "contentTypes": [ ... ],
    "platformSettings": { ... }
  }
}
```

---

## 3. Distribution Tracking API

**Route Base:** `/api/distribution-tracking` (requires authentication)

### Endpoints

#### Get All Distributions
```
GET /api/distribution-tracking?limit=50&page=1&status=completed&videoGenId=...
Response:
{
  "success": true,
  "distributions": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 234, "pages": 5 }
}
```

#### Create Distribution Tracking
```
POST /api/distribution-tracking
Body:
{
  "videoGenerationId": "...",
  "videoTitle": "My Awesome Video",
  "distributions": [
    {
      "socialMediaAccountId": "...",
      "status": "pending"
    }
  ]
}
Response:
{
  "success": true,
  "message": "Distribution tracking created",
  "distribution": { ... }
}
```

#### Get Distribution
```
GET /api/distribution-tracking/:id
Response:
{
  "success": true,
  "distribution": { ... }
}
```

#### Update Platform Status
```
PUT /api/distribution-tracking/:id/platform-status
Body:
{
  "accountId": "...",
  "status": "success",
  "metrics": {
    "views": 1500,
    "likes": 150,
    "comments": 25,
    "shares": 10,
    "saves": 8,
    "engagement": 11.3
  },
  "error": null
}
Response:
{
  "success": true,
  "message": "Platform status updated",
  "distribution": { ... }
}
```

#### Get Distribution Summary
```
GET /api/distribution-tracking/:id/summary
Response:
{
  "success": true,
  "videoTitle": "My Video",
  "overallStatus": "completed",
  "summary": {
    "totalViews": 5000,
    "totalEngagement": 500,
    "engagementRate": 10
  },
  "platformBreakdown": [ ... ]
}
```

#### Get Distribution Status
```
GET /api/distribution-tracking/:id/status
Response:
{
  "success": true,
  "status": "completed",
  "videoTitle": "My Video",
  "platformCount": 4,
  "successCount": 3,
  "failedCount": 0,
  "pendingCount": 1
}
```

#### Retry Failed Distributions
```
POST /api/distribution-tracking/:id/retry-failed
Response:
{
  "success": true,
  "message": "2 platform(s) queued for retry",
  "distribution": { ... }
}
```

#### Get Metrics
```
GET /api/distribution-tracking/:id/metrics
Response:
{
  "success": true,
  "metrics": {
    "totalViews": 5000,
    "totalLikes": 500,
    "totalComments": 75,
    "totalShares": 30,
    "totalSaves": 20,
    "averageEngagementRate": 11.3,
    "platformMetrics": [ ... ]
  }
}
```

#### Update Metrics
```
PUT /api/distribution-tracking/:id/metrics
Body:
{
  "accountId": "...",
  "metrics": {
    "views": 2000,
    "likes": 200,
    "comments": 30
  }
}
Response:
{
  "success": true,
  "message": "Metrics updated",
  "distribution": { ... }
}
```

#### Check if Monitoring is Due
```
GET /api/distribution-tracking/:id/monitoring-due
Response:
{
  "success": true,
  "isDue": true,
  "hoursElapsed": 2.5,
  "checkInterval": 2,
  "lastUpdate": "2025-02-20T08:30:00Z"
}
```

#### Get Recent Distributions
```
GET /api/distribution-tracking/recent/list?limit=10
Response:
{
  "success": true,
  "distributions": [
    {
      "id": "...",
      "videoTitle": "...",
      "createdAt": "...",
      "status": "completed",
      "platformCount": 4,
      "summary": { ... }
    }
  ]
}
```

---

## 4. Monitoring Statistics API

**Route Base:** `/api/monitoring-stats` (requires authentication)

### Endpoints

#### Get Current Stats
```
GET /api/monitoring-stats/current
Response:
{
  "success": true,
  "stats": {
    "period": "daily",
    "date": "2025-02-20",
    "videoGeneration": { ... },
    "distribution": { ... },
    "engagement": { ... }
  }
}
```

#### Get Stats by Period
```
GET /api/monitoring-stats/by-period?period=daily&limit=30
Response:
{
  "success": true,
  "period": "daily",
  "count": 30,
  "stats": [ ... ]
}
```

#### Get Video Statistics
```
GET /api/monitoring-stats/video-stats
Response:
{
  "success": true,
  "videoGeneration": {
    "totalGenerated": 45,
    "successful": 44,
    "failed": 1,
    "successRate": 97.78,
    "averageGenerationTime": 45000,
    "lastGeneratedAt": "2025-02-20T10:30:00Z",
    "errors": [ ... ]
  }
}
```

#### Get Distribution Statistics
```
GET /api/monitoring-stats/distribution-stats
Response:
{
  "success": true,
  "distribution": {
    "totalDistributed": 44,
    "successful": 42,
    "failed": 2,
    "successRate": 95.45,
    "byPlatform": {
      "tiktok": { "total": 44, "successful": 44 },
      "youtube": { "total": 44, "successful": 42 },
      ...
    }
  }
}
```

#### Get Engagement Statistics
```
GET /api/monitoring-stats/engagement-stats
Response:
{
  "success": true,
  "engagement": {
    "totalViews": 50000,
    "totalLikes": 5000,
    "totalComments": 750,
    "totalShares": 300,
    "totalSaves": 200,
    "averageEngagementRate": 11.5,
    "topPerformingPost": { ... },
    "engagementTrend": [ ... ]
  }
}
```

#### Get Account Health
```
GET /api/monitoring-stats/account-health
Response:
{
  "success": true,
  "accountHealth": {
    "activeAccounts": 12,
    "successfulAccounts": 11,
    "problemAccounts": 1,
    "successRate": 91.67,
    "problemList": [ ... ]
  }
}
```

#### Get System Health
```
GET /api/monitoring-stats/system-health
Response:
{
  "success": true,
  "systemHealth": {
    "uptime": 99.98,
    "errorRate": 0.15,
    "apiQuotaUsage": 65,
    "storageUsage": 78,
    "lastHealthCheck": "2025-02-20T10:35:00Z",
    "incidents": [ ... ]
  }
}
```

#### Get Errors and Alerts
```
GET /api/monitoring-stats/errors-alerts
Response:
{
  "success": true,
  "recentErrors": [ ... ],
  "recentAlerts": [ ... ],
  "errorSummary": {
    "critical": 0,
    "error": 2,
    "warning": 5,
    "info": 12
  }
}
```

#### Add Error
```
POST /api/monitoring-stats/add-error
Body:
{
  "message": "Failed to generate video",
  "severity": "error",
  "source": "videoGenerator",
  "errorCode": "GEN_FAILED"
}
Response:
{
  "success": true,
  "message": "Error logged",
  "stats": { ... }
}
```

#### Add Alert
```
POST /api/monitoring-stats/add-alert
Body:
{
  "message": "High API usage detected",
  "alertType": "quota",
  "severity": "warning",
  "details": { "usage": 85, "limit": 100 }
}
Response:
{
  "success": true,
  "message": "Alert created",
  "stats": { ... }
}
```

#### Get Dashboard
```
GET /api/monitoring-stats/dashboard
Response:
{
  "success": true,
  "dashboard": {
    "date": "2025-02-20",
    "rates": { ... },
    "videoGeneration": { ... },
    "distribution": { ... },
    "engagement": { ... },
    "accountHealth": { ... },
    "systemHealth": { ... },
    "recentIssues": [ ... ],
    "recentAlerts": [ ... ]
  }
}
```

#### Acknowledge Alert
```
PUT /api/monitoring-stats/acknowledge-alert
Body:
{
  "alertId": "..."
}
Response:
{
  "success": true,
  "message": "Alert acknowledged",
  "stats": { ... }
}
```

#### Clear Old Records
```
POST /api/monitoring-stats/clear-old-records
Body:
{
  "daysOld": 90
}
Response:
{
  "success": true,
  "message": "Deleted 234 old records",
  "deletedCount": 234
}
```

---

## 5. Batch Processing API

**Route Base:** `/api/batch-processing` (requires authentication)

### Endpoints

#### Get All Batch Jobs
```
GET /api/batch-processing?limit=50&page=1&status=completed&batchType=video
Response:
{
  "success": true,
  "jobs": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 123, "pages": 3 }
}
```

#### Create Batch Job
```
POST /api/batch-processing
Body:
{
  "batchName": "Morning Videos",
  "batchType": "video",
  "priority": "normal",
  "items": [
    {
      "sourceFileId": "...",
      "processingConfig": { ... }
    }
  ],
  "maxConcurrentItems": 3,
  "outputConfig": {
    "createZipArchive": true,
    "notificationOnComplete": true
  }
}
Response:
{
  "success": true,
  "message": "Batch job created successfully",
  "job": { ... }
}
```

#### Get Batch Job
```
GET /api/batch-processing/:id
Response:
{
  "success": true,
  "job": { ... }
}
```

#### Add Items to Batch
```
POST /api/batch-processing/:id/add-items
Body:
{
  "items": [
    {
      "sourceFileId": "...",
      "processingConfig": { ... }
    }
  ]
}
Response:
{
  "success": true,
  "message": "Added 5 items to batch",
  "job": { ... }
}
```

#### Update Progress
```
PUT /api/batch-processing/:id/update-progress
Body:
{
  "itemId": "...",
  "status": "completed",
  "result": {
    "outputFileId": "...",
    "outputFilePath": "...",
    "outputFileName": "video.mp4",
    "outputSize": 12500000,
    "outputUrl": "https://..."
  }
}
Response:
{
  "success": true,
  "message": "Progress updated",
  "progress": {
    "completed": 5,
    "pending": 5,
    "failed": 0,
    "progressPercentage": "50.00"
  }
}
```

#### Can Process More
```
GET /api/batch-processing/:id/can-process-more
Response:
{
  "success": true,
  "canProcess": true,
  "nextItem": "...",
  "currentlyProcessing": 2,
  "maxConcurrent": 3,
  "pendingItems": 8
}
```

#### Get Next Pending Item
```
GET /api/batch-processing/:id/next-item
Response:
{
  "success": true,
  "nextItem": { ... },
  "totalItems": 10,
  "completedItems": 5,
  "remainingItems": 5
}
```

#### Pause Job
```
POST /api/batch-processing/:id/pause
Response:
{
  "success": true,
  "message": "Batch job paused",
  "job": { ... }
}
```

#### Resume Job
```
POST /api/batch-processing/:id/resume
Response:
{
  "success": true,
  "message": "Batch job resumed",
  "job": { ... }
}
```

#### Cancel Job
```
POST /api/batch-processing/:id/cancel
Response:
{
  "success": true,
  "message": "Batch job cancelled",
  "cancelledItems": 5,
  "job": { ... }
}
```

#### Get Job Status
```
GET /api/batch-processing/:id/status
Response:
{
  "success": true,
  "status": {
    "jobId": "...",
    "batchName": "Morning Videos",
    "overallStatus": "processing",
    "progress": {
      "total": 10,
      "completed": 5,
      "failed": 0,
      "pending": 5,
      "progressPercentage": "50.00"
    },
    "timing": {
      "startedAt": "2025-02-20T08:00:00Z",
      "estimatedTimeRemaining": 30000,
      "completedAt": null
    }
  }
}
```

#### Get Job Statistics
```
GET /api/batch-processing/:id/stats
Response:
{
  "success": true,
  "stats": {
    "batchName": "Morning Videos",
    "batchType": "video",
    "totalItems": 10,
    "successRate": "50.00",
    "failureRate": "0.00",
    "itemsByStatus": {
      "pending": 5,
      "processing": 0,
      "completed": 5,
      "failed": 0,
      "skipped": 0
    }
  }
}
```

#### Retry Failed Items
```
POST /api/batch-processing/:id/retry-failed
Response:
{
  "success": true,
  "message": "2 item(s) queued for retry",
  "retriedCount": 2,
  "job": { ... }
}
```

#### Export Results
```
GET /api/batch-processing/:id/export-results
Response: (JSON file download)
{
  "jobId": "...",
  "batchName": "Morning Videos",
  "items": [ ... ],
  "summary": { ... }
}
```

#### Delete Job
```
DELETE /api/batch-processing/:id
Response:
{
  "success": true,
  "message": "Batch job deleted successfully"
}
```

---

## Error Response Format

All endpoints follow this error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "detailed error info"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request
- `404` - Not found
- `500` - Server error

---

## Authentication

All endpoints require the `authMiddleware` which validates JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Integration with Frontend

### To integrate these APIs:

1. **Create API service client** (e.g., `api/apiClient.js`)
2. **Create React hooks** for each API:
   - `useSocialMediaAccounts()`
   - `useVideoGenerationConfig()`
   - `useDistributionTracking()`
   - `useMonitoringStats()`
   - `useBatchProcessing()`
3. **Build UI components** for each feature:
   - Account management page
   - Video configuration dashboard
   - Distribution monitoring page
   - System statistics dashboard
   - Batch processing interface

---

## Testing

To test these endpoints, use Postman or create test files following this pattern:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Example: Create social media account
async function createAccount(platform, username) {
  try {
    const response = await api.post('/social-media-accounts', {
      platform,
      username,
      displayName: username
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}
```

---

## Status Codes and Values

### Distribution Status Values
- `pending` - Waiting for distribution
- `distributing` - Currently being distributed
- `partial` - Some platforms succeeded, some failed
- `completed` - All platforms distributed successfully
- `failed` - All platforms failed

### Batch Job Status Values
- `pending` - Created but not started
- `processing` - Currently processing items
- `paused` - Paused by user
- `completed` - All items processed
- `failed` - Processing failed

### Account Status Values
- `unverified` - Account not verified
- `verified` - Account verified and active
- `inactive` - Account disabled by user
- `error` - Account has issues
- `expired` - Credentials expired

---

**Last Updated:** February 20, 2025
**API Version:** 1.0
**Status:** Production Ready
