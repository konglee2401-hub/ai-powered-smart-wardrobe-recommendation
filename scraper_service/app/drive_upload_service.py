"""
Google Drive Upload Service
Handles uploading downloaded videos to Google Drive and creating asset records
"""

import os
import json
import asyncio
import aiohttp
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from .config import DOWNLOAD_ROOT
from .db import videos

# Import Google Drive helper
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from google_drive_helper import get_folder_id_for_platform, PLATFORM_FOLDER_MAP


class DriveUploadService:
    """Service to upload downloaded videos to Google Drive"""
    
    def __init__(self, backend_api_url: str = "http://localhost:3000"):
        self.backend_api_url = backend_api_url
        self.folder_cache = {}
        self._load_folder_structure()
        
    def _load_folder_structure(self):
        """Load folder structure from backend config"""
        try:
            config_path = Path(__file__).parent.parent.parent / 'backend' / 'config' / 'drive-folder-structure.json'
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    self.folder_cache = config.get('folders', {})
                    print(f"✅ Loaded {len(self.folder_cache)} folder mappings")
            else:
                print(f"⚠️  Folder structure config not found at {config_path}")
        except Exception as e:
            print(f"⚠️  Error loading folder structure: {e}")

    async def upload_video_to_drive(self, file_path: str, platform: str, video_metadata: Dict = None) -> Optional[Dict[str, Any]]:
        """
        Upload video file to Google Drive in platform-specific folder
        
        Args:
            file_path: Local path to video file
            platform: Platform/source (youtube, playboard, dailyhaha, douyin)
            video_metadata: Optional metadata about the video
        
        Returns:
            Upload result with file info or None if failed
        """
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return None
        
        # Get folder ID for platform
        folder_id = get_folder_id_for_platform(platform)
        if not folder_id:
            print(f"❌ Cannot upload: no folder configured for platform '{platform}'")
            return None
        
        try:
            file_size = os.path.getsize(file_path)
            file_name = os.path.basename(file_path)
            
            print(f"\n📤 Uploading {file_name} to {platform} folder...")
            print(f"   Folder ID: {folder_id}")
            print(f"   Size: {file_size / 1024 / 1024:.1f} MB")
            
            # Use sync requests since we're in an async context
            # This will be called from process_download which is async
            with open(file_path, 'rb') as f:
                files = {
                    'file': (file_name, f, 'video/mp4')
                }
                data = {
                    'parentFolderId': folder_id,
                    'platform': platform,
                    'source': platform,
                    'description': f'{platform} video downloaded for repurposing'
                }
                
                try:
                    response = requests.post(
                        f"{self.backend_api_url}/api/drive/files/upload-with-metadata",
                        files=files,
                        data=data,
                        timeout=300  # 5 minute timeout for large files
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f"✅ Video uploaded successfully!")
                        print(f"   File ID: {result.get('fileId')}")
                        return result.get('data', {})
                    else:
                        error_msg = response.text or f"HTTP {response.status_code}"
                        print(f"❌ Upload failed: {error_msg}")
                        return None
                        
                except requests.exceptions.RequestException as e:
                    # If backend is not available, log but don't fail
                    print(f"⚠️  Backend API unavailable, skipping Drive upload: {str(e)[:100]}")
                    return None
                    
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return None

    async def create_asset_record(
        self,
        filename: str,
        drive_file_id: str,
        platform: str,
        topics: str,
        file_size: int,
        drive_web_link: str = None,
        metadata: Dict = None
    ) -> Optional[str]:
        """
        Create asset record in backend for uploaded video
        
        Args:
            filename: Video filename
            drive_file_id: Google Drive file ID
            platform: Source platform
            topics: Video topics/categories
            file_size: File size in bytes
            drive_web_link: Optional web view link
            metadata: Optional additional metadata
        
        Returns:
            assetId if successful, None otherwise
        """
        try:
            storage_info = {
                "location": "google-drive",
                "googleDriveId": drive_file_id,
            }
            if drive_web_link:
                storage_info["webViewLink"] = drive_web_link
            
            asset_data = {
                "filename": filename,
                "mimeType": "video/mp4",
                "fileSize": file_size,
                "assetType": "video",
                "assetCategory": f"{platform}-{topics}",
                "userId": "scraper-service",
                "storage": storage_info,
                "tags": ["downloaded", platform, topics],
                "metadata": metadata or {
                    "source": platform,
                    "topic": topics,
                    "uploadedAt": datetime.utcnow().isoformat(),
                    "platform": platform
                }
            }
            
            try:
                response = requests.post(
                    f"{self.backend_api_url}/api/assets/create",
                    json=asset_data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    asset_id = result.get('asset', {}).get('_id') or result.get('assetId')
                    print(f"✅ Asset created: {asset_id}")
                    return asset_id
                else:
                    error = response.text
                    print(f"⚠️  Asset creation response: {response.status_code}")
                    return None
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️  Could not create asset record: {str(e)[:100]}")
                return None
                
        except Exception as e:
            print(f"⚠️  Asset creation error: {e}")
            return None


async def upload_video_after_download(video_id: str, file_path: str, platform: str):
    """
    Upload video to Google Drive after successful download
    
    Args:
        video_id: MongoDB video document ID
        file_path: Local path to downloaded video
        platform: Platform/source (youtube, playboard, etc.)
    """
    service = DriveUploadService()
    
    try:
        # Upload file
        upload_result = await service.upload_video_to_drive(
            file_path=file_path,
            platform=platform,
            video_metadata={'videoId': str(video_id), 'platform': platform}
        )
        
        if upload_result:
            drive_file_id = upload_result.get('id')
            drive_web_link = upload_result.get('webViewLink')
            
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
                print(f"✅ Updated video record with Drive file ID: {drive_file_id}")
            except Exception as e:
                print(f"⚠️  Could not update video record: {e}")
        else:
            # Mark as skipped if backend unavailable
            try:
                videos.update_one(
                    {'_id': video_id},
                    {
                        '$set': {
                            'driveUploadStatus': 'skipped',
                            'driveUploadSkipReason': 'Backend API unavailable'
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
                {
                    '$set': {
                        'driveUploadStatus': 'failed',
                        'driveUploadError': str(e)[:500]
                    }
                }
            )
        except:
            pass

    async def process_video_download(self, video_id: str, attempts: int = 0) -> bool:
        """
        Process a downloaded video: upload to Drive and create asset record
        """
        try:
            # Find video in database
            from bson import ObjectId
            doc = videos.find_one({'_id': ObjectId(video_id)})
            if not doc:
                print(f"❌ Video not found: {video_id}")
                return False
                
            # Check if video has been downloaded
            if doc.get('downloadStatus') != 'done':
                print(f"⚠️  Video not downloaded yet: {video_id}")
                return False
                
            local_path = doc.get('localPath')
            if not local_path or not os.path.exists(local_path):
                print(f"❌ Local file not found: {local_path}")
                return False
            
            print(f"📤 Processing video: {doc.get('title', 'Unknown')}")
            
            # Ensure YouTube folder exists
            youtube_folder_id = await self.ensure_youtube_folder()
            if not youtube_folder_id:
                print(f"⚠️  Could not ensure YouTube folder, trying to create it...")
                youtube_folder_id = DRIVE_FOLDER_STRUCTURE["videos_downloaded"]
            
            # Upload to Google Drive
            print(f"   Uploading to Google Drive...")
            upload_result = await self.upload_video_file(local_path, youtube_folder_id)
            if not upload_result:
                raise Exception("Failed to upload to Google Drive")
            
            drive_file_id = upload_result.get('id')
            drive_web_link = upload_result.get('webViewLink', '')
            file_size = os.path.getsize(local_path)
            
            # Create asset record
            print(f"   Creating asset record...")
            asset_id = await self.create_asset_record(
                filename=os.path.basename(local_path),
                drive_file_id=drive_file_id,
                platform=doc.get('platform', 'youtube'),
                topics=doc.get('topics', 'unknown'),
                file_size=file_size,
                drive_web_link=drive_web_link,
                metadata={
                    "title": doc.get('title'),
                    "channelName": doc.get('channelName'),
                    "views": doc.get('views'),
                    "uploadedDate": doc.get('uploadedDate'),
                    "downloadedAt": datetime.utcnow().isoformat()
                }
            )
            
            if asset_id:
                # Update video record with asset ID and upload status
                videos.update_one(
                    {'_id': ObjectId(video_id)},
                    {
                        '$set': {
                            'uploadStatus': 'done',
                            'assetId': asset_id,
                            'driveFileId': drive_file_id,
                            'driveWebLink': drive_web_link,
                            'uploadedAt': datetime.utcnow()
                        }
                    }
                )
                print(f"✅ Video processed successfully: {asset_id}")
                return True
        except Exception as e:
            print(f"❌ Error processing video: {e}")
            # Mark as failed in database
            try:
                from bson import ObjectId
                videos.update_one(
                    {'_id': ObjectId(video_id)},
                    {
                        '$set': {
                            'uploadStatus': 'failed',
                            'uploadError': str(e)
                        }
                    }
                )
            except:
                pass
            return False

    async def cleanup_session(self):
        """Cleanup aiohttp session"""
        if self.session:
            await self.session.close()


# Global instance
_drive_service = None

async def get_drive_service(backend_api_url: str = "http://localhost:3000") -> DriveUploadService:
    """Get or create drive upload service instance"""
    global _drive_service
    if _drive_service is None:
        _drive_service = DriveUploadService(backend_api_url)
    return _drive_service


async def process_pending_uploads(backend_api_url: str = "http://localhost:3000"):
    """
    Process all videos that have been downloaded but not yet uploaded
    This should be called periodically by the worker loop
    """
    service = await get_drive_service(backend_api_url)
    
    # Find videos that are downloaded but not uploaded
    pending = videos.find({'downloadStatus': 'done', 'uploadStatus': {'$ne': 'done'}})
    
    for video in pending:
        video_id = str(video['_id'])
        print(f"\n📹 Processing video upload: {video.get('title', 'Unknown')}")
        await service.process_video_download(video_id)
        await asyncio.sleep(1)  # Rate limiting
