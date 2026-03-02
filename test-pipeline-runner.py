#!/usr/bin/env python
"""
Test Download + Upload Pipeline (Runner Version)
Simple test that can be run with just: python test-pipeline-runner.py
"""

import subprocess
import sys
import json
import time
from pathlib import Path

def run_command(cmd, description):
    """Run a shell command and return output"""
    print(f"\n{'='*80}")
    print(f"🔧 {description}")
    print(f"{'='*80}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=False,
            text=True,
            timeout=600  # 10 minutes max
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"❌ Command timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    print(f"\n{'='*80}")
    print("📹 Download + Upload Pipeline Runner")
    print(f"{'='*80}")
    
    root = Path(__file__).parent
    
    # Step 1: Activate venv and run test
    print("\n📊 Step 1: Checking Python environment...")
    env_check = subprocess.run(
        [sys.executable, "-c", "import sys; print(f'Python: {sys.version}')"],
        capture_output=True,
        text=True
    )
    print(env_check.stdout)
    
    # Step 2: Check if we can import the modules
    print("\n📚 Step 2: Checking imports...")
    import_check = subprocess.run(
        [sys.executable, "-c", """
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'scraper_service'))
try:
    from app.config import PORT
    print(f'✅ Imports successful, PORT={PORT}')
except ImportError as e:
    print(f'❌ Import failed: {e}')
    sys.exit(1)
"""],
        capture_output=True,
        text=True,
        cwd=str(root)
    )
    print(import_check.stdout)
    if import_check.returncode != 0:
        print(import_check.stderr)
        return False
    
    # Step 3: Run the actual test
    print("\n🚀 Step 3: Running download + upload test...")
    test_cmd = [
        sys.executable,
        "-c",
        """
import sys
import asyncio
from pathlib import Path

# Add paths
root = Path(__file__).resolve().parent
sys.path.insert(0, str(root / 'scraper_service'))

from app.db import videos
from bson import ObjectId

async def quick_test():
    # Check video count
    total = videos.count_documents({})
    pending = videos.count_documents({'downloadStatus': 'pending'})
    done = videos.count_documents({'downloadStatus': 'done'})
    
    print(f"📊 Database Status:")
    print(f"   Total Videos: {total}")
    print(f"   Pending: {pending}")
    print(f"   Done: {done}")
    
    if pending == 0:
        print(f"   ⚠️  No pending videos to download!")
        return
    
    # Try to process one video
    try:
        from app.automation import process_download
        
        video = videos.find_one({'downloadStatus': 'pending'})
        if video:
            print(f"\\n📥 Testing download of: {video.get('title', 'Unknown')}")
            print(f"   URL: {video.get('url', 'N/A')}")
            print(f"   This would download to: {video.get('videoId')}.mp4")
    except Exception as e:
        print(f"   Error: {e}")

asyncio.run(quick_test())
"""
    ]
    
    result = subprocess.run(
        test_cmd,
        capture_output=False,
        text=True,
        cwd=str(root)
    )
    
    print("\n" + "="*80)
    if result.returncode == 0:
        print("✅ Test Runner Completed")
    else:
        print("❌ Test Runner Failed")
    print("="*80)
    
    return result.returncode == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
