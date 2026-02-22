/**
 * Multi Account Service Test
 * Test account management, credentials, and upload capabilities
 */

import MultiAccountService from '../services/multiAccountService.js';

console.log('='.repeat(80));
console.log('MULTI ACCOUNT SERVICE TEST');
console.log('='.repeat(80));

// Test 1: Add accounts
console.log('\n1️⃣ TEST: Adding social media accounts');
console.log('-'.repeat(80));

const tiktokAcc1 = MultiAccountService.addAccount({
  platform: 'tiktok',
  username: 'fashionista_001',
  password: 'secure_pass_1',
  displayName: 'Fashion Guru',
  metadata: { niche: 'fashion', language: 'en' }
});

console.log('✅ Added TikTok account:', tiktokAcc1.accountId);
console.log('   Username:', tiktokAcc1.account.username);
console.log('   Display name:', tiktokAcc1.account.displayName);

const youtubeAcc1 = MultiAccountService.addAccount({
  platform: 'youtube',
  username: 'FashionChannel',
  password: 'youtube_secure_2',
  displayName: 'Style & Fashion Channel'
});

console.log('✅ Added YouTube account:', youtubeAcc1.accountId);

const facebookAcc1 = MultiAccountService.addAccount({
  platform: 'facebook',
  username: 'fashion_community',
  password: 'facebook_secure_3'
});

console.log('✅ Added Facebook account:', facebookAcc1.accountId);

// Test 2: Add multiple accounts per platform
console.log('\n2️⃣ TEST: Adding multiple accounts per platform');
console.log('-'.repeat(80));

const tiktokAcc2 = MultiAccountService.addAccount({
  platform: 'tiktok',
  username: 'style_creator_02',
  password: 'pass_2',
  displayName: 'Style Creator'
});

console.log('✅ Added second TikTok account:', tiktokAcc2.accountId);

const tiktokAcc3 = MultiAccountService.addAccount({
  platform: 'tiktok',
  username: 'trend_king_03',
  password: 'pass_3',
  displayName: 'Trend King'
});

console.log('✅ Added third TikTok account:', tiktokAcc3.accountId);

// Test 3: Verify accounts
console.log('\n3️⃣ TEST: Verifying accounts');
console.log('-'.repeat(80));

MultiAccountService.updateAccount(tiktokAcc1.accountId, { verified: true });
console.log('✅ Verified TikTok account 1');

MultiAccountService.updateAccount(tiktokAcc2.accountId, { verified: true });
console.log('✅ Verified TikTok account 2');

MultiAccountService.updateAccount(youtubeAcc1.accountId, { verified: true });
console.log('✅ Verified YouTube account');

MultiAccountService.updateAccount(facebookAcc1.accountId, { verified: true });
console.log('✅ Verified Facebook account');

// Test 4: Get accounts by platform
console.log('\n4️⃣ TEST: Get accounts by platform');
console.log('-'.repeat(80));

const tiktokAccounts = MultiAccountService.getAccountsByPlatform('tiktok');
console.log(`✅ TikTok accounts (${tiktokAccounts.count}):`);
tiktokAccounts.accounts.forEach((acc, i) => {
  console.log(`   ${i + 1}. ${acc.username} @ ${acc.displayName}`);
});

const youtubeAccounts = MultiAccountService.getAccountsByPlatform('youtube');
console.log(`✅ YouTube accounts (${youtubeAccounts.count}):`);
youtubeAccounts.accounts.forEach((acc, i) => {
  console.log(`   ${i + 1}. ${acc.username}`);
});

// Test 5: Get active accounts
console.log('\n5️⃣ TEST: Get active and verified accounts');
console.log('-'.repeat(80));

const activeAccounts = MultiAccountService.getActiveAccounts();
console.log(`✅ Active verified accounts: ${activeAccounts.count}`);

const activeTiktok = MultiAccountService.getActiveAccounts('tiktok');
console.log(`✅ Active TikTok accounts: ${activeTiktok.count}`);

// Test 6: Best account for posting
console.log('\n6️⃣ TEST: Best account selection');
console.log('-'.repeat(80));

if (activeTiktok.count > 0) {
  const best = MultiAccountService.getBestAccountForPosting('tiktok');
  if (best.success) {
    console.log('✅ Best TikTok account for posting:', best.account.username);
    console.log('   Score:', best.score.toFixed(2));
    console.log('   Posts count:', best.account.postsCount);
    console.log('   Engagement rate:', best.account.engagementRate + '%');
  }
}

// Test 7: Account rotation
console.log('\n7️⃣ TEST: Account rotation');
console.log('-'.repeat(80));

if (activeTiktok.count >= 2) {
  const rotation = MultiAccountService.getAccountRotation('tiktok', 2);
  console.log(`✅ TikTok rotation (max 2): ${rotation.rotation.length} accounts`);
  rotation.rotation.forEach((acc, i) => {
    console.log(`   ${i + 1}. ${acc.username} (Last used: ${acc.lastUsed || 'Never'})`);
  });
}

// Test 8: Can upload now checks
console.log('\n8️⃣ TEST: Upload capability checks');
console.log('-'.repeat(80));

