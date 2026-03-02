"""
Google Drive Upload Service
Handles uploading downloaded videos to Google Drive and creating asset records
"""

import os
import json
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from .config import DOWNLOAD_ROOT
from .db import videos

# Pre-configured folder IDs from backend config
DRIVE_FOLDER_STRUCTURE = {
    "root": "1m9evYnMp6EV1H4aysk6NMTWgC8p-HAlu",
    "videos": "1cw7x1VSXPZPv-QyY2T6uYM55AtedPRiQ",
    "videos_downloaded": "1OZTHADwa8XMsm7xJ5Gy4R0Y6I1br7Jww",
    # YouTube folder will be created dynamically
    "youtube": None
}

class DriveUploadService:
    """Service to upload downloaded videos to Google Drive"""
    
    def __init__(self, backend_api_url: str = "http://localhost:3000"):
        self.backend_api_url = backend_api_url
        self.session = None
        self.youtube_folder_id = None
        
    async def ensure_youtube_folder(self) -> str:
        """Ensure YouTube folder exists in Videos -> Downloaded, create if needed"""
        if self.youtube_folder_id:
            return self.youtube_folder_id
            
        # For now, we'll use a hardcoded ID or create it via backend
        # The YouTube folder ID should be stored in the config
        try:
            async with aiohttp.ClientSession() as session:
                # Call backend endpoint to get or create YouTube folder
                url = f"{self.backend_api_url}/api/drive/folders/ensure-youtube-folder"
                async with session.post(url, json={
                    "parentFolderId": DRIVE_FOLDER_STRUCTURE["videos_downloaded"],
                    "folderName": "youtube"
                }) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.youtube_folder_id = data.get('folderId')
                        print(f"✅ YouTube folder ensured: {self.youtube_folder_id}")
                        return self.youtube_folder_id
        except Exception as e:
            print(f"⚠️  Failed to get YouTube folder from backend: {e}")
            # Fallback: return a default ID (would need to be created manually)
            self.youtube_folder_id = None
            
        return self.youtube_folder_id

    async def upload_video_file(self, file_path: str, drive_folder_id: str) -> Optional[Dict[str, Any]]:
        """
        Upload video file to Google Drive
        Returns: {fileId, webViewLink, thumbnailLink, name, mimeType, size}
        """
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return None
            
        try:
            file_size = os.path.getsize(file_path)
            file_name = os.path.basename(file_path)
            
            # Call backend API to upload file
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_api_url}/api/drive/files/upload"
                
                # Read file as binary
                with open(file_path, 'rb') as f:
                    file_data = f.read()
                
                form = aiohttp.FormData()
                form.add_field('file', file_data, filename=file_name)
                form.add_field('parentFolderId', drive_folder_id)
                form.add_field('mimeType', 'video/mp4')
                
                async with session.post(url, data=form) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Video uploaded to Drive: {file_name}")
                        return result.get('data', {})
                    else:
                        print(f"❌ Upload failed: {resp.status}")
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
        drive_web_link: str,
        metadata: Dict = None
    ) -> Optional[str]:
        """
        Create asset record in backend for uploaded video
        Returns: assetId if successful
        """
        try:
            storage_info = {
                "location": "google-drive",
                "googleDriveId": drive_file_id,
                "webViewLink": drive_web_link
            }
            
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
                    "uploadedAt": datetime.utcnow().isoformat()
                }
            }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.backend_api_url}/api/assets/create"
                async with session.post(url, json=asset_data) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        asset_id = result.get('asset', {}).get('assetId')
                        print(f"✅ Asset created: {asset_id}")
                        return asset_id
                    else:
                        error = await resp.text()
                        print(f"❌ Asset creation failed: {resp.status} - {error}")
                        return None
        except Exception as e:
            print(f"❌ Asset creation error: {e}")
            return None

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
