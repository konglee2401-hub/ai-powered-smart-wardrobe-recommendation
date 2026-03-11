#!/usr/bin/env python3
"""
Test Grok.com with Nodriver
Nodriver uses undetected Chrome - better at bypassing Cloudflare
"""

import asyncio
import sys
import os

try:
    import nodriver as nd
except ImportError:
    print("❌ nodriver not installed. Install with: pip install nodriver")
    sys.exit(1)


async def test_grok_nodriver():
    print('\n' + '═'*80)
    print('🚀 TESTING GROK.COM WITH NODRIVER')
    print('═'*80)
    print('\nℹ️  Nodriver uses undetected Chrome - better at bypassing bot detection')
    print('   Browser will open manually so you can test Cloudflare bypass\n')
    
    browser = None
    try:
        print('🎭 Launching nodriver browser...')
        browser = await nd.start(
            headless=False,  # Show browser so you can see what happens
            browser_args=[
                '--no-default-browser-check',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--lang=en-US'
            ]
        )
        
        print('✅ Browser launched\n')
        print('📍 Navigating to grok.com...')
        print('   (Browser window should open with Grok.com)\n')
        
        # Navigate to Grok
        tab = await asyncio.wait_for(
            browser.get('https://grok.com'),
            timeout=60
        )
        
        if tab is None:
            print('❌ Failed to get tab')
            return
        
        print('✅ Navigation successful\n')
        
        # Wait for page to load
        print('⏳ Waiting for page content...')
        try:
            await asyncio.wait_for(
                tab.wait_for_selector('body', timeout=30),
                timeout=35
            )
            print('✅ Page loaded\n')
        except Exception as e:
            print(f'⚠️  Page load wait timeout: {e}\n')
        
        # Wait a bit for dynamic content
        await asyncio.sleep(3)
        
        # Check page content
        page_title = await tab.evaluate('document.title')
        page_text = await tab.evaluate('document.body.innerText.substring(0, 500)')
        
        print('📊 PAGE INFORMATION:')
        print(f'  Title: {page_title}')
        print(f'  Content preview: {page_text[:200]}...\n')
        
        # Check for Cloudflare challenge
        has_cf_challenge = await tab.evaluate(
            '''document.body.innerText.includes("Just a moment") || 
               document.body.innerText.includes("Checking your browser") ||
               document.body.innerText.includes("Verify you are human")'''
        )
        
        if has_cf_challenge:
            print('⚠️  CLOUDFLARE CHALLENGE DETECTED')
            print('   Nodriver cannot bypass this automatically')
            print('   You need to manually solve it in the browser window\n')
            
            print('🔍 MANUAL TEST:')
            print('   1. Look at the browser window that opened')
            print('   2. You should see Cloudflare challenge')
            print('   3. Click "Verify you are human"')
            print('   4. Complete the challenge')
            print('   5. Try to login to Grok')
            print('   6. If successful, we can use cookies method\n')
            
            print('⏳ Waiting for you to complete manual bypass... (60 seconds)')
            await asyncio.sleep(60)
            
            # Check if login successful
            page_text_after = await tab.evaluate('document.body.innerText.substring(0, 500)')
            if 'Sign out' in page_text_after or 'user' in page_text_after.lower():
                print('\n✅ LOGIN DETECTED!')
                print('   You successfully logged in')
                print('   Now you can export cookies and use them!\n')
            else:
                print('\n⏳ Still waiting or challenge not completed\n')
        else:
            print('✅ NO CLOUDFLARE CHALLENGE!')
            print('   Nodriver successfully bypassed Cloudflare!\n')
            
            # Check if already logged in
            has_login = await tab.evaluate(
                '''document.body.innerText.includes("Sign out") || 
                   !!document.querySelector('[aria-label*="user"], [aria-label*="profile"]')'''
            )
            
            if has_login:
                print('✅ YOU ARE LOGGED IN!')
            else:
                print('ℹ️  You are on Grok.com but not logged in')
                print('   You can manually login now in the browser window\n')
        
        # Keep browser open for user to interact
        print('🎭 BROWSER STILL OPEN')
        print('   - You can interact with the website')
        print('   - Press Ctrl+C when done testing')
        print('   - Or wait 5 minutes for auto-close\n')
        
        # Wait for user or timeout
        try:
            await asyncio.sleep(300)  # 5 minutes
        except KeyboardInterrupt:
            print('\n\nClosing browser...')
    
    except asyncio.TimeoutError:
        print('❌ Navigation timeout - browser may be slow')
    
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        if browser:
            print('🛑 Closing browser...')
            try:
                await browser.stop()
                print('✅ Browser closed')
            except:
                pass


if __name__ == '__main__':
    try:
        asyncio.run(test_grok_nodriver())
    except KeyboardInterrupt:
        print('\n\n👋 Test stopped by user')
    except Exception as e:
        print(f'\n❌ Unexpected error: {e}')
        import traceback
        traceback.print_exc()
