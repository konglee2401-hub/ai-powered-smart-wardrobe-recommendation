#!/usr/bin/env python
"""
Test Download + Upload Pipeline
Runs the complete flow: download -> upload to Google Drive -> create asset record
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.automation import (
    process_download, 
    queue_stats, 
    start_worker, 
    running_jobs,
    _worker_loop,
    build_download_path
)
from app.db import videos
from app.drive_upload_service import get_drive_service, process_pending_uploads
from bson import ObjectId
import time


async def run_download_pipeline():
    """Run the download pipeline"""
    print("\n" + "="*80)
    print("🎬 Starting Download + Upload Pipeline")
    print("="*80)
    
    # Get stats before
    print("\n📊 Initial Stats:")
    print(f"   Queue: {queue_stats()}")
    pending_count = videos.count_documents({'downloadStatus': 'pending'})
    print(f"   Pending Videos: {pending_count}")
    
    if pending_count == 0:
        print("   ⚠️  No pending videos found!")
        return False
    
    # Start the worker
    print("\n🚀 Starting download worker...")
    await start_worker()
    await asyncio.sleep(1)  # Let worker initialize
    
    # Wait for downloads to complete
    print(f"\n⏳ Waiting for {pending_count} videos to download...")
    max_wait = 300  # 5 minutes max
    start_time = time.time()
    
    while True:
        current_pending = videos.count_documents({'downloadStatus': 'pending'})
        current_done = videos.count_documents({'downloadStatus': 'done'})
        current_failed = videos.count_documents({'downloadStatus': 'failed'})
        
        print(f"   Progress: Done={current_done}, Failed={current_failed}, Pending={current_pending}")
        
        if current_pending == 0 or (time.time() - start_time) > max_wait:
            break
        
        await asyncio.sleep(5)  # Check every 5 seconds
    
    # Get final stats
    print("\n✅ Download Phase Complete!")
    print(f"   Done: {current_done}")
    print(f"   Failed: {current_failed}")
    print(f"   Pending: {current_pending}")
    
    return current_done > 0


async def run_upload_pipeline():
    """Run the upload to Google Drive pipeline"""
    print("\n" + "="*80)
    print("☁️  Starting Google Drive Upload Pipeline")
    print("="*80)
    
    # Get upload service
    service = await get_drive_service()
    
    # Ensure YouTube folder exists
    print("\n📁 Ensuring YouTube folder exists...")
    youtube_folder_id = await service.ensure_youtube_folder()
    if youtube_folder_id:
        print(f"   ✅ YouTube Folder ID: {youtube_folder_id}")
    else:
        print("   ⚠️  Could not create/find YouTube folder")
    
    # Process pending uploads
    print("\n📤 Processing downloaded videos for upload...")
    done_count = videos.count_documents({'downloadStatus': 'done', 'uploadStatus': {'$ne': 'done'}})
    print(f"   Found {done_count} videos to upload")
    
    if done_count > 0:
        await process_pending_uploads()
    
    # Final stats
    uploaded = videos.count_documents({'uploadStatus': 'done'})
    upload_failed = videos.count_documents({'uploadStatus': 'failed'})
    
    print(f"\n✅ Upload Phase Complete!")
    print(f"   Uploaded: {uploaded}")
    print(f"   Failed: {upload_failed}")
    
    return uploaded > 0


async def show_final_stats():
    """Show final statistics"""
    print("\n" + "="*80)
    print("📊 Final Statistics")
    print("="*80)
    
    stats = {
        'Total Videos': videos.count_documents({}),
        'Downloaded': videos.count_documents({'downloadStatus': 'done'}),
        'Failed': videos.count_documents({'downloadStatus': 'failed'}),
        'Pending': videos.count_documents({'downloadStatus': 'pending'}),
        'Uploaded': videos.count_documents({'uploadStatus': 'done'}),
        'Upload Failed': videos.count_documents({'uploadStatus': 'failed'}),
        'With Assets': videos.count_documents({'assetId': {'$exists': True}}),
    }
    
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Show sample uploaded video
    sample = videos.find_one({'uploadStatus': 'done'})
    if sample:
        print(f"\n📹 Sample Uploaded Video:")
        print(f"   Title: {sample.get('title', 'Unknown')}")
        print(f"   Asset ID: {sample.get('assetId', 'N/A')}")
        print(f"   Drive Link: {sample.get('driveWebLink', 'N/A')}")


async def main():
    """Main pipeline"""
    try:
        # Phase 1: Download
        download_success = await run_download_pipeline()
        
        if not download_success:
            print("\n❌ No videos were downloaded!")
            return False
        
        # Phase 2: Upload
        upload_success = await run_upload_pipeline()
        
        # Phase 3: Show stats
        await show_final_stats()
        
        print("\n" + "="*80)
        if upload_success:
            print("✅ Pipeline Completed Successfully!")
        else:
            print("⚠️  Pipeline completed with issues")
        print("="*80)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Pipeline Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print(f"🎬 Download + Upload Pipeline Test")
    print(f"📅 Started at: {datetime.utcnow().isoformat()}")
    
    success = asyncio.run(main())
    
    print(f"\n📅 Completed at: {datetime.utcnow().isoformat()}")
    sys.exit(0 if success else 1)
