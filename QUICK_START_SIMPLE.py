#!/usr/bin/env python
"""
Download + Upload Pipeline - Quick Start Checklist
Follow these steps to run the complete pipeline
"""

def main():
    steps = [
        ("1. Check Database Status", [
            "$ python test-status-check.py",
            "Expected: 7 videos pending for download"
        ]),
        ("2. Start Backend Server", [
            "$ cd backend",
            "$ npm install",
            "$ npm start",
            "Expected: Server on http://localhost:3000"
        ]),
        ("3. Start Scraper Service", [
            "$ cd scraper_service",
            "$ pip install -r requirements.txt",
            "$ uvicorn app.main:app --port 8001 --reload",
            "Expected: Service on http://localhost:8001"
        ]),
        ("4. Monitor Download Progress", [
            "$ watch 'curl -s http://localhost:8001/api/shorts-reels/stats/overview | jq'",
            "Watch: pending count decrease, done count increase"
        ]),
        ("5. Trigger Upload to Google Drive", [
            "$ curl -X POST http://localhost:8001/api/shorts-reels/videos/upload-to-drive",
            "Expected: All videos uploaded successfully"
        ]),
        ("6. Check Upload Status", [
            "$ curl -X GET http://localhost:8001/api/shorts-reels/videos/upload-status",
            "Expected: uploaded: 7, withAssets: 7"
        ]),
        ("7. Verify in Google Drive", [
            "Navigate: Affiliate AI / Videos / Downloaded / youtube",
            "Expected: 7 MP4 files with metadata"
        ]),
        ("8. Verify in Database", [
            "$ python test-status-check.py",
            "Expected: Uploaded: 7, With Assets: 7"
        ])
    ]
    
    print("\n" + "="*80)
    print("DOWNLOAD + UPLOAD PIPELINE - QUICK START")
    print("="*80)
    
    for title, commands in steps:
        print(f"\n{title}")
        print("-" * 80)
        for cmd in commands:
            print(f"  {cmd}")
    
    print("\n" + "="*80)
    print("Documentation Files:")
    print("  - DOWNLOAD_UPLOAD_GUIDE.md (complete setup guide)")
    print("  - PIPELINE_IMPLEMENTATION_SUMMARY.md (what was built)")
    print("="*80 + "\n")

if __name__ == '__main__':
    main()
