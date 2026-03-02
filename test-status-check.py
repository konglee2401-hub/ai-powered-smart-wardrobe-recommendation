#!/usr/bin/env python
"""
Quick Status Check - See current DB state without running anything
"""

import sys
from pathlib import Path

# Add scraper service to path
sys.path.insert(0, str(Path(__file__).parent / 'scraper_service'))

from app.db import videos, channels
from datetime import datetime

def show_status():
    print(f"\n{'='*80}")
    print("📊 Database Status Report")
    print(f"{'='*80}")
    print(f"📅 Generated at: {datetime.utcnow().isoformat()}")
    
    # Overall stats
    print(f"\n📈 Overall Statistics:")
    print(f"   Total Channels: {channels.count_documents({})}")
    print(f"   Total Videos: {videos.count_documents({})}")
    
    # Download status
    print(f"\n📥 Download Status:")
    print(f"   Pending: {videos.count_documents({'downloadStatus': 'pending'})}")
    print(f"   Downloading: {videos.count_documents({'downloadStatus': 'downloading'})}")
    print(f"   Done: {videos.count_documents({'downloadStatus': 'done'})}")
    print(f"   Failed: {videos.count_documents({'downloadStatus': 'failed'})}")
    
    # Upload status (new field)
    print(f"\n☁️  Upload Status:")
    print(f"   Uploaded: {videos.count_documents({'uploadStatus': 'done'})}")
    print(f"   Upload Failed: {videos.count_documents({'uploadStatus': 'failed'})}")
    print(f"   Pending Upload: {videos.count_documents({'downloadStatus': 'done', 'uploadStatus': {'$ne': 'done'}})}")
    print(f"   With Assets: {videos.count_documents({'assetId': {'$exists': True}})}")
    
    # Platform breakdown
    print(f"\n🎬 Videos by Platform:")
    platforms = list(videos.aggregate([
        {'$group': {'_id': '$platform', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]))
    for p in platforms:
        print(f"   {p['_id']}: {p['count']}")
    
    # Topic breakdown
    print(f"\n🏷️  Videos by Topic:")
    topics = list(videos.aggregate([
        {'$group': {'_id': '$topics', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]))
    for t in topics[:10]:  # Top 10
        print(f"   {t['_id']}: {t['count']}")
    
    # Sample pending videos
    print(f"\n📌 Sample Pending Videos:")
    pending = list(videos.find({'downloadStatus': 'pending'}).limit(3))
    for i, v in enumerate(pending, 1):
        print(f"   {i}. {v.get('title', 'Unknown')[:60]}")
        print(f"      Channel: {v.get('channelName', 'Unknown')}")
        print(f"      Platform: {v.get('platform', 'unknown')}")
        print(f"      Topic: {v.get('topics', 'unknown')}")
        print(f"      Views: {v.get('views', 0):,}")
    
    # Sample done videos
    print(f"\n✅ Sample Downloaded Videos:")
    done = list(videos.find({'downloadStatus': 'done'}).limit(3))
    for i, v in enumerate(done, 1):
        print(f"   {i}. {v.get('title', 'Unknown')[:60]}")
        print(f"      Downloaded: {v.get('downloadedAt', 'N/A')}")
        print(f"      Uploaded: {v.get('uploadStatus', 'pending')}")
        if v.get('assetId'):
            print(f"      Asset ID: {v.get('assetId')}")
    
    print(f"\n{'='*80}\n")


if __name__ == '__main__':
    try:
        show_status()
        print("✅ Status check completed")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
