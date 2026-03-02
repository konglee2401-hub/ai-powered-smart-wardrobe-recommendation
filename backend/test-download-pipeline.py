#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test video download pipeline
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../scraper_service'))

import asyncio
from app.db import videos
from app.automation import queue_stats

async def test_download_pipeline():
    """Test download queue and worker health"""
    print("=" * 80)
    print("DOWNLOAD PIPELINE TEST")
    print("=" * 80)
    
    print("\n[1] Checking download queue setup...")
    stats = queue_stats()
    print(f"    Queue stats: {stats}")
    
    print("\n[2] Checking videos in database...")
    pending = videos.count_documents({'downloadStatus': 'pending'})
    failed = videos.count_documents({'downloadStatus': 'failed'})
    done = videos.count_documents({'downloadStatus': 'done'})
    all_vids = videos.count_documents({})
    
    print(f"    Total videos: {all_vids}")
    print(f"    Pending: {pending}")
    print(f"    Failed: {failed}")
    print(f"    Done: {done}")
    
    if pending > 0:
        sample = videos.find_one({'downloadStatus': 'pending'})
        if sample:
            print(f"\n[3] Sample pending video:")
            print(f"    Title: {sample.get('title', 'N/A')[:60]}")
            print(f"    URL: {sample.get('url', 'N/A')}")
            print(f"    Video ID: {sample.get('videoId', 'N/A')}")
            print(f"    Platform: {sample.get('platform', 'N/A')}")
            print(f"    Topics: {sample.get('topics', 'N/A')}")
    
    print("\n" + "=" * 80)
    if all_vids > 0:
        print("✓ DOWNLOAD PIPELINE READY")
        print(f"  - {all_vids} videos in database")
        if pending > 0:
            print(f"  - {pending} videos ready to download")
    else:
        print("! NO VIDEOS IN DATABASE")
        print("  Need to run discovery first")
    print("=" * 80)

if __name__ == '__main__':
    asyncio.run(test_download_pipeline())
