/**
 * ⚠️  DEPRECATED: This file has been replaced by GrokServiceV2.js
 * 
 * This is a compatibility shim that re-exports GrokServiceV2.
 * Please update your imports to use GrokServiceV2 instead.
 * 
 * OLD: import GrokService from './services/browser/grokService.js';
 * NEW: import GrokServiceV2 from './services/browser/grokServiceV2.js';
 */

import GrokServiceV2 from './grokServiceV2.js';

// Export GrokServiceV2 as GrokService for backward compatibility
export default GrokServiceV2;

    
    // Wait for page to load
    console.log('⏳ Waiting for Grok to load...');

    const isLoginPage = await this.page.evaluate(() => {
      return document.body.innerText.includes('Sign in') || 
             document.body.innerText.includes('Log in') ||
             document.body.innerText.includes('Continue with') ||
             document.body.innerText.includes('Sign up');
    });
    
    if (isLoginPage) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║         🔐 GROK AUTHENTICATION REQUIRED                  ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log('⚠️  Login required. Please complete X/Twitter login in the browser window.\n');
      console.log('📝 Steps:');
      console.log('  1. Sign in with your X/Twitter account');
      console.log('  2. Complete any 2FA verification (if enabled)');
      console.log('  3. Wait for Grok dashboard to load\n');
      
      // Wait for manual login (if not headless)
      if (!this.options.headless) {
        console.log('⏳ Waiting 120 seconds for manual login (browser window should be visible)...\n');
        
        // Poll for successful login
        let loggedIn = false;
        let waitTime = 0;
        const maxWait = 120000; // 120 seconds
        const pollInterval = 3000; // Check every 3 seconds
        
        while (!loggedIn && waitTime < maxWait) {
          await this.page.waitForTimeout(pollInterval);
          waitTime += pollInterval;
          
          const stillOnLogin = await this.page.evaluate(() => {
            return document.body.innerText.includes('Sign in') || 
                   document.body.innerText.includes('Log in') ||
                   document.body.innerText.includes('Continue with') ||
                   document.body.innerText.includes('Sign up');
          });
          
          if (!stillOnLogin) {
            loggedIn = true;
            console.log('✅ Login successful! Session will be saved.\n');
          } else {
            const secondsLeft = Math.round((maxWait - waitTime) / 1000);
            process.stdout.write(`\r⏳ Waiting for login... (${secondsLeft}s remaining)`);
          }
        }
        
        if (!loggedIn) {
          throw new Error('Login timeout. Please try again.');
        }
        
        // Save session after successful login
        await this.page.waitForTimeout(2000); // Wait for page to fully load
        const saved = await this.saveSession();
        if (saved) {
          console.log('💾 Session saved - you won\'t need to login again!');
        }
      } else {
        throw new Error('Grok requires authentication. Please run in non-headless mode for manual login.');
      }
    } else {
      console.log('✅ Already logged in (using saved session)');
      
      // Also save current cookies (session refresh)
      try {
        await this.saveSession();
      } catch (error) {
        // Silent fail - session update not critical
      }
    }
    
    console.log('✅ Grok initialized');
  }

  /**
   * Wait for Cloudflare challenge to be resolved (if any)
   */
  async waitForCloudflareResolved() {
    const maxWait = 120000; // 120 seconds
    const startTime = Date.now();
    let checkCount = 0;
    
    while (Date.now() - startTime < maxWait) {
      checkCount++;
      
      try {
        // Check if Cloudflare challenge page is visible
        const challengeStatus = await this.page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          const html = document.documentElement.outerHTML.toLowerCase();
          
          const hasCloudflareText = text.includes('cloudflare') || 
                                  text.includes('verify you are human') ||
                                  text.includes('challenge') ||
                                  text.includes('just a moment');
          
          const hasCloudflareElements = 
            document.querySelector('iframe[src*="challenges.cloudflare.com"]') !== null ||
            document.querySelector('iframe[src*="cdn-cgi"]') !== null ||
            document.querySelector('[data-testid="challenge-guard"]') !== null ||
            html.includes('cf_clearance') ||
            html.includes('challenge');
          
          return {
            detected: hasCloudflareText || hasCloudflareElements,
            textDetected: hasCloudflareText,
            elementDetected: hasCloudflareElements
          };
        });

        if (checkCount === 1 || checkCount % 10 === 0) {
          process.stdout.write(`\r⏳ Cloudflare check [${checkCount}]... (${Math.round((maxWait - (Date.now() - startTime)) / 1000)}s left)`);
        }

        if (challengeStatus.detected) {
          process.stdout.write(`\r🛡️  Cloudflare challenge detected - Please verify in browser...            \n`);
          // Keep checking until it's gone
          let challengePassed = false;
          let passCheckCount = 0;
          
          while (!challengePassed && (Date.now() - startTime) < maxWait) {
            await this.page.waitForTimeout(3000);
            passCheckCount++;
            
            const stillDetected = await this.page.evaluate(() => {
              const text = document.body.innerText.toLowerCase();
              return text.includes('cloudflare') || 
                    text.includes('verify you are human') ||
                    text.includes('challenge') ||
                    text.includes('just a moment');
            });

            if (!stillDetected) {
              challengePassed = true;
              process.stdout.write(`\r✅ Cloudflare challenge resolved!                               \n`);
            } else {
              const remaining = Math.round((maxWait - (Date.now() - startTime)) / 1000);
              process.stdout.write(`\r⏳ Waiting for Cloudflare verification... (${remaining}s) [attempt ${passCheckCount}]`);
            }
          }

          if (!challengePassed) {
            throw new Error('Cloudflare challenge timeout');
          }
          
          return;
        }

        // Check if page loaded properly (has significant content)
        const pageContent = await this.page.evaluate(() => {
          return {
            bodyLength: document.body.innerText.length,
            hasContent: document.body.innerText.length > 500
          };
        });

        if (pageContent.hasContent) {
          console.log('');
          return;  // Page loaded successfully, no Cloudflare
        }

      } catch (error) {
        console.log(`\n⚠️  Cloudflare check error: ${error.message}`);
      }

      await this.page.waitForTimeout(1000);
    }

    console.log('\n✅ Cloudflare check timeout - continuing (no active challenge)');
  }

  /**
   * Upload image and get analysis with retry logic
   */
  async analyzeImageWithRetry(imagePath, prompt, maxRetries = 3, retryDelay = 3000) {
    console.log('\n📊 GROK BROWSER ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    const structuredPrompt = `
      Please analyze the uploaded image of clothing and provide a detailed, structured response based on the following categories. Ensure each section is clearly labeled and follows the specified format.

      **CHARACTER PROFILE**:
      - Briefly describe the person wearing the clothing, including observable traits like gender, approximate age, and overall style.

      **PRODUCT DETAILS**:
      - Identify the main clothing item(s) in the image (e.g., "blue denim jacket", "white t-shirt", "black ripped jeans").
      - Describe key features of each item (e.g., "oversized fit", "v-neck", "distressed").
      - Suggest a potential brand or style inspiration if applicable.

      **CATEGORY ANALYSIS**:
      - Categorize the overall outfit (e.g., "casual street style", "formal business attire", "bohemian chic").
      - Provide a brief justification for the category.

      **RECOMMENDATIONS**:
      - Suggest specific clothing items or accessories that would complement the existing outfit.
      - Recommend occasions or environments where this outfit would be suitable.
      - Offer styling tips for different variations of the outfit.

      **NEW OPTIONS (grouped)**:
      - List 3-5 distinct, innovative ideas for new clothing items or accessories inspired by the current outfit. Group similar ideas (e.g., "Dresses: [idea1], [idea2]"). These should be actionable suggestions for creating new fashion items.

      Your response should be concise, clear, and directly address each of these sections. Do not include any introductory or concluding remarks outside of these sections.

      Original Request: ${prompt}
    `;

    console.log(`Prompt: ${structuredPrompt}`);

    console.log('');

    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}`);
        
        // Wait for Cloudflare challenge to be resolved (if any)
        console.log('⏳ Checking for Cloudflare challenge...');
        try {
          await this.waitForCloudflareResolved();
          console.log('✅ Cloudflare check passed');
        } catch (error) {
          console.log(`⚠️  Cloudflare check error: ${error.message}`);
        }

        // Look for new chat or input area
        console.log('🔍 Looking for chat interface...');
        
        // Wait for chat interface to load with retry
        await this.waitForChatInterface(attempt * 2000);

        // Look for file upload button/input
        console.log('🔍 Looking for upload button...');
        console.log('   Checking input[type="file"]...');
        
        let uploadInput = await this.page.$('input[type="file"]');
        if (uploadInput) {
          console.log(`✅ Found upload input directly: input[type="file"]`);
        } else {
          console.log('❌ Not found, trying other selectors...');
          
          const uploadSelectors = [
            'input[accept*="image"]',
            '[data-testid="file-upload"]',
            '[aria-label*="upload"]',
            '[aria-label*="attach"]',
            'button[aria-label*="image"]'
          ];

          for (const selector of uploadSelectors) {
            uploadInput = await this.page.$(selector);
            if (uploadInput) {
              console.log(`✅ Found upload input: ${selector}`);
              break;
            }
          }
        }

        // If no direct input, try to click attach button
        if (!uploadInput) {
          console.log('🔍 Searching for attach button...');
          const attachButtons = await this.page.$$('button');
          for (const button of attachButtons) {
            const ariaLabel = await button.getAttribute('aria-label');
            const title = await button.getAttribute('title');
            
            if (
              (ariaLabel && (ariaLabel.includes('attach') || ariaLabel.includes('image') || ariaLabel.includes('upload'))) ||
              (title && (title.includes('attach') || title.includes('image') || title.includes('upload')))
            ) {
              await button.click();
              await this.page.waitForTimeout(1000);
              uploadInput = await this.page.$('input[type="file"]');
              if (uploadInput) {
                console.log('✅ Found upload input after clicking attach button');
                break;
              }
            }
          }
        }

        if (!uploadInput) {
          // Take screenshot for debugging
          await this.screenshot(`temp/grok-upload-debug-${Date.now()}.png`);
          throw new Error('Could not find file upload input. Grok interface may have changed.');
        }

        // Upload image
        await this.uploadFile('input[type="file"]', imagePath);
        console.log('⏳ Waiting for image to upload...');
        await this.page.waitForTimeout(3000);

        // Look for text input
        console.log('🔍 Looking for text input...');
        
        const textInputSelectors = [
          'textarea[placeholder="Ask Grok anything"]',  // Exact Grok textarea
          'textarea[aria-label="Ask Grok anything"]',   // By aria-label
          'textarea[placeholder*="Ask"]',
          'textarea[placeholder*="Message"]',
          'textarea',
          '[contenteditable="true"]',
          'input[type="text"]'
        ];

        let textInput = null;
        let usedTextSelector = null;
        
        // Try to find textarea
        for (const selector of textInputSelectors) {
          try {
            textInput = await this.page.$(selector);
            if (textInput) {
              usedTextSelector = selector;
              console.log(`✅ Found text input: ${selector}`);
              break;
            }
          } catch (e) {
            // Selector might fail, continue to next
          }
        }

        if (!textInput) {
          throw new Error('Could not find text input');
        }

        // Type prompt - with error handling for waitForSelector timeout
        console.log('📝 Typing prompt...');
        try {
          await this.typeText(usedTextSelector, structuredPrompt);
        this.lastPrompt = structuredPrompt;
        } catch (error) {
          if (error.message.includes('Waiting for selector') || error.message.includes('exceeded')) {
            console.log('⚠️  typeText timeout, trying direct click and type...');
            // Fallback: click directly and type
            await this.page.click(usedTextSelector);
            await this.page.waitForTimeout(500);
            await this.page.keyboard.type(prompt, { delay: 50 });
          } else {
            throw error;
          }
        }
        await this.page.waitForTimeout(1000);

        // Find and click send button
        console.log('🔍 Looking for send button...');
        
        const sendSelectors = [
          'button[type="submit"]',
          'button[aria-label*="send"]',
          'button[aria-label*="Submit"]',
          'button:has-text("Send")'
        ];

        let sendButton = null;
        for (const selector of sendSelectors) {
          sendButton = await this.page.$(selector);
          if (sendButton) {
            console.log(`✅ Found send button: ${selector}`);
            break;
          }
        }

        if (!sendButton) {
          // Try pressing Enter
          console.log('📝 Pressing Enter to send...');
          await this.page.keyboard.press('Enter');
        } else {
          await sendButton.click();
        }

        console.log('✅ Message sent');
        console.log('⏳ Waiting for Grok to respond...');

        // Wait for response with improved detection
        const response = await this.waitForGrokResponse(300000);
        
        console.log('='.repeat(80));
        console.log('✅ ANALYSIS COMPLETE');
        console.log(`Response length: ${response.length} characters`);
        console.log('Response preview:', response.substring(0, 200) + '...');
        console.log('='.repeat(80) + '\n');

        return response;

      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          console.log(`📅 Retrying in ${retryDelay}ms...`);
          await this.page.waitForTimeout(retryDelay);
        }
      }
    }
    
    throw new Error(`Grok analysis failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Wait for chat interface to load
   */
  async waitForChatInterface(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check for chat interface elements
        const chatElements = await this.page.$$('[data-testid*="message"], textarea, button[type="submit"]');
        if (chatElements.length > 0) {
          return;
        }
      } catch (error) {
        // Ignore errors, keep waiting
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    throw new Error('Chat interface did not load within timeout');
  }

  /**
   * Wait for Grok to complete response
   */
  async waitForGrokResponse(maxWait = 300000) {
    const startTime = Date.now();
    let lastLength = 0;
    let stableCount = 0;
    let lastLogTime = 0;
    let hasCompleteResponse = false;

    console.log('⏳ Starting response wait (max 5 minutes)...');
    
    while (Date.now() - startTime < maxWait) {
      const { currentText, pageState } = await this.page.evaluate(() => {
        const text = document.body.innerText;
        const textLower = text.toLowerCase();
        
        return {
          currentText: text,
          pageState: {
            isThinking: textLower.includes('thinking') || textLower.includes('generating'),
            isTyping: textLower.includes('typing'),
            hasRecommendationsEnd: textLower.includes('*** recommendations end ***'),
            hasNewOptionsEnd: textLower.includes('*** new options end ***'),
            hasAnalysisEnd: textLower.includes('*** analysis end ***'),
            bodyLength: text.length
          }
        };
      });

      const currentLength = pageState.bodyLength;
      const isThinking = pageState.isThinking || pageState.isTyping;
      const hasCompleteMarkers = pageState.hasRecommendationsEnd || pageState.hasNewOptionsEnd || pageState.hasAnalysisEnd;

      // Log progress every 10 seconds
      if (Date.now() - lastLogTime > 10000) {
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ Waiting... (${elapsedSeconds}s, length: ${currentLength}, thinking: ${isThinking}, complete: ${hasCompleteMarkers})`);
        lastLogTime = Date.now();
      }

      // If still generating/thinking, reset stability count
      if (isThinking) {
        stableCount = 0;
        hasCompleteResponse = false;
      } else if (hasCompleteMarkers) {
        // Response has complete markers - very likely done
        stableCount++;
        hasCompleteResponse = true;
        if (stableCount >= 5) { // 5 checks = 5 seconds after seeing markers
          console.log(`✅ Response completion markers detected`);
          break;
        }
      } else if (currentLength === lastLength) {
        // Content stable but no markers
        stableCount++;
        if (stableCount >= 30) { // 30 seconds of stability = 30 checks
          console.log(`✅ Response stabilized (no new content for 30s)`);
          break;
        }
      } else {
        // Content still growing
        stableCount = 0;
      }

      lastLength = currentLength;
      await this.page.waitForTimeout(1000);
    }

    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Waiting complete after ${totalSeconds} seconds`);

    // Extract response - now we need to separate prompt from response
    console.log('📝 Extracting response...');
    
    let rawResponse = null;
    try {
      rawResponse = await this.page.evaluate(() => {
        // Get all text
        let fullText = document.body.innerText;
        
        // Find where the response actually starts (after the prompt)
        // The prompt ends with "CRITICAL: Use exact format..." 
        // The response should start with "*** CHARACTER PROFILE START ***" or similar
        const criticalMarker = 'CRITICAL: Use exact format markers';
        const criticalIndex = fullText.toLowerCase().indexOf(criticalMarker.toLowerCase());
        
        if (criticalIndex !== -1) {
          // Find the next "***" after the critical marker
          const afterCritical = fullText.substring(criticalIndex);
          const firstMarkerInResponse = afterCritical.indexOf('***');
          
          if (firstMarkerInResponse !== -1) {
            // Skip "Analyzing images" and other UI text that might come before
            const responseStart = criticalIndex + firstMarkerInResponse;
            fullText = fullText.substring(responseStart);
          }
        }
        
        return fullText.trim();
      });
    } catch (error) {
      console.error('Error extracting raw response:', error);
      rawResponse = await this.page.evaluate(() => document.body.innerText);
    }

    if (!rawResponse || rawResponse.length < 100) {
      throw new Error(`Could not extract complete response from Grok (length: ${rawResponse ? rawResponse.length : 0})`);
    }

    console.log(`📊 Extracted response length: ${rawResponse.length} characters`);
    console.log(`📌 Response starts with: ${rawResponse.substring(0, 100)}...`);

    // Now parse the structured response
    return this.parseGrokResponse(rawResponse);
  }

  /**
   * Parses the structured response from Grok.
   */
  parseGrokResponse(rawResponse) {
    const sections = {
      characterProfile: '',
      productDetails: '',
      categoryAnalysis: '',
      recommendations: '',
      newOptions: []
    };

    const lines = rawResponse.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    let currentSection = null;

    for (const line of lines) {
      if (line.startsWith('**CHARACTER PROFILE**')) {
        currentSection = 'characterProfile';
        sections.characterProfile = ''; // Reset for new section
        continue;
      }
      if (line.startsWith('**PRODUCT DETAILS**')) {
        currentSection = 'productDetails';
        sections.productDetails = ''; // Reset for new section
        continue;
      }
      if (line.startsWith('**CATEGORY ANALYSIS**')) {
        currentSection = 'categoryAnalysis';
        sections.categoryAnalysis = ''; // Reset for new section
        continue;
      }
      if (line.startsWith('**RECOMMENDATIONS**')) {
        currentSection = 'recommendations';
        sections.recommendations = ''; // Reset for new section
        continue;
      }
      if (line.startsWith('**NEW OPTIONS (grouped)**')) {
        currentSection = 'newOptions';
        sections.newOptions = []; // Reset for new section
        continue;
      }

      if (currentSection) {
        if (currentSection === 'newOptions') {
          // Handle grouped options, splitting by common delimiters
          const cleanedLine = line.replace(/^[\*-]\s*/, '').trim(); // Remove leading bullets/hyphens
          if (cleanedLine) {
            // Split by comma or semicolon, but be careful not to split within a group description
            const items = cleanedLine.split(/;\s*|\s*\([A-Za-z0-9_\s-]*\),\s*|\s*,\s*(?=[A-Z][a-z])|(?:\s*\w+:\s*)/).map(s => s.trim()).filter(s => s.length > 0);
            sections.newOptions.push(...items);
          }
        } else {
          sections[currentSection] += (sections[currentSection] ? '\n' : '') + line;
        }
      }
    }
    
    // Further clean up newOptions to remove any lingering section headers or empty strings
    sections.newOptions = sections.newOptions.filter(item => 
      item.length > 3 && 
      !item.toLowerCase().includes('new options') &&
      !item.toLowerCase().includes('grouped')
    );

    return sections;
  }
}

export default GrokService;
