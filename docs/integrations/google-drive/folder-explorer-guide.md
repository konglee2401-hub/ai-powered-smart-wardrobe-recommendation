# Google Drive Folder Explorer Integration Guide

## Overview

The Smart Wardrobe app now integrates with your existing Google Drive folder structure without auto-creating folders. It uses a pre-detected configuration that mirrors your manual folder organization.

## Folder Structure

Your Google Drive structure has been detected and cached:

```
Affiliate AI (Root)
├── Images
│   ├── Completed          - ✅ Generated images marked complete
│   ├── Downloaded         - Downloaded content
│   └── Uploaded
│       └── App            - Generated images pending completion
├── Videos
│   ├── Completed          - ✅ Generated videos marked complete
│   ├── Downloaded
│   │   ├── Reels          - Short-form videos
│   │   └── Tiktok         - TikTok-targeted videos
│   ├── Queue              - Videos waiting for processing
│   └── Uploaded
│       └── App            - Generated videos pending completion
```

**Folder IDs** are cached in: `backend/config/drive-folder-structure.json`

## Setup

### 1. Detect Your Folder Structure

Run this script once to read your Google Drive folders:

```bash
cd backend
node scripts/detectDriveFolderStructure.js
```

This creates `backend/config/drive-folder-structure.json` with all folder IDs.

### 2. No Auto-Folder Creation

The app **will NOT** automatically create folders. It uses your pre-configured structure:
- ✅ Loads from config on startup
- ✅ Uses existing folder IDs
- ✅ Respects your manual organization

### 3. Update When You Add Folders

If you manually add new folders to your Drive structure, re-run the detection script:

```bash
node scripts/detectDriveFolderStructure.js
```

## API Endpoints

### 1. Get Folder Tree Structure

**Endpoint**: `GET /api/drive/folders/tree`

Returns the complete folder hierarchy for UI rendering.

```javascript
// Response:
{
  "success": true,
  "tree": {
    "name": "Affiliate AI",
    "id": "1m9evYnMp6EV1H4aysk6NMTWgC8p-HAlu",
    "children": [
      {
        "name": "Images",
        "id": "1ilDT6BLhParYL39ukfht-LYFzVLNtg_W",
        "children": [...]
      },
      {
        "name": "Videos",
        "id": "1cw7x1VSXPZPv-QyY2T6uYM55AtedPRiQ",
        "children": [...]
      }
    ]
  }
}
```

### 2. Get Folder Map (Flat Structure)

**Endpoint**: `GET /api/drive/folders/map`

Returns all folders as a flat key-value map.

```javascript
// Response:
{
  "success": true,
  "folders": {
    "Affiliate AI": "1m9evYnMp6EV1H4aysk6NMTWgC8p-HAlu",
    "Affiliate AI/Images": "1ilDT6BLhParYL39ukfht-LYFzVLNtg_W",
    "Affiliate AI/Images/Completed": "1ym8dGpmGZYksk40aIfktHk_c_Hj7MZ4K",
    "Affiliate AI/Images/Downloaded": "1Wbze_yn0SAL-krp1oFcpxDDxEvgBf625",
    "Affiliate AI/Images/Uploaded": "1kTua_KiArbeVvSl_iikug8_i3VQ4J2BZ",
    "Affiliate AI/Images/Uploaded/App": "1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV",
    "Affiliate AI/Videos": "1cw7x1VSXPZPv-QyY2T6uYM55AtedPRiQ",
    ...
  },
  "count": 14
}
```

### 3. List Files in Folder

**Endpoint**: `GET /api/drive/folders/:folderId/files`

Lists files in a specific folder with optional filtering.

**Query Parameters**:
- `type`: `'image'` | `'video'` | (optional, returns all by default)
- `pageSize`: number (default: 50, max: 1000)
- `orderBy`: `'createdTime desc'` | `'name asc'` (default: `'createdTime desc'`)

