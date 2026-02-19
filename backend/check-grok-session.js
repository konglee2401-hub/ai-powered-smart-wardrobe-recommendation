import SessionManager from './services/utils/sessionManager.js';

const sm = new SessionManager('grok');
console.log('\n═══════════════════════════════════════════════════════════');
console.log('          GROK SESSION STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

if (sm.hasSession()) {
  const info = sm.getSessionInfo();
  console.log('✅ Session exists');
  console.log(`   Service: ${info.service}`);
  console.log(`   Saved: ${info.savedAt}`);
  console.log(`   Age: ${info.ageHours} hours`);
  console.log(`   Cookies: ${info.cookieCount}\n`);
  
  if (info.ageHours > 720) {
    console.log('⚠️  Session is older than 30 days - may have expired\n');
  }
} else {
  console.log('❌ No saved session found\n');
  console.log('💡 When you login to Grok next time, the session will be saved.');
  console.log('   After that, you can reuse it without logging in again!\n');
}

console.log('═══════════════════════════════════════════════════════════\n');
