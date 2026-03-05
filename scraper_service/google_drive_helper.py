"""
Google Drive Integration for Scraper Service
Automatically uploads scraped videos to their source folders on Google Drive
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict


# Map platform names to folder names and folder structure keys
PLATFORM_FOLDER_MAP = {
    'youtube': {
        'folder_name': 'Youtube',
        'config_key': 'Affiliate AI/Videos/Downloaded/Youtube',
        'description': 'YouTube downloaded videos'
    },
    'playboard': {
        'folder_name': 'Playboard',
        'config_key': 'Affiliate AI/Videos/Downloaded/Playboard',
        'description': 'Playboard downloaded videos'
    },
    'dailyhaha': {
        'folder_name': 'Dailyhaha',
        'config_key': 'Affiliate AI/Videos/Downloaded/Dailyhaha',
        'description': 'DailyHaha downloaded videos'
    },
    'douyin': {
        'folder_name': 'Douyin',
        'config_key': 'Affiliate AI/Videos/Downloaded/Douyin',
        'description': 'Douyin (TikTok China) downloaded videos'
    },
    'tiktok': {
        'folder_name': 'Tiktok',
        'config_key': 'Affiliate AI/Videos/Downloaded/Tiktok',
        'description': 'TikTok downloaded videos'
    }
}


def _get_folder_structure_config() -> Optional[Dict]:
    """
    Load folder structure from backend config
    
    Returns:
        Folder structure config dict or None if not found
    """
    try:
        # Try multiple possible paths
        possible_paths = [
            Path(__file__).parent.parent / 'backend' / 'config' / 'drive-folder-structure.json',
            Path(__file__).parent.parent / 'backend' / 'config' / 'drive-folder-structure.json',
            Path('/') / 'Work' / 'Affiliate-AI' / 'smart-wardrobe' / 'backend' / 'config' / 'drive-folder-structure.json',
        ]
        
        for config_path in possible_paths:
            if config_path.exists():
                with open(config_path, 'r') as f:
                    return json.load(f)
        
        print(f"⚠️  Folder structure config not found in any of the expected paths")
        return None
    
    except Exception as e:
        print(f"❌ Error loading folder structure: {e}")
        return None


def get_folder_id_for_platform(platform: str) -> Optional[str]:
    """
    Get the Google Drive folder ID for a specific platform/source
    
    Args:
        platform: Platform name (youtube, playboard, dailyhaha, douyin, tiktok)
    
    Returns:
        Folder ID string or None if not found
    """
    platform_lower = (platform or '').lower()
    
    if platform_lower not in PLATFORM_FOLDER_MAP:
        print(f"❌ Unknown platform: {platform}")
        return None
    
    config_key = PLATFORM_FOLDER_MAP[platform_lower]['config_key']
    
    try:
        folder_config = _get_folder_structure_config()
        if not folder_config:
            print(f"❌ Could not load folder structure config")
            return None
        
        folder_id = folder_config.get('folders', {}).get(config_key)
        
        if not folder_id:
            print(f"⚠️  Folder ID for {platform} not found in config")
            return None
        
        return folder_id
    
    except Exception as e:
        print(f"❌ Error getting folder ID for {platform}: {e}")
        return None


def get_all_configured_platforms() -> list:
    """
    Get all configured platforms from the folder structure
    
    Returns:
        List of platform names
    """
    try:
        folder_config = _get_folder_structure_config()
        if not folder_config:
            return list(PLATFORM_FOLDER_MAP.keys())
        
        configured_platforms = []
        for platform, mapping in PLATFORM_FOLDER_MAP.items():
            folder_id = folder_config.get('folders', {}).get(mapping['config_key'])
            if folder_id:
                configured_platforms.append(platform)
        
        return configured_platforms or list(PLATFORM_FOLDER_MAP.keys())
    
    except Exception as e:
        print(f"⚠️  Error getting platforms: {e}")
        return list(PLATFORM_FOLDER_MAP.keys())


def print_all_source_folders():
    """Print all configured source folders for debugging"""
    try:
        folder_config = _get_folder_structure_config()
        if not folder_config:
            print("❌ Could not load folder structure config")
            return
        
        print("\n📁 Configured Scraper Source Folders:\n")
        
        for platform, mapping in PLATFORM_FOLDER_MAP.items():
            folder_id = folder_config.get('folders', {}).get(mapping['config_key'])
            if folder_id:
                print(f"  {platform:15} → {folder_id}")
                print(f"    {mapping['description']}")
            else:
                print(f"  {platform:15} → NOT CONFIGURED")
        
        print()
    
    except Exception as e:
        print(f"❌ Error listing folders: {e}")


# Command-line usage for testing
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'list':
            print_all_source_folders()
        elif sys.argv[1] == 'get':
            platform = sys.argv[2] if len(sys.argv) > 2 else 'youtube'
            folder_id = get_folder_id_for_platform(platform)
            print(f"Folder ID for {platform}: {folder_id}")
    else:
        platforms = get_all_configured_platforms()
        print(f"\n✅ Configured platforms: {', '.join(platforms)}\n")
