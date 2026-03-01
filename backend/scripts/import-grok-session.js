/**
 * Import Grok Session from Browser Export
 * 
 * This utility helps convert session data from browser Dev Tools export format
 * to the grok-session-complete.json format used by the auto-login system.
 * 
 * Usage:
 *   node scripts/import-grok-session.js --from clipboard
 *   node scripts/import-grok-session.js --from file --path cookies.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');
const BACKUP_FILE = path.join(__dirname, '../.sessions/grok-session-backup.json');

/**
 * Parse tab-separated cookie format from browser export
 * Format: Name | Value | Domain | Path | Expiry | Size | HttpOnly | Secure | SameSite | ...
 */
function parseCookieData(cookieText) {
  const lines = cookieText.trim().split('\n');
  const cookies = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith('Name')) continue; // Skip header

    const parts = line.split('\t').map(p => p.trim());
    if (parts.length < 4) continue;

    const cookie = {
      name: parts[0],
      value: parts[1],
      domain: parts[2],
      path: parts[3],
      httpOnly: parts[6] === '✓' || parts[6] === 'true',
      secure: parts[7] === '✓' || parts[7] === 'true',
      sameSite: parts[8] && parts[8] !== '✗' ? parts[8] : undefined
    };

    // Parse expiry date if present
    if (parts[5]) {
      try {
        const expiryDate = new Date(parts[5]);
        if (!isNaN(expiryDate.getTime())) {
          cookie.expires = Math.floor(expiryDate.getTime() / 1000);
        }
      } catch (e) {
        // Ignore invalid dates
      }
    }

    cookies.push(cookie);
  }

  return cookies;
}

/**
 * Parse localStorage data
 * Format: Key | Value
 */
function parseLocalStorageData(storageText) {
  const lines = storageText.trim().split('\n');
  const storage = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    const [key, ...valueParts] = line.split('\t');
    if (!key) continue;

    const value = valueParts.join('\t').trim();
    storage[key] = value;
  }

  return storage;
}

/**
 * Parse sessionStorage data
 * Format: Key | Value
 */
function parseSessionStorageData(storageText) {
  return parseLocalStorageData(storageText);
}

/**
 * Interactive import from stdin
 */
async function interactiveImport() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '═'.repeat(80));
  console.log('🔐 GROK SESSION IMPORT - INTERACTIVE MODE');
  console.log('═'.repeat(80));
  console.log('\n📋 Steps:');
  console.log('  1. Open Chrome/Edge → grok.com');
  console.log('  2. Press F12 → Application tab');
  console.log('  3. Copy sections one by one:');
  console.log('     - Cookies (Right-click → Copy all as HAR)');
  console.log('     - Storage (Copy as text)');
  console.log('  4. Paste into terminal\n');

  return new Promise((resolve) => {
    let cookies = '';
    let localStorage = '';
    let sessionStorage = '';
    let stage = 'cookies';

    const promptNext = () => {
      if (stage === 'cookies') {
        rl.question(
          'Paste cookies export (or type "skip" to use generated format):\n> ',
          (input) => {
            if (input !== 'skip') cookies = input;
            stage = 'localStorage';
            promptNext();
          }
        );
      } else if (stage === 'localStorage') {
        rl.question(
          'Paste localStorage export:\n> ',
          (input) => {
            localStorage = input;
            stage = 'sessionStorage';
            promptNext();
          }
        );
      } else if (stage === 'sessionStorage') {
        rl.question(
          'Paste sessionStorage export:\n> ',
          (input) => {
            sessionStorage = input;
            rl.close();
            resolve({ cookies, localStorage, sessionStorage });
          }
        );
      }
    };

    promptNext();
  });
}

/**
 * Create session file from data
 */
function createSessionFile(cookieData, localStorageData, sessionStorageData) {
  const sessionData = {
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    baseUrl: 'https://grok.com',
    cookies: cookieData,
    localStorage: localStorageData,
    sessionStorage: sessionStorageData,
    authTokens: {},
    metadata: {
      captureMethod: 'manual-import-from-browser',
      importDateTime: new Date().toLocaleString(),
      domain: 'grok.com'
    }
  };

  // Create backup if file exists
  if (fs.existsSync(SESSION_FILE)) {
    fs.copyFileSync(SESSION_FILE, BACKUP_FILE);
    console.log(`\n📦 Backup created: ${path.basename(BACKUP_FILE)}`);
  }

  // Create session directory if needed
  const sessionDir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Write session file
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
  console.log(`✅ Session saved: ${SESSION_FILE}`);

  return sessionData;
}

