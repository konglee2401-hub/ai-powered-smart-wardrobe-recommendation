#!/usr/bin/env python3
"""
Query MongoDB for scene data from the PromptOption collection
"""
import sys
import json
from pymongo import MongoClient

def query_scenes():
    # Connect to MongoDB
    mongo_url = 'mongodb://localhost/smart-wardrobe'
    client = MongoClient(mongo_url)
    
    try:
        # Get the database
        db = client['smart-wardrobe']
        collection = db['promptoptions']
        
        print('Connected to MongoDB')
        print('=' * 80)
        
        # Query for scenes
        scenes = collection.find(
            {'category': 'scene'},
            {
                'value': 1,
                'sceneLockedImageUrl': 1,
                'sceneLockedImageUrls': 1,
                'sceneLockSamples': 1
            }
        ).limit(5)
        
        scenes_list = list(scenes)
        
        print('\n=== Full JSON Output ===\n')
        print(json.dumps(scenes_list, indent=2, default=str))
        
        print('\n=== Detailed Analysis ===\n')
        
        if not scenes_list:
            print('No scenes found in database!')
            return
        
        for i, scene in enumerate(scenes_list, 1):
            print(f'\nScene {i}:')
            print(f'  ID (value): {scene.get("value", "N/A")}')
            
            # Check sceneLockedImageUrl
            scene_locked_url = scene.get('sceneLockedImageUrl')
            if scene_locked_url:
                preview = str(scene_locked_url)[:100]
                print(f'  sceneLockedImageUrl exists: YES')
                print(f'    Value (first 100 chars): {preview}{"..." if len(str(scene_locked_url)) > 100 else ""}')
            else:
                print(f'  sceneLockedImageUrl exists: NO')
            
            # Check sceneLockedImageUrls
            scene_locked_urls = scene.get('sceneLockedImageUrls')
            if scene_locked_urls:
                is_list = isinstance(scene_locked_urls, list)
                print(f'  sceneLockedImageUrls exists: YES')
                print(f'    Type: {"Array" if is_list else type(scene_locked_urls).__name__}')
                if is_list:
                    print(f'    Count: {len(scene_locked_urls)}')
                    if scene_locked_urls:
                        print(f'    Contents:')
                        for j, url in enumerate(scene_locked_urls, 1):
                            preview = str(url)[:80]
                            print(f'      [{j}] {preview}{"..." if len(str(url)) > 80 else ""}')
                else:
                    print(f'    Value: {scene_locked_urls}')
            else:
                print(f'  sceneLockedImageUrls exists: NO')
            
            # Check sceneLockSamples
            scene_lock_samples = scene.get('sceneLockSamples')
            if scene_lock_samples:
                is_list = isinstance(scene_lock_samples, list)
                print(f'  sceneLockSamples exists: YES')
                print(f'    Type: {"Array" if is_list else type(scene_lock_samples).__name__}')
                if is_list:
                    print(f'    Item count: {len(scene_lock_samples)}')
                    if scene_lock_samples:
                        print(f'    Contents:')
                        for j, sample in enumerate(scene_lock_samples[:3], 1):  # Show first 3
                            sample_str = json.dumps(sample, indent=6, default=str) if isinstance(sample, dict) else str(sample)
                            print(f'      [{j}] {sample_str}')
                        if len(scene_lock_samples) > 3:
                            print(f'      ... and {len(scene_lock_samples) - 3} more')
                else:
                    print(f'    Value: {scene_lock_samples}')
            else:
                print(f'  sceneLockSamples exists: NO')
        
        print('\n' + '=' * 80)
        print(f'Total scenes found: {len(scenes_list)}')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print('MongoDB connection closed')

if __name__ == '__main__':
    query_scenes()
