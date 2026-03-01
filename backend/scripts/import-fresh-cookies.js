#!/usr/bin/env node

/**
 * Parse newly captured cookies from browser tab-separated format
 * and update grok-session-complete.json
 * 
 * Usage:
 *   node scripts/import-fresh-cookies.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');

function parseTabSeparatedRow(row) {
  const parts = row.split('\t').map(p => p.trim());
  
  if (parts.length < 4) return null;

  const cookie = {
    name: parts[0],
    value: parts[1],
    domain: parts[2],
    path: parts[3]
  };

  // Parse expiry (parts[4])
  if (parts[4] && parts[4] !== 'Session') {
    try {
      const expiryDate = new Date(parts[4]);
      if (!isNaN(expiryDate.getTime())) {
        cookie.expires = Math.floor(expiryDate.getTime() / 1000);
      }
    } catch (e) {}
  }

  // Parse HttpOnly (parts[6])
  cookie.httpOnly = parts[6] === '✓' || parts[6] === 'true';

  // Parse Secure (parts[7])
  cookie.secure = parts[7] === '✓' || parts[7] === 'true';

  // Parse SameSite (parts[8])
  if (parts[8] && parts[8] !== '✗' && parts[8] !== '') {
    cookie.sameSite = parts[8];
  } else {
    cookie.sameSite = 'None';
  }

  return cookie;
}

const newCookiesData = `__cf_bm	9PI_NvvocNO8GAHv0ncumiY32ZCWLN0ZfRaM2LJT.g4-1772336662-1.0.1.1-mxHqJllokrL_rpwBnRqVXp7bzslkfo3i2WRkHPo1kmaY3.BcE3wZIdrAm7.27wBIw85G08pY8c3ovc.VfPo2Nj1RFxGdAV.gGWCmJSj7mmU	.grok.com	/	2026-03-01T04:14:22.196Z	177	✓	✓	None
__cf_bm	_eFZ6yEXsy.5nMoGVQMWeKahpgZOgSubJL9Y07L5P0s-1772336671-1.0.1.1-bjJRGRuJkZTGhsP57aFiv.w5jyqom.zv0f1zh0.hczkA5E0nIjBmvd1yzAn.ZsZ6nobOYaMtTtd_mDc6VkDlWvY6LewpfCn4grrpNA4f2mw	.x.ai	/	2026-03-01T04:14:31.729Z	177	✓	✓	None
_ga	GA1.1.1588378148.1770771786	.grok.com	/	2027-04-05T03:44:27.924Z	30
_ga_8FEWB057YH	GS2.1.s1772334536$o73$g1$t1772336691$j33$l0$h0	.grok.com	/	2027-04-05T03:44:51.952Z	60
cf_clearance	ixkahUUrY0iNuR9_G38K3BVDrPFyqIWUb20hOzkK_KI-1772336667-1.2.1.1-4N9Ac0u.6Nbypdy7xJ_Psrjw26M9zmpAaOlnjyZJdPP3Llu22Qn9arQ4yoqwOL99ThgqrIl2sLyKWrAIt4SWN5Grq.IFUr.vERBOvlSwFqxjaG.CqOhb3Y9bVgo_.bDX9pBO_WsPBTNjWKKuOD5DqkNTHCpMWm1Ee5mk2qXbg3fBAha_2kJ7uyqXEmj5.411g9fp5ABQKBNqoIa181emcgoWpxsNm3bo6cYaEifkNNuozEnD9bQomSga8UbRsiUJ	.grok.com	/	2027-03-01T03:44:27.092Z	331	✓	✓	None
i18nextLng	vi	grok.com	/	2027-03-01T03:44:27.000Z	12			Strict
mp_0b4055a12491884bcb6f34a5aa2718b6_mixpanel	%7B%22distinct_id%22%3A%22d2584c48-8f61-48a5-8699-9ef708cba832%22%2C%22%24device_id%22%3A%22520586fa-487c-4fd3-8470-937474ac4dea%22%2C%22%24search_engine%22%3A%22google%22%2C%22%24initial_referrer%22%3A%22https%3A%2F%2Fwww.google.com%2F%22%2C%22%24initial_referring_domain%22%3A%22www.google.com%22%2C%22xai_app_name%22%3A%22cloud-console%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%22%24initial_referrer%22%3A%22https%3A%2F%2Fwww.google.com%2F%22%2C%22%24initial_referring_domain%22%3A%22www.google.com%22%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24user_id%22%3A%22d2584c48-8f61-48a5-8699-9ef708cba832%22%7D	.x.ai	/	2027-02-27T16:46:11.000Z	740
mp_ea93da913ddb66b6372b89d97b1029ac_mixpanel	%7B%22distinct_id%22%3A%224bbefabb-f200-4df5-b600-3d48fcf1ecd3%22%2C%22%24device_id%22%3A%22b4e58b45-c549-4b3c-9681-155d98e75358%22%2C%22%24initial_referrer%22%3A%22https%3A%2F%2Fgrok.com%2Fimagine%2Ffavorites%3F__cf_chl_tk%3DyudxJjIudAa9do2fGRLnfEv1Z6F24aQbpBEekeSYmMM-1770771700-1.0.1.1-kHSqAoNIUgPpIPSCMldFoYcETH5_CWQQNoo0DPh8tXg%22%2C%22%24initial_referring_domain%22%3A%22grok.com%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24user_id%22%3A%224bbefabb-f200-4df5-b600-3d48fcf1ecd3%22%7D	.grok.com	/	2027-03-01T03:45:03.000Z	663
sso	eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac	.grok.com	/	2026-08-28T03:10:53.114Z	155	✓	✓	Lax
sso	eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac	.x.ai	/	2026-08-28T03:10:53.355Z	155	✓	✓	Lax
sso-rw	eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac	.grok.com	/	2026-08-28T03:10:53.114Z	158	✓	✓	Strict
sso-rw	eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiODkyYTZhYTMtYjcwYi00NGEyLWIwNjgtZjgwNTU2ZGZkYTFkIn0.5D3YPqyiy_PO9PBGpa2ltfFJtGRsnH1iHeP0V-Rrwac	.x.ai	/	2026-08-28T03:10:53.354Z	158	✓	✓	Strict
x-userid	4bbefabb-f200-4df5-b600-3d48fcf1ecd3	.grok.com	/	Session	44		✓	None`;

console.log('\n' + '═'.repeat(80));
console.log('🔐 IMPORT FRESH COOKIES');
console.log('═'.repeat(80) + '\n');

try {
  // Parse all cookies
  const rows = newCookiesData.trim().split('\n');
  const cookies = [];

  for (const row of rows) {
    const cookie = parseTabSeparatedRow(row);
    if (cookie) {
      cookies.push(cookie);
    }
  }

  console.log(`📊 Parsed ${cookies.length} cookies\n`);
  console.log('Cookies by domain:');
  
  const grokCookies = cookies.filter(c => c.domain === '.grok.com' || c.domain === 'grok.com').map(c => c.name);
  const xaiCookies = cookies.filter(c => c.domain === '.x.ai').map(c => c.name);

  console.log(`  🟦 .grok.com: ${grokCookies.join(', ')}`);
  console.log(`  🟦 .x.ai: ${xaiCookies.join(', ')}\n`);

  // Load current session
  const currentSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));

  // Create backup
  const backupFile = SESSION_FILE.replace('.json', '-backup-' + Date.now() + '.json');
  fs.writeFileSync(backupFile, JSON.stringify(currentSession, null, 2));
  console.log(`📦 Backup saved: ${path.basename(backupFile)}\n`);

  // Update session
  currentSession.timestamp = new Date().toISOString();
  currentSession.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  currentSession.cookies = cookies;

  fs.writeFileSync(SESSION_FILE, JSON.stringify(currentSession, null, 2));

  console.log(`✅ Session updated: ${SESSION_FILE}\n`);

  // Verify
  console.log('🔐 VERIFY CRITICAL COOKIES\n');
  
  const criticalCookies = ['cf_clearance', 'sso', 'sso-rw', '__cf_bm', 'x-userid'];
  for (const name of criticalCookies) {
    const found = cookies.filter(c => c.name === name);
    if (found.length > 0) {
      console.log(`  ✅ ${name}: ${found.length} instance(s)`);
      for (const c of found) {
        const expires = c.expires ? new Date(c.expires * 1000).toLocaleDateString() : 'N/A';
        console.log(`     - ${c.domain} (expires ${expires})`);
      }
    } else {
      console.log(`  ❌ ${name}: MISSING`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ IMPORT COMPLETE\n');
  console.log('Now test with: node scripts/verify-grok-session.js');
  console.log('═'.repeat(80) + '\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
