"""
Simple Google Drive Upload via Backend API
Replaces complex drive_upload_service with direct API calls to Node.js backend
"""

import asyncio
import os
import json
import aiohttp
from datetime import datetime
from typing import Optional, Dict, Any

from .config import PEXELS_DRIVE_FOLDER_ID

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
SCRAPER_ADMIN_TOKEN = os.getenv('SCRAPER_ADMIN_TOKEN', '').strip()


async def upload_video_to_backend_api(file_path: str, platform: str, video_id: str, category: str = '', tags: list | None = None, title: str = '') -> Optional[Dict[str, Any]]:
    """
    Upload video file to Google Drive via backend API
    
    Args:
        file_path: Local path to video file
        platform: Platform source (youtube, playboard, dailyhaha, douyin)
        video_id: MongoDB video document ID
    
    Returns:
        Upload result dict with file ID and links, or None if failed
    """
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None
    
    try:
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        print(f"\n📤 Uploading to backend: {file_name}")
        print(f"   Platform: {platform}")
        print(f"   Size: {file_size / 1024 / 1024:.1f} MB")
        
        # Prepare multipart form data
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                form = aiohttp.FormData()
                form.add_field('file', f, filename=file_name, content_type='video/mp4')
                form.add_field('platform', platform)
                form.add_field('source', platform)
                if platform == 'pexels' and PEXELS_DRIVE_FOLDER_ID:
                    form.add_field('parentFolderId', PEXELS_DRIVE_FOLDER_ID)
                    if category:
                        form.add_field('subfolder', category)

                metadata = {
                    'category': category,
                    'tags': tags or [],
                    'title': title,
                    'videoId': video_id,
                    'platform': platform,
                }
                form.add_field('metadata', json.dumps(metadata, ensure_ascii=False))
                
                try:
                    headers = {}
                    if SCRAPER_ADMIN_TOKEN:
                        headers['X-Scraper-Token'] = SCRAPER_ADMIN_TOKEN

                    async with session.post(
                        f"{BACKEND_URL}/api/drive/files/upload-with-metadata",
                        data=form,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=300)  # 5 minute timeout
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            if result.get('success'):
                                print(f"✅ Upload successful!")
                                return result.get('data', {})
                            else:
                                print(f"⚠️  Upload failed: {result.get('message', 'Unknown error')}")
                                return None
                        else:
                            print(f"⚠️  Upload failed with status {response.status}")
                            return None
                            
                except asyncio.TimeoutError:
                    print(f"⚠️  Upload timed out (file too large or network issue)")
                    return None
                except Exception as e:
                    print(f"⚠️  Upload request failed: {e}")
                    return None
                    
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None


async def upload_video_after_download(video_id: str, file_path: str, platform: str):
    """
    Upload video to Google Drive after successful download
    Simplified version that uses backend API only
    
    Args:
        video_id: MongoDB video document ID
        file_path: Local path to downloaded video
        platform: Platform/source (youtube, playboard, etc.)
    """
    from .db import videos
    
    try:
        # Call backend API for upload
        video_doc = videos.find_one({'_id': video_id})
        category = (video_doc or {}).get('category') or (video_doc or {}).get('topics') or ''
        tags = (video_doc or {}).get('tags') or []

        upload_result = await upload_video_to_backend_api(
            file_path=file_path,
            platform=platform,
            video_id=str(video_id),
            category=category,
            tags=tags,
            title=(video_doc or {}).get('title') or '',
        )
        
        if upload_result:
            drive_file_id = upload_result.get('fileId') or upload_result.get('id')
            drive_web_link = upload_result.get('webViewLink') or upload_result.get('weblink')
            
            # Update video record with Drive info
            try:
                videos.update_one(
                    {'_id': video_id},
                    {
                        '$set': {
                            'driveUploadStatus': 'done',
                            'driveFileId': drive_file_id,
                            'driveWebLink': drive_web_link,
                            'driveUploadedAt': datetime.utcnow()
                        }
                    }
                )
                print(f"✅ Updated video with Drive file ID: {drive_file_id}")
            except Exception as e:
                print(f"⚠️  Could not update video record: {e}")
        else:
            # Mark as skipped if upload failed
            try:
                videos.update_one(
                    {'_id': video_id},
                    {
                        '$set': {
                            'driveUploadStatus': 'skipped',
                            'driveUploadSkipReason': 'Backend API upload failed'
                        }
                    }
                )
            except Exception as e:
                print(f"⚠️  Error updating skip status: {e}")
                
    except Exception as e:
        print(f"❌ Error in upload_video_after_download: {e}")
        try:
            videos.update_one(
                {'_id': video_id},
                {'$set': {'driveUploadStatus': 'failed', 'driveUploadFailReason': str(e)}}
            )
        except Exception as update_err:
            print(f"⚠️  Could not update failure status: {update_err}")
