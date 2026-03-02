#!/usr/bin/env python
"""
Download + Upload Pipeline - Quick Start Guide
Shows step-by-step instructions for running the complete pipeline
"""

import subprocess
import sys
from pathlib import Path

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print('='*80)

def print_step(num, title):
    print(f"\n▶︎ STEP {num}: {title}")
    print('-' * 80)

def run_curl(description, method, endpoint, data=None):
    """Show curl command that user should run"""
    curl_cmd = f"curl -X {method} http://localhost:8001{endpoint}"
    if data:
        curl_cmd += f" -H 'Content-Type: application/json' -d '{data}'"
    
    print(f"\n  📋 {description}:")
    print(f"  {curl_cmd}")

def main():
    print_section("🎬 Download + Upload Pipeline - Quick Start")
    
    print("""
This guide walks you through running the complete pipeline:
  1. Check database status
  2. Start backend and scraper services
  3. Monitor download progress
  4. Trigger upload to Google Drive
  5. Verify results
    """)
    
    # Step 1
    print_step(1, "Check Database Status")
    print("""
First, verify you have videos ready to process.
    """)
    print("  Command:")
    print("  $ python test-status-check.py")
    print("""
  Expected Output:
  [checkmark] 7 videos in database
  Download: 7 (ready for download)
  Upload: 0 (will be populated after upload)
    """)
    
    # Step 2
    print_step(2, "Start Backend Server")
    print("""
Open a terminal and start the backend:
    """)
    print("  Commands:")
    print("  $ cd backend")
    print("  $ npm install  # (only if not done yet)")
    print("  $ npm start")
    print("""
  Expected:
  [OK] Server running on http://localhost:3000
  [OK] Connected to MongoDB
  [OK] Google Drive OAuth configured
    """)
    
    # Step 3
    print_step(3, "Start Scraper Service")
    print("""
Open another terminal and start the scraper:
    """)
    print("  Commands:")
    print("  $ cd scraper_service")
    print("  $ pip install -r requirements.txt  # (if not done yet)")
    print("  $ uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
    print("""
  Expected:
  [OK] Service running on http://localhost:8001
  [OK] Download worker started
  [OK] Ready to process videos
    """)
    
    # Step 4
    print_step(4, "Monitor Download Progress")
    print("""
Open a third terminal and watch the downloads happen:
    """)
    print("  Command (Linux/Mac):")
    print("  $ watch 'curl -s http://localhost:8001/api/shorts-reels/stats/overview | jq'")
    print("""
  Command (Windows):")
    print("  $ powershell -Command \"while(1) { curl http://localhost:8001/api/shorts-reels/stats/overview; Start-Sleep -Seconds 5 }\"")
    print("""
  Watch for:
  [Progress] pending count decreasing (7 -> 5 -> 3 -> 0)
  [Progress] done count increasing (0 -> 2 -> 4 -> 7)
    """)
    
    # Step 5
    print_step(5, "Trigger Upload to Google Drive")
    print("""
When all downloads are complete, upload to Google Drive:
    """)
    run_curl(
        "Upload all downloaded videos",
        "POST",
        "/api/shorts-reels/videos/upload-to-drive"
    )
    print("""
  Response:
  {
    "success": true,
    "processed": 7,
    "uploaded": 7,
    "failed": 0,
    "duration": 45000
  }
    """)
    
    # Step 6
    print_step(6, "Monitor Upload Progress")
    print("""
Check upload status in real-time:
    """)
    run_curl(
        "Get upload status",
        "GET",
        "/api/shorts-reels/videos/upload-status"
    )
    print("""
  Response:
  {
    "downloaded": 7,
    "uploaded": 7,
    "uploadFailed": 0,
    "pendingUpload": 0,
    "withAssets": 7
  }
    """)
    
    # Step 7
    print_step(7, "Verify in Google Drive")
    print("""
Open Google Drive and navigate to:
  Affiliate AI / Videos / Downloaded / youtube
    
You should see:
  [OK] 7 MP4 files
  [OK] Recently uploaded with current date
  [OK] Files have proper metadata
    """)
    
    # Step 8
    print_step(8, "Verify in MongoDB")
    print("""
Check uploaded videos in database:
    """)
    print("  Command:")
    print("  $ python test-status-check.py")
    print("""
  Updated Output:
  [OK] Uploaded: 7 (all uploaded successfully)
  [OK] With Assets: 7 (asset records created)
    """)
    
    # Troubleshooting
    print_section("🔧 Troubleshooting")
    
    print("""
Issue: "Google Drive not configured"
Solution:
  1. Check .env has OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET
  2. Restart backend server
  3. If needed, delete backend/config/drive-token.json and re-authenticate

Issue: Downloads not starting
Solution:
  1. Check if yt-dlp is installed: yt-dlp --version
  2. Verify internet connection
  3. Check video URLs are valid

Issue: Upload fails
Solution:
  1. Check Google Drive OAuth token is valid
  2. Verify YouTube folder path is correct
  3. Check disk space for temporary files

Issue: Asset creation fails
Solution:
  1. Verify backend API is accessible from scraper service
  2. Check backend logs for error details
  3. Verify Asset model schema matches
    """)
    
    # Advanced Options
    print_section("⚡ Advanced Options")
    
    print("""
Upload only specific video:
    """)
    run_curl(
        "Upload one video by ID",
        "POST",
        "/api/shorts-reels/videos/{video_id}/upload-to-drive"
    )
    
    print("""
Automatic uploads (advanced):
  Add to scraper_service/app/main.py:
  scheduler.add_job(process_pending_uploads, 'cron', hour='*/2')
  This will auto-upload every 2 hours
    """)
    
    # Summary
    print_section("✅ Pipeline Complete!")
    
    print("""
You have successfully:
  [DONE] Downloaded videos from sources
  [DONE] Uploaded to Google Drive
  [DONE] Created asset records
  [DONE] Verified everything is working

Next steps:
  - Monitor downloads/uploads regularly
  - Add more discovery configs for more videos
  - Enable automatic scheduling for hands-off operation
  - Integrate with frontend for user interface

For detailed documentation, see:
  - DOWNLOAD_UPLOAD_GUIDE.md
  - PIPELINE_IMPLEMENTATION_SUMMARY.md
    """)
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