**Example**: Get images from the Uploaded/App folder, sorted by newest first:

```javascript
// Request:
GET /api/drive/folders/1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV/files?type=image&pageSize=20

// Response:
{
  "success": true,
  "folderId": "1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV",
  "fileType": "image",
  "count": 3,
  "files": [
    {
      "id": "19OU6YFTl4ibxHQRH2F3MtYBIpYp1rsln",
      "name": "test-upload-1771925713843.png",
      "mimeType": "image/png",
      "createdTime": "2026-02-24T09:35:13.000Z",
      "size": "70",
      "type": "image",
      "url": "https://drive.google.com/file/d/19OU6YFTl4ibxHQRH...",
      "thumbnail": "https://lh3.googleusercontent.com/..."
    }
  ]
}
```

### 4. Get Files by Path

**Endpoint**: `GET /api/drive/files/by-path/:path`

Get files from a folder by its path instead of ID.

**Example**: Get all videos from Videos/Uploaded/App:

```javascript
// Request:
GET /api/drive/files/by-path/Affiliate AI/Videos/Uploaded/App?type=video

// Response:
{
  "success": true,
  "folderId": "165YZF6z-xSzrSCrPcuXnp_qvBJc4nWFW",
  "fileType": "video",
  "count": 2,
  "files": [...]
}
```

### 5. Browse Folder (Folder Explorer)

**Endpoint**: `GET /api/drive/browse/:folderId`

Get folder contents with breadcrumb navigation.

```javascript
// Request:
GET /api/drive/browse/1ilDT6BLhParYL39ukfht-LYFzVLNtg_W

// Response:
{
  "success": true,
  "folderId": "1ilDT6BLhParYL39ukfht-LYFzVLNtg_W",
  "folderPath": "Affiliate AI/Images",
  "breadcrumb": ["Affiliate AI", "Images"],
  "subfolders": [
    { "id": "1ym8dGpmGZYksk40aIfktHk_c_Hj7MZ4K", "name": "Completed", "type": "folder" },
    { "id": "1Wbze_yn0SAL-krp1oFcpxDDxEvgBf625", "name": "Downloaded", "type": "folder" },
    { "id": "1kTua_KiArbeVvSl_iikug8_i3VQ4J2BZ", "name": "Uploaded", "type": "folder" }
  ],
  "files": [
    {
      "id": "file_id_1",
      "name": "image1.jpg",
      "type": "image",
      "mimeType": "image/jpeg",
      "size": "250000",
      "createdTime": "2026-02-24T09:00:00.000Z"
    }
  ]
}
```

## Frontend Implementation

### Example: Gallery Picker with Folder Explorer

