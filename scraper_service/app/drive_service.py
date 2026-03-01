import io
import json
import os
from pathlib import Path
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload

from .config import OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, DRIVE_TOKEN_PATH, DRIVE_FOLDER_STRUCTURE_PATH

SCOPES = ['https://www.googleapis.com/auth/drive']
FOLDER_MIME = 'application/vnd.google-apps.folder'


class GoogleDrivePythonService:
    def __init__(self):
        self.token_path = Path(DRIVE_TOKEN_PATH)
        self.folder_structure_path = Path(DRIVE_FOLDER_STRUCTURE_PATH)
        self.drive = None
        self.creds = None
        self.folder_map = self._load_folder_map()

    def _load_folder_map(self):
        if self.folder_structure_path.exists():
            try:
                data = json.loads(self.folder_structure_path.read_text(encoding='utf-8'))
                return data.get('folders', {})
            except Exception:
                return {}
        return {}

    def authenticate(self):
        if self.drive:
            return {'success': True, 'authenticated': True, 'configured': True}

        if not OAUTH_CLIENT_ID or not OAUTH_CLIENT_SECRET:
            return {
                'success': True,
                'authenticated': False,
                'configured': False,
                'message': 'OAuth env missing. Set OAUTH_CLIENT_ID/OAUTH_CLIENT_SECRET',
            }

        if not self.token_path.exists():
            return {
                'success': True,
                'authenticated': False,
                'configured': True,
                'message': f'Token file not found at {self.token_path}',
            }

        token_info = json.loads(self.token_path.read_text(encoding='utf-8'))
        token_info.setdefault('client_id', OAUTH_CLIENT_ID)
        token_info.setdefault('client_secret', OAUTH_CLIENT_SECRET)

        creds = Credentials.from_authorized_user_info(token_info, SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            self.token_path.parent.mkdir(parents=True, exist_ok=True)
            self.token_path.write_text(creds.to_json(), encoding='utf-8')

        self.creds = creds
        self.drive = build('drive', 'v3', credentials=creds)
        return {'success': True, 'authenticated': True, 'configured': True}

    def get_folder_map(self):
        return self.folder_map

    def _find_folder(self, name: str, parent_id: str):
        q = f"name='{name}' and mimeType='{FOLDER_MIME}' and '{parent_id}' in parents and trashed=false"
        res = self.drive.files().list(q=q, spaces='drive', fields='files(id,name)', pageSize=1).execute()
        files = res.get('files', [])
        return files[0]['id'] if files else None

    def get_or_create_folder(self, name: str, parent_id: str):
        existing = self._find_folder(name, parent_id)
        if existing:
            return existing
        meta = {'name': name, 'mimeType': FOLDER_MIME, 'parents': [parent_id]}
        created = self.drive.files().create(body=meta, fields='id,name').execute()
        return created['id']

    def ensure_downloaded_platform_folder(self, platform: str):
        auth = self.authenticate()
        if not auth.get('authenticated'):
            return None

        root = self.folder_map.get('Affiliate AI')
        if not root:
            root = self.get_or_create_folder('Affiliate AI', 'root')
            self.folder_map['Affiliate AI'] = root

        videos = self.folder_map.get('Affiliate AI/Videos') or self.get_or_create_folder('Videos', root)
        self.folder_map['Affiliate AI/Videos'] = videos

        downloaded = self.folder_map.get('Affiliate AI/Videos/Downloaded') or self.get_or_create_folder('Downloaded', videos)
        self.folder_map['Affiliate AI/Videos/Downloaded'] = downloaded

        target_name = 'Youtube' if platform == 'youtube' else 'Reels' if platform == 'facebook' else 'Tiktok'
        target_key = f'Affiliate AI/Videos/Downloaded/{target_name}'
        target_id = self.folder_map.get(target_key) or self.get_or_create_folder(target_name, downloaded)
        self.folder_map[target_key] = target_id
        return target_id

    def upload_file(self, file_path: str, folder_id: str, description: str = '', properties: Optional[dict] = None):
        self.authenticate()
        media = MediaFileUpload(file_path, resumable=True)
        body = {
            'name': os.path.basename(file_path),
            'parents': [folder_id],
            'description': description or 'Uploaded by Shorts/Reels scraper service',
            'properties': properties or {},
        }
        f = self.drive.files().create(body=body, media_body=media, fields='id,name,mimeType,webViewLink,size,createdTime').execute()
        return f

    def make_public(self, file_id: str):
        self.authenticate()
        return self.drive.permissions().create(fileId=file_id, body={'role': 'reader', 'type': 'anyone'}).execute()

    def delete_file(self, file_id: str):
        self.authenticate()
        self.drive.files().delete(fileId=file_id).execute()
        return {'success': True}

    def list_folders(self, parent_id: str = 'root'):
        self.authenticate()
        q = f"mimeType='{FOLDER_MIME}' and '{parent_id}' in parents and trashed=false"
        res = self.drive.files().list(q=q, fields='files(id,name,createdTime)', pageSize=200).execute()
        return res.get('files', [])

    def list_files(self, folder_id: str, file_type: str | None = None):
        self.authenticate()
        q = f"'{folder_id}' in parents and trashed=false"
        if file_type == 'video':
            q += " and mimeType contains 'video/'"
        elif file_type == 'image':
            q += " and mimeType contains 'image/'"
        res = self.drive.files().list(q=q, fields='files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)', pageSize=200).execute()
        return res.get('files', [])

    def browse(self, folder_id: str):
        self.authenticate()
        q = f"'{folder_id}' in parents and trashed=false"
        res = self.drive.files().list(q=q, fields='files(id,name,mimeType,size,createdTime)').execute()
        items = res.get('files', [])
        subfolders = [x for x in items if x.get('mimeType') == FOLDER_MIME]
        files = [x for x in items if x.get('mimeType') != FOLDER_MIME]
        return {'folderId': folder_id, 'subfolders': subfolders, 'files': files}

    def upload_downloaded_video(self, file_path: str, platform: str, metadata: Optional[dict] = None):
        folder_id = self.ensure_downloaded_platform_folder(platform)
        if not folder_id:
            return {'success': False, 'message': 'Google Drive not authenticated/configured'}

        f = self.upload_file(file_path, folder_id, description='Auto uploaded after scraping download', properties=metadata or {})
        self.make_public(f['id'])
        return {'success': True, 'file': f, 'folderId': folder_id}


drive_service = GoogleDrivePythonService()
