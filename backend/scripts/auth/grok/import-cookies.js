/**
 * Cookie Import Helper
 * 
 * Helps user import cookies exported from Chrome DevTools
 * Solution for Cloudflare bypass
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cookiesFile = path.join(__dirname, '../../../.sessions/grok-cookies.json');

async function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🍪 GROK COOKIES IMPORT HELPER');
  console.log('═'.repeat(80));

  console.log(`
📝 HOW TO GET COOKIES FROM CHROME:

  1. Open Chrome and go to https://grok.com
  2. Pass Cloudflare challenge manually
  3. Login with your account
  4. Press F12 (DevTools)
  5. Go to "Application" tab
  6. Left sidebar: Storage → Cookies → https://grok.com
  7. Select all cookies (Ctrl+A) and copy (Ctrl+C)
  8. Paste the result below

═════════════════════════════════════════════════════════════════════════════════
`);

  const choice = await askUser('Do you want to:\n  1) Paste cookies as JSON\n  2) Paste cURL command\n  3) Paste Chrome table format (copied from DevTools)\n  4) View saved cookies\n  5) Delete saved cookies\n\nEnter (1-5): ');

  switch (choice) {
    case '1':
      await importJSON();
      break;
    case '2':
      await importCurl();
      break;
    case '3':
      await importTableFormat();
      break;
    case '4':
      viewCookies();
      break;
    case '5':
      deleteCookies();
      break;
    default:
      console.log('Invalid choice');
  }
}

async function importJSON() {
  console.log('\n📋 Paste your cookies JSON (format: [{name: "...", value: "..."}])');
  console.log('   Then press ENTER twice when done:\n');

  let input = '';
  const lines = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', line => {
    lines.push(line);
  });

  rl.on('close', () => {
    input = lines.join('\n');

    try {
      // Try to parse as JSON
      let cookies = JSON.parse(input);
      
      // If it's an object with a cookies property, extract it
      if (cookies.cookies && Array.isArray(cookies.cookies)) {
        cookies = cookies.cookies;
      }

      if (!Array.isArray(cookies)) {
        throw new Error('Not an array');
      }

      // Validate structure
      cookies.forEach(c => {
        if (!c.name || !c.value) {
          throw new Error('Each cookie must have "name" and "value"');
        }
      });

      // Save cookies
      fs.mkdirSync(path.dirname(cookiesFile), { recursive: true });
      fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));

      console.log(`\n✅ Saved ${cookies.length} cookies to: ${cookiesFile}`);
      console.log('\n🎉 Next time you run "Capture Session", script will use these cookies!');

    } catch (e) {
      console.error(`\n❌ Error parsing JSON: ${e.message}`);
      console.log('\n💡 Make sure your input is valid JSON array');
    }

    rl.close();
  });
}

async function importCurl() {
  console.log('\n📋 Paste your cURL command header (--header "cookie: ...")');
  console.log('   Then press ENTER twice when done:\n');

  let input = '';
  const lines = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', line => {
    lines.push(line);
  });

  rl.on('close', () => {
    input = lines.join('\n');

    try {
      // Extract cookie header
      const cookieMatch = input.match(/cookie:\s*([^"'\n]+)/i);
      if (!cookieMatch) {
        throw new Error('Could not find cookie header in cURL command');
      }

      const cookieString = cookieMatch[1];
      const cookies = [];

      // Parse cookie string
      cookieString.split(';').forEach(pair => {
        const [name, value] = pair.split('=').map(s => s.trim());
        if (name && value) {
          cookies.push({
            name,
            value,
            domain: 'grok.com',
            path: '/'
          });
        }
      });

      if (cookies.length === 0) {
        throw new Error('No cookies found in cURL command');
      }

      // Save cookies
      fs.mkdirSync(path.dirname(cookiesFile), { recursive: true });
      fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));

      console.log(`\n✅ Saved ${cookies.length} cookies to: ${cookiesFile}`);
      console.log('\nCookies extracted:');
      cookies.forEach(c => console.log(`  - ${c.name}`));
      console.log('\n🎉 Next time you run "Capture Session", script will use these cookies!');

    } catch (e) {
      console.error(`\n❌ Error parsing cURL: ${e.message}`);
    }

    rl.close();
  });
}

async function importTableFormat() {
  console.log('\n📋 Paste your Chrome DevTools cookie table data');
  console.log('   (Copy from: Application → Cookies → Select all and Ctrl+C)');
  console.log('   Then press ENTER twice when done:\n');

  let input = '';
  const lines = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', line => {
    lines.push(line);
  });

  rl.on('close', () => {
    input = lines.join('\n');

    try {
      const cookies = [];
      
      // Parse tab-separated values (Chrome DevTools format)
      input.split('\n').forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Split by tabs
        const parts = line.split('\t');
        if (parts.length < 2) return;
        
        const name = parts[0];
        const value = parts[1];
        const domain = parts[2] || 'grok.com';
        const path = parts[3] || '/';
        
        // Skip header rows and empty lines
        if (!name || name === 'Name' || !value) return;
        
        cookies.push({
          name,
          value,
          domain,
          path,
          httpOnly: parts[6] === '✓',
          secure: parts[7] === '✓',
          sameSite: parts[8] === 'None' ? 'None' : (parts[8] || 'Lax')
        });
      });

      if (cookies.length === 0) {
        throw new Error('No valid cookies found in table data');
      }

      // Filter for grok.com domain cookies only
      const grokCookies = cookies.filter(c => 
        c.domain.includes('grok.com') || c.domain.includes('grok.com')
      );

      const cookiesToSave = grokCookies.length > 0 ? grokCookies : cookies;

      // Save cookies
      fs.mkdirSync(path.dirname(cookiesFile), { recursive: true });
      fs.writeFileSync(cookiesFile, JSON.stringify(cookiesToSave, null, 2));

      console.log(`\n✅ Saved ${cookiesToSave.length} cookies to: ${cookiesFile}`);
      console.log('\nCookies parsed:');
      cookiesToSave.forEach(c => console.log(`  - ${c.name} (${c.domain})`));
      
      // Check for critical cookies
      const hasCfClearance = cookiesToSave.some(c => c.name === 'cf_clearance' || c.name === '__Host-cf_clearance');
      if (hasCfClearance) {
        console.log('\n✅ CRITICAL: Cloudflare clearance token found!');
      } else {
        console.log('\n⚠️  WARNING: No Cloudflare clearance token found');
        console.log('   This may cause issues bypassing Cloudflare');
      }

      console.log('\n🎉 Next time you run "Capture Session", script will use these cookies!');

    } catch (e) {
      console.error(`\n❌ Error parsing table format: ${e.message}`);
    }

    rl.close();
  });
}

function viewCookies() {
  if (!fs.existsSync(cookiesFile)) {
    console.log('\n❌ No saved cookies found');
    console.log(`   Location: ${cookiesFile}`);
    return;
  }

  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
    console.log(`\n✅ Found ${cookies.length} saved cookies:\n`);

    cookies.forEach(c => {
      console.log(`  ${c.name}`);
      if (c.domain) console.log(`    Domain: ${c.domain}`);
      if (c.expires) console.log(`    Expires: ${new Date(c.expires * 1000).toLocaleString()}`);
    });

  } catch (e) {
    console.error(`\n❌ Error reading cookies: ${e.message}`);
  }
}

function deleteCookies() {
  if (!fs.existsSync(cookiesFile)) {
    console.log('\n❌ No saved cookies to delete');
    return;
  }

  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
    fs.unlinkSync(cookiesFile);
    console.log(`\n✅ Deleted ${cookies.length} saved cookies`);
  } catch (e) {
    console.error(`\n❌ Error deleting cookies: ${e.message}`);
  }
}

main().catch(console.error);