```javascript
// frontend/src/components/DriveFolderExplorer.jsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';

export function DriveFolderExplorer({ fileType = 'image', onSelectFile }) {
  const [folderTree, setFolderTree] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);

  // Load folder structure on mount
  useEffect(() => {
    loadFolderStructure();
  }, []);

  const loadFolderStructure = async () => {
    try {
      const response = await api.get('/drive/folders/tree');
      setFolderTree(response.data.tree);
      // Set initial folder to root
      setCurrentFolder(response.data.tree.id);
      setBreadcrumb(['Affiliate AI']);
    } catch (error) {
      console.error('Error loading folder structure:', error);
    }
  };

  const loadFolderContents = async (folderId) => {
    try {
      setLoading(true);
      const response = await api.get(`/drive/browse/${folderId}`);
      setCurrentFolder(folderId);
      setBreadcrumb(response.data.breadcrumb);
      setFiles(response.data.files.filter(f => {
        if (fileType === 'image') return f.type === 'image';
        if (fileType === 'video') return f.type === 'video';
        return true;
      }));
    } catch (error) {
      console.error('Error loading folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (subfolder) => {
    loadFolderContents(subfolder.id);
  };

  const handleFileSelect = (file) => {
    onSelectFile(file);
  };

  if (!folderTree) return <div>Loading...</div>;

  return (
    <div className="drive-explorer">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb">
        {breadcrumb.map((folder, idx) => (
          <span key={idx}>
            {idx > 0 && ' / '}
            <button onClick={() => loadFolderContents(currentFolder)}>
              {folder}
            </button>
          </span>
        ))}
      </div>

      <div className="explorer-content">
        {/* Subfolders */}
        {currentFolder && (
          <div className="subfolders">
            <div className="subfolders-grid">
              {/* Render subfolders from /browse endpoint */}
            </div>
          </div>
        )}

        {/* Files */}
        <div className="files">
          <div className="files-grid">
            {loading ? (
              <div>Loading files...</div>
            ) : files.length === 0 ? (
              <div>No {fileType}s found</div>
            ) : (
              files.map(file => (
                <div
                  key={file.id}
                  className="file-item"
                  onClick={() => handleFileSelect(file)}
                >
                  {fileType === 'image' ? (
                    <img src={file.thumbnail} alt={file.name} />
                  ) : (
                    <div className="video-thumbnail">▶️</div>
                  )}
                  <p>{file.name}</p>
                  <small>{new Date(file.createdTime).toLocaleDateString()}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Example: Using the Gallery Picker in Image Upload

```javascript
// In your image upload component
import { DriveFolderExplorer } from './DriveFolderExplorer';

export function ImageUploadBox() {
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);

  const handleSelectFromDrive = (file) => {
    console.log('Selected file:', file);
    // Use file.url or file.id for further operations
    setShowDriveExplorer(false);
  };

  return (
    <div>
      {/* Your existing upload UI */}
      <button onClick={() => setShowDriveExplorer(!showDriveExplorer)}>
        Browse Google Drive
      </button>

      {showDriveExplorer && (
        <DriveFolderExplorer
          fileType="image"  // Filter to only images
          onSelectFile={handleSelectFromDrive}
        />
      )}
    </div>
  );
}
```

## How Uploads Work Now

### When Saving Generated Images

1. **Image generation completes** in `ImageGenerationPage.jsx`
2. **Save to database** (Asset model)
3. **Upload to Google Drive** → `Images/Uploaded/App` folder
4. **Move to completed** → Can be manually moved to `Images/Completed` in Drive

### When Saving Generated Videos

1. **Video generation completes**
2. **Save to database** (Generation model)
3. **Upload to Google Drive** → `Videos/Uploaded/App` folder
4. **Organize manually** → Move to `Reels`, `Tiktok`, `Downloaded/Reels` etc.

### For Other Features

- **Mashup Videos**: Store in `Videos/Queue` or `Videos/Downloaded/[Platform]`
- **Cron Jobs**: Can query by folder using the APIs

## Configuration Files

### `backend/config/drive-folder-structure.json`

Auto-generated by `detectDriveFolderStructure.js`. Contains:
- Folder tree (nested structure)
- Flat folder map (for quick lookups)
- Root folder ID
- Last updated timestamp

**Don't hand-edit this file** - re-run the detection script if you change your Drive structure.

## Troubleshooting

### "Folder structure not configured"

**Solution**: Run the detection script:
```bash
node scripts/detectDriveFolderStructure.js
```

### Files not appearing in list

**Issue**: Filter might be too restrictive.

**Solution**: Check the MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Videos: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`

### Performance with large folders

**Use pagination**:
```javascript
GET /api/drive/folders/folderId/files?pageSize=50&orderBy=createdTime desc
```

## Summary

✅ **Before**: Auto-creates folders, can conflict with manual organization
✅ **Now**: Uses your existing folder structure, no auto-creation
✅ **Benefit**: Your Drive stays organized exactly as you want it
✅ **Flexibility**: Add the folder explorer UI to gallery pickers
✅ **Future-ready**: Other features (mashup, cron jobs) can use the same API
