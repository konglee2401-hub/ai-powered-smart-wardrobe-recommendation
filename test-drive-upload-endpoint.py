#!/usr/bin/env python3
"""
Test script for the new Google Drive upload endpoint
Tests: POST /api/drive/files/upload-with-metadata
"""

import requests
import json
from pathlib import Path

# Configuration
BACKEND_URL = "http://localhost:3000"
ENDPOINT = f"{BACKEND_URL}/api/drive/files/upload-with-metadata"

# Test platforms
PLATFORMS = ["youtube", "playboard", "dailyhaha", "douyin"]

def test_endpoint_with_mock_file(platform: str) -> bool:
    """
    Test the upload endpoint with a mock file
    
    Args:
        platform: Platform name (youtube, playboard, dailyhaha, douyin)
    
    Returns:
        True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Testing: {platform.upper()} Upload")
    print(f"{'='*60}")
    
    try:
        # Create a small test file (~1MB)
        test_file_content = b"x" * (1024 * 1024)  # 1MB of data
        test_filename = f"test-{platform}-video.mp4"
        
        files = {
            'file': (test_filename, test_file_content, 'video/mp4')
        }
        
        data = {
            'platform': platform,
            'source': platform,
            'description': f'Test video for {platform} platform'
        }
        
        print(f"📤 Uploading test file: {test_filename}")
        print(f"   Endpoint: {ENDPOINT}")
        print(f"   Platform: {platform}")
        
        response = requests.post(
            ENDPOINT,
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Response: {json.dumps(result, indent=2)}")
            
            # Verify expected fields
            if 'data' in result:
                data = result['data']
                required_fields = ['id', 'fileId', 'webViewLink']
                missing = [f for f in required_fields if f not in data]
                
                if missing:
                    print(f"⚠️  Missing fields: {missing}")
                    return False
                
                print(f"   File ID: {data['id']}")
                print(f"   Web Link: {data['webViewLink']}")
                return True
            else:
                print(f"⚠️  Response missing 'data' field")
                return False
        else:
            print(f"❌ Upload failed!")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Could not reach {BACKEND_URL}")
        print(f"   Make sure the backend is running on localhost:3000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_endpoint_structure():
    """Test that the endpoint exists and returns proper errors"""
    print(f"\n{'='*60}")
    print("Testing Endpoint Structure")
    print(f"{'='*60}")
    
    # Test 1: Missing file
    print("\n1️⃣  Testing missing file...")
    try:
        response = requests.post(
            ENDPOINT,
            data={'platform': 'youtube'},
            timeout=10
        )
        if response.status_code == 400:
            print("   ✅ Correctly rejected request without file")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Missing platform and parentFolderId
    print("\n2️⃣  Testing missing platform/folder ID...")
    try:
        files = {'file': ('test.mp4', b'test', 'video/mp4')}
        response = requests.post(
            ENDPOINT,
            files=files,
            timeout=10
        )
        if response.status_code == 400:
            print("   ✅ Correctly rejected request without platform")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Invalid platform
    print("\n3️⃣  Testing invalid platform...")
    try:
        files = {'file': ('test.mp4', b'test', 'video/mp4')}
        response = requests.post(
            ENDPOINT,
            files=files,
            data={'platform': 'invalid-platform'},
            timeout=10
        )
        if response.status_code == 400:
            print("   ✅ Correctly rejected invalid platform")
        else:
            print(f"   ⚠️  Status: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("GOOGLE DRIVE UPLOAD ENDPOINT TEST")
    print("="*60)
    
    # Test endpoint structure
    test_endpoint_structure()
    
    # Test with each platform (if backend is available)
    print("\n" + "="*60)
    print("TESTING WITH EACH PLATFORM")
    print("="*60)
    
    print(f"\n⚠️  NOTE: Full upload tests require:")
    print(f"   1. Backend running on localhost:3000")
    print(f"   2. Google Drive authenticated")
    print(f"   3. Valid folder IDs configured")
    
    response = input("\nRun full platform tests? (y/n): ")
    if response.lower() == 'y':
        results = {}
        for platform in PLATFORMS:
            try:
                results[platform] = test_endpoint_with_mock_file(platform)
            except KeyboardInterrupt:
                print("\n⏸️  Tests interrupted by user")
                break
        
        # Summary
        print(f"\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        for platform, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {platform:12} {status}")
    
    print("\n✅ Test complete!")


if __name__ == '__main__':
    main()
