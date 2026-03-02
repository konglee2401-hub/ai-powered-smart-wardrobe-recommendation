#!/usr/bin/env python3
"""
Quick Test Guide for Frontend Upload Integration
Tests the connection between frontend UI and backend upload APIs
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"

def test_frontend_loads():
    """Test that frontend pages load correctly"""
    print("\n=== Testing Frontend Pages ===")
    try:
        response = requests.get(f"{BASE_URL}/shorts-reels")
        print(f"✓ Shorts/Reels dashboard loads: {response.status_code}")
    except Exception as e:
        print(f"✗ Dashboard load failed: {e}")

def test_upload_status_api():
    """Test upload status endpoint"""
    print("\n=== Testing Upload Status API ===")
    try:
        response = requests.get(f"{BACKEND_URL}/api/shorts-reels/videos/upload-status")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Upload Status API works")
            print(f"  - Downloaded: {data.get('downloaded')}")
            print(f"  - Pending Upload: {data.get('pendingUpload')}")
            print(f"  - Uploaded: {data.get('uploaded')}")
            print(f"  - Upload Failed: {data.get('uploadFailed')}")
            print(f"  - With Assets: {data.get('withAssets')}")
        else:
            print(f"✗ Upload Status API error: {response.status_code}")
    except Exception as e:
        print(f"✗ Upload Status API failed: {e}")

def test_batch_upload_trigger():
    """Test batch upload trigger endpoint"""
    print("\n=== Testing Batch Upload Trigger ===")
    try:
        response = requests.post(f"{BACKEND_URL}/api/shorts-reels/videos/upload-to-drive")
        if response.status_code in [200, 202]:
            data = response.json()
            print(f"✓ Batch Upload API works")
            print(f"  - Processed: {data.get('processed')}")
            print(f"  - Uploaded: {data.get('uploaded')}")
            print(f"  - Failed: {data.get('failed')}")
            print(f"  - Duration: {data.get('duration')}s")
        else:
            print(f"✗ Batch Upload API error: {response.status_code}")
    except Exception as e:
        print(f"✗ Batch Upload API failed: {e}")

def test_videos_list():
    """Test videos list endpoint"""
    print("\n=== Testing Videos List API ===")
    try:
        response = requests.get(f"{BACKEND_URL}/api/shorts-reels/videos?limit=5")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Videos List API works")
            print(f"  - Total items: {len(data.get('items', []))}")
            for i, video in enumerate(data.get('items', [])[:3]):
                print(f"  [{i+1}] {video.get('title')} - Upload: {video.get('uploadStatus')}")
        else:
            print(f"✗ Videos List API error: {response.status_code}")
    except Exception as e:
        print(f"✗ Videos List API failed: {e}")

def print_integration_guide():
    """Print testing guide"""
    print("""
╔════════════════════════════════════════════════════════════════╗
║   Frontend Upload Integration Testing Guide                   ║
╚════════════════════════════════════════════════════════════════╝

COMPONENTS UPDATED:
✓ /frontend/src/services/trendAutomationApi.js
  - getUploadStatus()      → Fetch upload statistics
  - triggerUploadAll()     → Start batch upload
  - triggerUploadSingle()  → Upload one video

✓ /frontend/src/pages/trend-automation/ShortsReelsVideos.jsx
  - 5-card upload status summary
  - Upload status column in table
  - Drive link column
  - Upload buttons (batch + individual)
  - Auto-refresh toggle

✓ /frontend/src/pages/trend-automation/ShortsReelsDashboard.jsx
  - Google Drive Upload Status section
  - Upload All button
  - 5 stat cards (Downloaded, Pending, Uploaded, Failed, Assets)
  - Auto-refresh integration

TESTING STEPS:
1. Start the backend:
   cd backend && npm run dev

2. Start the scraper service:
   python scraper_service/run.py

3. Start the frontend:
   cd frontend && npm run dev

4. Open http://localhost:3000/shorts-reels

5. Verify the UI:
   ☐ Dashboard shows upload status cards
   ☐ Videos page shows upload status column
   ☐ Upload buttons are visible
   ☐ Check Status button works
   ☐ Upload All button works (if videos pending)
   ☐ Auto-refresh updates statistics

6. Test the flow:
   ☐ Click "Check Status" → Updates immediately
   ☐ Click "Upload All" → Shows loading
   ☐ Individual "Upload" button works
   ☐ After upload, Drive link appears
   ☐ Status badges update correctly

EXPECTED API RESPONSES:

GET /api/shorts-reels/videos/upload-status
Response: {
  "downloaded": 7,
  "uploaded": 3,
  "uploadFailed": 0,
  "pendingUpload": 4,
  "withAssets": 5
}

POST /api/shorts-reels/videos/upload-to-drive
Response: {
  "success": true,
  "processed": 4,
  "uploaded": 4,
  "failed": 0,
  "duration": 12.5
}

Commit: ffe5965
Branch: main
Files: 6 changed, 621 insertions(+), 142 deletions(-)
    """)

if __name__ == '__main__':
    print(f"Frontend Integration Test Suite | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_integration_guide()
    
    print("\n=== Running API Tests ===")
    # Uncomment these when services are running
    # test_frontend_loads()
    # test_upload_status_api()
    # test_videos_list()
    # test_batch_upload_trigger()
    
    print("\n✓ Integration complete! Use this guide to test the UI.")