const uploadCheck1 = MultiAccountService.canUploadNow(tiktokAcc1.accountId);
console.log('✅ TikTok Account 1 upload check:');
console.log('   Can upload:', uploadCheck1.canUpload);
console.log('   Reason:', uploadCheck1.reason);
console.log('   Daily limit:', uploadCheck1.uploadedToday, '/', 
  MultiAccountService.accounts[0]?.dailyUploadLimit);

// Test 9: Record post
console.log('\n9️⃣ TEST: Recording posts to account');
console.log('-'.repeat(80));

const recordPost1 = MultiAccountService.recordPost(tiktokAcc1.accountId, {
  views: 5000,
  engagement: 8.5
});

console.log('✅ Recorded post on TikTok Account 1');
console.log('   Total posts:', recordPost1.postsCount);
console.log('   Posts today:', recordPost1.uploadedToday);
console.log('   Remaining daily:', recordPost1.remainingDaily);

// Record multiple posts to trigger cooldown
for (let i = 0; i < 3; i++) {
  MultiAccountService.recordPost(tiktokAcc2.accountId, {
    views: 2000,
    engagement: 6.0
  });
}

console.log('✅ Recorded 4 posts on TikTok Account 2');

// Test 10: Error recording
console.log('\n🔟 TEST: Error recording');
console.log('-'.repeat(80));

const errorRecord = MultiAccountService.recordError(
  tiktokAcc3.accountId,
  new Error('Email verification required')
);

console.log('✅ Recorded error on TikTok Account 3');
console.log('   Last error:', errorRecord.accountId ? 'Recorded' : 'Account may be deactivated');

// Test 11: Account statistics
console.log('\n1️⃣1️⃣ TEST: Account statistics');
console.log('-'.repeat(80));

const stats = MultiAccountService.getAccountStats();
console.log('✅ Overall statistics:');
console.log('   Total accounts:', stats.stats.totalAccounts);
console.log('   Active accounts:', stats.stats.activeAccounts);
console.log('   Verified accounts:', stats.stats.verifiedAccounts);
console.log('   Total posts:', stats.stats.totalPosts);
console.log('   Total views:', stats.stats.totalViews);
console.log('   Average engagement:', stats.stats.averageEngagement + '%');
console.log('   Accounts with errors:', stats.stats.accountsWithErrors);

// Test 12: Get account with password
console.log('\n1️⃣2️⃣ TEST: Get account with password');
console.log('-'.repeat(80));

const accWithPass = MultiAccountService.getAccountWithPassword(tiktokAcc1.accountId);
if (accWithPass.success) {
  console.log('✅ Retrieved account with decrypted password');
  console.log('   Username:', accWithPass.account.username);
  console.log('   Password encrypted:', '***');
  console.log('   Password decrypted:', accWithPass.account.password ? '✓ (decrypted)' : '✗');
}

// Test 13: Update account
console.log('\n1️⃣3️⃣ TEST: Update account details');
console.log('-'.repeat(80));

const updateResult = MultiAccountService.updateAccount(tiktokAcc1.accountId, {
  displayName: 'Fashion Expert Pro',
  email: 'fashionista@example.com'
});

console.log('✅ Updated account details');
console.log('   New display name:', updateResult.account.displayName);
console.log('   New email:', updateResult.account.email);

// Test 14: Deactivate account
console.log('\n1️⃣4️⃣ TEST: Account deactivation');
console.log('-'.repeat(80));

const deactivate = MultiAccountService.deactivateAccount(tiktokAcc3.accountId, 'Suspicious activity detected');
console.log('✅ Deactivated account:', tiktokAcc3.accountId);
console.log('   Reason:', deactivate.message);

// Test 15: Get all accounts
console.log('\n1️⃣5️⃣ TEST: Get all accounts');
console.log('-'.repeat(80));

const allAccounts = MultiAccountService.getAllAccounts();
console.log(`✅ Total accounts in system: ${allAccounts.count}`);
console.log('   Active accounts:', allAccounts.accounts.filter(a => a.active).length);

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL ACCOUNT STATE');
console.log('='.repeat(80));

const finalStats = MultiAccountService.getAccountStats();
console.log('\n📊 Account Summary:');
console.log(`✅ Total accounts: ${finalStats.stats.totalAccounts}`);
console.log(`✅ Verified accounts: ${finalStats.stats.verifiedAccounts}`);
console.log(`✅ Platform breakdown:`);
console.log(`   TikTok: ${finalStats.stats.byPlatform.tiktok}`);
console.log(`   YouTube: ${finalStats.stats.byPlatform.youtube}`);
console.log(`   Facebook: ${finalStats.stats.byPlatform.facebook}`);
console.log(`✅ Total posts across all accounts: ${finalStats.stats.totalPosts}`);
console.log(`✅ Average engagement: ${finalStats.stats.averageEngagement}%`);

console.log('\n' + '='.repeat(80));
console.log('✅ MULTI ACCOUNT SERVICE TEST COMPLETED!');
console.log('='.repeat(80));
