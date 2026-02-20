â#!/usr/bin/env node

import GrokServiceV2 from './services/browser/grokServiceV2.js';
import chalk from 'chalk';

async function simpleGrokTest() {
  console.log(chalk.blue('🧪 Simple Grok Test'));
  console.log('='.repeat(50));
  
  const service = new GrokServiceV2({
    headless: false,
    slowMo: 100
  });

  try {
    await service.initialize();
    await service.page.waitForTimeout(3000);
    
    // Check if we're on the main page
    const pageTitle = await service.page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Check if we can see the chat interface
    const canSeeChat = await service.page.evaluate(() => {
      return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
             document.body.innerText.includes('Ask anything') ||
             document.body.innerText.includes('What\'s on your mind') ||
             document.querySelector('textarea') !== null ||
             document.querySelector('[contenteditable="true"]') !== null;
    });
    
    console.log(`Can see chat interface: ${canSeeChat}`);
    
    if (!canSeeChat) {
      console.log(chalk.yellow('⚠️  Not on main chat page. Taking screenshot...'));
      await service.screenshot({ 
        path: './temp/grok-login-page.png',
        fullPage: true
      });
      
      console.log(chalk.yellow('Browser will stay open for manual login...'));
      await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
    } else {
      console.log(chalk.green('✅ On main chat page'));
      
      // Try to find upload button
      const uploadButton = await service.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const button of buttons) {
          const text = button.textContent || '';
          const ariaLabel = button.getAttribute('aria-label') || '';
          const title = button.getAttribute('title') || '';
          
          if (text.toLowerCase().includes('upload') || 
              text.toLowerCase().includes('attach') || 
              text.toLowerCase().includes('image') ||
              ariaLabel.toLowerCase().includes('upload') ||
              ariaLabel.toLowerCase().includes('attach') ||
              ariaLabel.toLowerCase().includes('image')) {
            return {
              text: text,
              ariaLabel: ariaLabel,
              title: title,
              className: button.className
            };
          }
        }
        return null;
      });
      
      if (uploadButton) {
        console.log(chalk.green('✅ Found upload button:'));
        console.log(`   Text: ${uploadButton.text}`);
        console.log(`   Aria-label: ${uploadButton.ariaLabel}`);
        console.log(`   Title: ${uploadButton.title}`);
        console.log(`   Class: ${uploadButton.className}`);
      } else {
        console.log(chalk.red('❌ No upload button found'));
      }
    }
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } finally {
    await service.close();
  }
}

simpleGrokTest().catch(console.error);