/**
 * Display session summary
 */
function displaySummary(sessionData) {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SESSION IMPORT SUMMARY');
  console.log('═'.repeat(80));
  console.log(`  📅 Timestamp: ${new Date(sessionData.timestamp).toLocaleString()}`);
  console.log(`  ⏰ Expires: ${new Date(sessionData.expiresAt).toLocaleString()}`);
  console.log(`  🍪 Cookies: ${sessionData.cookies.length}`);
  console.log(`  💾 LocalStorage: ${Object.keys(sessionData.localStorage || {}).length}`);
  console.log(`  🔐 SessionStorage: ${Object.keys(sessionData.sessionStorage || {}).length}`);

  // Show critical cookies
  const criticalCookieNames = ['cf_clearance', 'sso', 'sso-rw', '__cf_bm'];
  const found = sessionData.cookies.filter(c => criticalCookieNames.includes(c.name));

  if (found.length > 0) {
    console.log(`\n  🔑 Critical Cookies Found:`);
    found.forEach(cookie => {
      const expiryDate = cookie.expires ? new Date(cookie.expires * 1000).toLocaleDateString() : 'N/A';
      console.log(`     ✓ ${cookie.name} (expires ${expiryDate})`);
    });
  } else {
    console.log(`\n  ⚠️  WARNING: Critical cookies not found!`);
    console.log(`     Make sure you exported: cf_clearance, sso, sso-rw, __cf_bm`);
  }

  // Show critical localStorage
  const criticalStorageKeys = ['anonUserId', 'anonPrivateKey', 'age-verif'];
  const foundStorage = criticalStorageKeys.filter(
    key => sessionData.localStorage && key in sessionData.localStorage
  );

  if (foundStorage.length > 0) {
    console.log(`\n  🔑 Critical Storage Items Found:`);
    foundStorage.forEach(key => {
      console.log(`     ✓ ${key}`);
    });
  }

  console.log('═'.repeat(80) + '\n');
  console.log('✅ Session imported successfully!\n');
  console.log('💡 Next steps:');
  console.log('   1. Verify session: node scripts/grok-session-capture.js --mode info');
  console.log('   2. Test workflow: node scripts/test-grok-session-workflow.js');
  console.log('   3. Use GrokServiceV2 with auto-login enabled\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--from') && args.includes('embedded')) {
    // Use embedded data from this request
    console.log('\n🔐 Importing embedded session data...\n');

    // Parse the data you provided
    const embeddedCookies = [
      {
        name: '__cf_bm',
        value: 'NVv7eqoNxHCqkeZv4kEVfTIMXbdDqX7Rqi9DZTSGujs-1772334531-1.0.1.1-Af6fiH_GuBaKiiMKcu.qQZJ9klMWYD243_IZx9A10g3c.sOP9qhSKNpuUUDZbSzNRHNFRCKWyk2ImsY8aeQXHn0WtgKrmGHhiFsUH1v6iaY',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2026-03-01T03:38:51.198Z').getTime() / 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'None'
      },
      {
        name: 'cf_clearance',
        value: 'V_qCaahppDW559tSC5pZ4UFcLK6oht.kbTx6f0JIvGw-1772334535-1.2.1.1-PbQDSQi.fvqN4r6Ab36z53Q3BNl43DXPMe12cXL8NgFNafkyoRu_T_WUfpVDogtVB3zPeynnMDE2cuJtfbgvP_YLMZ6U5P6i3.KZOmr2SkRQZjpzFT42gLY89cvtJvR7ri0IoaZSW4NNbgieqRgKOitdcQ_N2mUWeJL4nDa38SrBhShXewhC2Sd80Dp.0c7WeH.W3YI6Gq18aQR_xloWI_ie2aBedFEJMaUf0w4zwm49K7JGwhofqYpcJ901d6Fe',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2027-03-01T03:08:55.496Z').getTime() / 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'None'
      },
      {
        name: 'sso',
        value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2026-08-28T03:10:53.114Z').getTime() / 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      },
      {
        name: 'sso-rw',
        value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2026-08-28T03:10:53.114Z').getTime() / 1000),
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
      },
      {
        name: '_ga',
        value: 'GA1.1.1588378148.1770771786',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2027-04-05T03:11:00.567Z').getTime() / 1000)
      },
      {
        name: '_ga_8FEWB057YH',
        value: 'GS2.1.s1772334536$o73$g1$t1772334660$j60$l0$h0',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2027-04-05T03:11:00.623Z').getTime() / 1000)
      },
      {
        name: 'i18nextLng',
        value: 'vi',
        domain: 'grok.com',
        path: '/',
        expires: Math.floor(new Date('2027-03-01T03:11:00Z').getTime() / 1000),
        sameSite: 'Strict'
      },
      {
        name: 'mp_ea93da913ddb66b6372b89d97b1029ac_mixpanel',
        value: '%7B%22distinct_id%22%3A%224bbefabb-f200-4df5-b600-3d48fcf1ecd3%22%2C%22%24device_id%22%3A%22b4e58b45-c549-4b3c-9681-155d98e75358%22%7D',
        domain: '.grok.com',
        path: '/',
        expires: Math.floor(new Date('2027-03-01T03:11:56Z').getTime() / 1000)
      }
    ];

    const embeddedLocalStorage = {
      '__mpq_ea93da913ddb66b6372b89d97b1029ac_ev': '[]',
      '__mpq_ea93da913ddb66b6372b89d97b1029ac_pp': '[]',
      'active-chat-tabs': '{"state":{"tabByConversationId":{}},"version":2}',
      'age-verif': '{"state":{"dateOfBirthSeconds":631213200,"stage":"pass"},"version":3}',
      'anonPrivateKey': '"nvrqo7TZ1H8nSAe0DPb3Hd6K5mIKpqR8tCJylS3z+TY="',
      'anonUserId': '"cf864f79-fd01-4ae2-94fd-a48bdf708123"',
      'chat-preferences': '{"state":{"activeModelId":"grok-420","defaultAnonModelId":"grok-3","defaultFreeModelId":"grok-3","defaultProModelId":"grok-4","voiceId":"Ara","voicePersonalityId":"assistant","voiceCustomInstructions":null,"voicePlaybackSpeed":1,"modelMode":"grok-420"},"version":3}',
      'highlights-storage': '{"state":{"storyReactions":{}},"version":0}',
      'i18nextLng': 'vi',
      'image-editor-first-open': 'false',
      'imagine-mute-preference': 'false',
      'loglevel:livekit': 'SILENT',
      'loglevel:livekit-engine': 'SILENT',
      'loglevel:livekit-participant': 'SILENT',
      'loglevel:livekit-pc-manager': 'SILENT',
      'loglevel:livekit-pc-transport': 'SILENT',
      'loglevel:livekit-room': 'SILENT',
      'loglevel:livekit-signal': 'SILENT',
      'loglevel:livekit-track': 'SILENT',
      'loglevel:livekit-track-publication': 'SILENT',
      'loglevel:lk-e2ee': 'SILENT',
      'model-select-tutorial': 'true',
      'new-feature-user:imagine:first-use': '1770971577418'
    };

    const embeddedSessionStorage = {
      'mp_gen_new_tab_id_mixpanel_ea93da913ddb66b6372b89d97b1029ac': '1',
      'mp_tab_id_mixpanel_ea93da913ddb66b6372b89d97b1029ac': '$tab-892170ef-ca89-4df4-a4d2-7be3dc93adeb',
      'sentryReplaySession': '{"id":"30a0ec13d20548dc994372bfdcae95ed","started":1772334534835,"lastActivity":1772334716245,"segmentId":0,"sampled":"buffer","dirty":true}',
      'useMediaStore': '{"state":{},"version":1}'
    };

    const sessionData = createSessionFile(
      embeddedCookies,
      embeddedLocalStorage,
      embeddedSessionStorage
    );

    displaySummary(sessionData);
    return;
  }

  if (args.includes('--from') && args[args.indexOf('--from') + 1] === 'clipboard') {
    // Note: Would need additional clipboard handling library
    console.log('Interactive mode not fully implemented in Node.js.');
    console.log('Please use: node scripts/import-grok-session.js --from embedded');
    return;
  }

  // Default: show help
  console.log('\n📖 GROK SESSION IMPORT UTILITY');
  console.log('═'.repeat(80));
  console.log('\nThis tool imports Grok session data from your browser.\n');
  console.log('Usage:\n');
  console.log('  node scripts/import-grok-session.js --from embedded');
  console.log('    → Imports the session data you provided in the request\n');
  console.log('  node scripts/import-grok-session.js --from interactive');
  console.log('    → Interactive mode (paste data when prompted)\n');
  console.log('═'.repeat(80) + '\n');
  console.log('📝 To export session from browser:');
  console.log('  1. Open Chrome/Edge → grok.com');
  console.log('  2. Press F12 → Application tab');
  console.log('  3. Copy Cookies, LocalStorage, SessionStorage');
  console.log('  4. Paste into the import tool\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
