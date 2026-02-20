#!/usr/bin/env node

import GrokServiceV2 from './services/browser/grokServiceV2.js';
import chalk from 'chalk';

async function debugGrokInterface() {
  console.log(chalk.blue('🔍 Debugging Grok Interface'));
  console.log('='.repeat(50));
  
  const service = new GrokServiceV2({
    headless: false,
    slowMo: 100
  });

  try {
    await service.initialize();
    await service.page.waitForTimeout(5000);
    
    // Take screenshot to see current interface
    await service.screenshot({ 
      path: './temp/grok-interface-debug.png',
      fullPage: true
    });
    
    // Get all elements on page
    const elements = await service.page.evaluate(() => {
      const results = [];
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((el, index) => {
        if (index < 50) { // Limit to first 50 elements
          const tagName = el.tagName.toLowerCase();
          const className = el.className;
          const id = el.id;
          const text = el.textContent?.slice(0, 50);
          const ariaLabel = el.getAttribute('aria-label');
          const title = el.getAttribute('title');
          const type = el.type;
          const accept = el.accept;
          
          if (tagName === 'input' || tagName === 'button' || tagName === 'div') {
            results.push({
              tag: tagName,
              className: className || '',
              id: id || '',
              text: text || '',
              ariaLabel: ariaLabel || '',
              title: title || '',
              type: type || '',
              accept: accept || ''
            });
          }
        }
      });
      
      return results;
    });
    
    console.log(chalk.green('Found elements:'));
    elements.forEach((el, index) => {
      console.log(`${index + 1}. <${el.tag}> class="${el.className}" id="${el.id}" type="${el.type}" accept="${el.accept}"`);
      if (el.text) console.log(`   Text: ${el.text}`);
      if (el.ariaLabel) console.log(`   Aria-label: ${el.ariaLabel}`);
      if (el.title) console.log(`   Title: ${el.title}`);
      console.log('');
    });
    
    console.log(chalk.yellow('Browser will stay open for manual inspection...'));
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } finally {
    await service.close();
  }
}

debugGrokInterface().catch(console.error);