#!/usr/bin/env python3
"""
Grok Session Capture using undetected-chromedriver
Better Cloudflare handling than Puppeteer/Playwright
"""

import undetected_chromedriver as uc
import json
import time
import os
import sys
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class GrokSessionCaptureUndetected:
    def __init__(self):
        self.base_url = 'https://grok.com'
        self.session_file = Path(__file__).parent.parent / '.sessions' / 'grok-session-complete.json'
        self.driver = None

    def capture_session_interactive(self):
        print('\n' + '═' * 80)
        print('🎭 GROK SESSION CAPTURE - undetected-chromedriver (Python)')
        print('═' * 80)
        print('\n📋 Steps:')
        print('  1. Browser will open with undetected Chrome')
        print('  2. Better Cloudflare handling than Puppeteer/Playwright')
        print('  3. Perform manual login if needed')
        print('  4. Auto-detect and capture session\n')

        try:
            print('🚀 Launching undetected Chrome...')
            
            # Use undetected-chromedriver for Cloudflare bypass
            options = uc.ChromeOptions()
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('--start-maximized')
            
            self.driver = uc.Chrome(options=options, version_main=None)
            print('✅ Browser launched\n')

            print('🌐 Opening Grok.com...')
            self.driver.get(self.base_url)
            
            # Wait for page load with longer timeout for Cloudflare
            time.sleep(5)
            print('✅ Grok.com loaded\n')

            # Auto-detect login
            print('📍 Waiting for login... (auto-detecting every 5 seconds)\n')
            login_detected = self.wait_for_login(timeout=600)  # 10 minutes
            
            if not login_detected:
                print('⚠️  Login timeout after 10 minutes\n')
                return

            # Capture session
            self.capture_session_data()
            print('\n✅ Session capture completed!')

        except Exception as e:
            print(f'❌ Error: {str(e)}')
            import traceback
            traceback.print_exc()
        
        finally:
            if self.driver:
                print('\n🔌 Closing browser...')
                self.driver.quit()

    def wait_for_login(self, timeout=600):
        """Wait for user to login - check every 5 seconds"""
        start_time = time.time()
        attempt = 0

        while (time.time() - start_time) < timeout:
            attempt += 1
            time.sleep(5)

            try:
                is_logged_in = self.check_login_status()
                if is_logged_in:
                    print('✅ Login detected! Capturing session...\n')
                    return True
            except:
                pass

            if attempt % 6 == 0:  # Every 30 seconds
                elapsed = int(time.time() - start_time)
                print(f'⏳ Still waiting for login... ({elapsed}s elapsed)')

        return False

    def check_login_status(self):
        """Check if user is logged in"""
        try:
            # Check for login indicators
            page_text = self.driver.find_element(By.TAG_NAME, 'body').text
            
            has_signout = 'Sign out' in page_text or 'Logout' in page_text
            
            # Check for user menu elements
            user_elements = self.driver.find_elements(By.XPATH, 
                "//*[contains(@aria-label, 'user') or contains(@aria-label, 'profile')]")
            
            return has_signout or len(user_elements) > 0
        except:
            return False

    def capture_session_data(self):
        """Capture cookies and localStorage"""
        try:
            print('  📸 Capturing session data...')

            # Get cookies
            print('  🍪 Capturing cookies...')
            cookies = self.driver.get_cookies()
            print(f'     ✓ {len(cookies)} cookies captured')

            # Get localStorage
            print('  💾 Capturing localStorage...')
            local_storage = self.driver.execute_script(
                'return Object.entries(window.localStorage).reduce((obj, [k, v]) => ({...obj, [k]: v}), {})'
            )
            print(f'     ✓ {len(local_storage)} items captured')

            # Create session file
            session_data = {
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'expiresAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.localtime(time.time() + 30*24*60*60)),
                'baseURL': self.base_url,
                'cookies': cookies,
                'localStorage': local_storage,
                'captureMethod': 'undetected-chromedriver'
            }

            # Create directory
            self.session_file.parent.mkdir(parents=True, exist_ok=True)

            # Save session
            with open(self.session_file, 'w') as f:
                json.dump(session_data, f, indent=2)

            print(f'  ✅ Session saved to: {self.session_file}')

            # Display summary
            print('\n📊 Session Summary:')
            print(f'  Cookies: {len(cookies)}')
            print(f'  localStorage: {len(local_storage)} items')
            
            # Show critical cookies
            critical = [c for c in cookies if c['name'] in ['cf_clearance', '__cf_bm', 'sso', 'sso-rw']]
            if critical:
                print(f'  🔑 Critical cookies: {", ".join([c["name"] for c in critical])}')

        except Exception as e:
            print(f'  ❌ Error capturing session: {str(e)}')
            raise

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Grok Session Capture with undetected-chromedriver')
    parser.add_argument('--mode', choices=['capture', 'info', 'delete'], default='capture',
                       help='Operation mode')
    
    args = parser.parse_args()

    capture = GrokSessionCaptureUndetected()

    if args.mode == 'capture':
        capture.capture_session_interactive()
    elif args.mode == 'info':
        if capture.session_file.exists():
            with open(capture.session_file) as f:
                data = json.load(f)
            print(f'\n✅ Session found:')
            print(f'  Captured: {data.get("timestamp")}')
            print(f'  Expires: {data.get("expiresAt")}')
            print(f'  Cookies: {len(data.get("cookies", []))}')
            print(f'  localStorage: {len(data.get("localStorage", {}))}')
        else:
            print('❌ No session found')
    elif args.mode == 'delete':
        if capture.session_file.exists():
            capture.session_file.unlink()
            print('✓ Session deleted')

if __name__ == '__main__':
    main()
