#!/usr/bin/env python3
"""
Test Grok.com with Nodriver - Simple Version
Just open browser window - no complex navigation testing
"""

import asyncio
import sys

try:
    import nodriver as nd
except ImportError:
    print("❌ nodriver not installed")
    sys.exit(1)


async def main():
    print('\n' + '═'*80)
    print('🚀 OPENING GROK.COM WITH NODRIVER')
    print('═'*80)
    print('\nℹ️  This opens grok.com in an undetected Chrome browser')
    print('   Nodriver is better at bypassing bot detection\n')
    
    browser = None
    try:
        print('🎭 Launching undetected Chrome with nodriver...')
        browser = await nd.start(
            headless=False,
            browser_args=[
                '--no-default-browser-check',
                '--disable-blink-features=AutomationControlled',
            ]
        )
        
        print('✅ Browser launched - window should appear\n')
        print('📍 Opening grok.com...')
        
        # Use the browser directly to open a tab
        tab = await browser.get('https://grok.com')
        
        if tab is None:
            print('⚠️  Browser opened but page didnt load - trying again')
            # Just wait
            await asyncio.sleep(3)
        
        print('✅ Grok.com should now be visible in browser\n')
        
        print('═'*80)
        print('🔍 MANUAL TEST INSTRUCTIONS')
        print('═'*80)
        
        print('''
You should see the browser window with grok.com.

TEST SCENARIOS:

1️⃣  IF YOU SEE CLOUDFLARE CHALLENGE ("Just a moment"):
   - This means nodriver was also detected by Cloudflare
   - Try to manually solve it:
     a) Click "Verify you are human"
     b) Complete the challenge
     c) Try to login
   - If you can login, we can use the cookie method
   
2️⃣  IF YOU SEE GROK.COM DIRECTLY:
   - EXCELLENT! Nodriver bypassed Cloudflare!
   - Try to login manually
   - If you get logged in, we can use this method

3️⃣  IF YOU SEE SOMETHING ELSE:
   - Inspect what's on the page
   - Try interacting with it

⏳ WAITING FOR YOUR INPUT (5 MINUTES)...
   When done testing, just close the browser or let auto-close happen
''')
        
        # Keep browser open for 5 minutes
        await asyncio.sleep(300)
        
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    
    finally:
        if browser:
            print('\n\n🛑 Closing browser...')
            try:
                await browser.stop()
                print('✅ Browser closed')
            except:
                pass


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\n👋 Stopped')
    except Exception as e:
        print(f'❌ Error: {e}')
