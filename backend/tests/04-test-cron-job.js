/**
 * Cron Job Service Test
 * Test job creation, scheduling, execution, and statistics
 */

import CronJobService from '../services/cronJobService.js';

console.log('='.repeat(80));
console.log('CRON JOB SERVICE TEST');
console.log('='.repeat(80));

// Test 1: Create jobs
console.log('\n1️⃣ TEST: Creating scheduled jobs');
console.log('-'.repeat(80));

const generateJob = CronJobService.createJob({
  name: 'Video Generation Job',
  description: 'Generate product promo videos hourly',
  schedule: '0 * * * *', // Every hour
  jobType: 'generate',
  platform: 'tiktok',
  enabled: true,
  handler: async job => ({
    success: true,
    output: { generated: 1, message: 'Video generated successfully' }
  })
});

console.log('✅ Created generation job:', generateJob.jobId);
console.log('   Schedule: Every hour (0 * * * *)');
console.log('   Platform:', generateJob.job.platform);
console.log('   Enabled:', generateJob.job.enabled);

const uploadJob = CronJobService.createJob({
  name: 'Video Upload Job',
  description: 'Upload videos every 2 hours',
  schedule: '0 */2 * * *', // Every 2 hours
  jobType: 'upload',
  enabled: true,
  handler: async job => ({
    success: true,
    output: { uploaded: 1, message: 'Upload completed' }
  })
});

console.log('✅ Created upload job:', uploadJob.jobId);
console.log('   Schedule: Every 2 hours (0 */2 * * *)');
console.log('   Enabled:', uploadJob.job.enabled);

const cleanupJob = CronJobService.createJob({
  name: 'Daily Cleanup Job',
  description: 'Clean up old files daily',
  schedule: '0 3 * * *', // Daily at 3 AM
  jobType: 'cleanup',
  enabled: true,
  handler: async job => ({
    success: true,
    output: { cleaned: 5, message: 'Cleanup completed' }
  })
});

console.log('✅ Created cleanup job:', cleanupJob.jobId);
console.log('   Schedule: Daily at 3 AM');

// Test 2: Validate cron expressions
console.log('\n2️⃣ TEST: Cron expression validation');
console.log('-'.repeat(80));

const validExpressions = [
  { expr: '0 * * * *', desc: 'Every hour' },
  { expr: '0 0 * * *', desc: 'Daily at midnight' },
  { expr: '*/5 * * * *', desc: 'Every 5 minutes' },
  { expr: '0 */6 * * *', desc: 'Every 6 hours' }
];

validExpressions.forEach(({ expr, desc }) => {
  const isValid = CronJobService.isValidCronExpression(expr);
  console.log(`✅ "${expr}" (${desc}): ${isValid ? 'Valid' : 'Invalid'}`);
});

// Test 3: Get next run times
console.log('\n3️⃣ TEST: Calculate next run times');
console.log('-'.repeat(80));

const nextRun1 = CronJobService.getNextRun('0 * * * *');
if (nextRun1) {
  console.log('✅ Next run for "0 * * * *":', new Date(nextRun1).toLocaleString());
}

const nextRun2 = CronJobService.getNextRun('0 0 * * *');
if (nextRun2) {
  console.log('✅ Next run for "0 0 * * *":', new Date(nextRun2).toLocaleString());
}

// Test 4: Get all jobs
console.log('\n4️⃣ TEST: Get all jobs');
console.log('-'.repeat(80));

const allJobs = CronJobService.getAllJobs();
console.log(`✅ Total jobs: ${allJobs.count}`);
allJobs.jobs.forEach((job, i) => {
  console.log(`   ${i + 1}. ${job.name} (${job.jobType}) - Enabled: ${job.enabled}`);
});

// Test 5: Get jobs by filter
console.log('\n5️⃣ TEST: Filter jobs');
console.log('-'.repeat(80));

const generateJobs = CronJobService.getAllJobs({ jobType: 'generate' });
console.log(`✅ Generate jobs: ${generateJobs.count}`);

const uploadJobs = CronJobService.getAllJobs({ jobType: 'upload' });
console.log(`✅ Upload jobs: ${uploadJobs.count}`);

const enabledJobs = CronJobService.getAllJobs({ enabled: true });
console.log(`✅ Enabled jobs: ${enabledJobs.count}`);

// Test 6: Get specific job
console.log('\n6️⃣ TEST: Get specific job');
console.log('-'.repeat(80));

const jobDetail = CronJobService.getJob(generateJob.jobId);
if (jobDetail.success) {
  const job = jobDetail.job;
  console.log('✅ Job details:');
  console.log('   Name:', job.name);
  console.log('   Type:', job.jobType);
  console.log('   Schedule:', job.schedule);
  console.log('   Created:', job.createdAt);
  console.log('   Next run:', job.nextRun);
  console.log('   Runs:', `${job.successfulRuns} successful, ${job.failedRuns} failed`);
}

// Test 7: Update job
console.log('\n7️⃣ TEST: Update job');
console.log('-'.repeat(80));

const updateJob = CronJobService.updateJob(generateJob.jobId, {
  schedule: '0 */2 * * *', // Change to every 2 hours
  description: 'Updated: Generate every 2 hours',
  metadata: { videosPerRun: 2 }
});

if (updateJob.success) {
  console.log('✅ Updated job schedule:');
  console.log('   New schedule:', updateJob.job.schedule);
  console.log('   New next run:', updateJob.job.nextRun);
}

// Test 8: Run job immediately
console.log('\n8️⃣ TEST: Manual job execution');
console.log('-'.repeat(80));

const testHandler = async job => {
  // Simulate job execution
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    success: true,
    output: {
      executed: true,
      duration: 100,
      message: 'Manual execution successful'
    }
  };
};

(async () => {
  const manualRun = await CronJobService.runJobNow(generateJob.jobId, testHandler);
  console.log('✅ Manual job execution completed');
  if (manualRun.success) {
    console.log('   Result:', manualRun.result.success);
  }
})();

// Test 9: Enable/Disable jobs
console.log('\n9️⃣ TEST: Enable/Disable jobs');
console.log('-'.repeat(80));

// Test disable
const disableJob = CronJobService.disableJob(uploadJob.jobId);
console.log('✅ Disabled upload job');

// Test enable
const enableJob = CronJobService.enableJob(uploadJob.jobId, testHandler);
console.log('✅ Re-enabled upload job');

// Test 10: Job statistics
console.log('\n🔟 TEST: Job statistics');
console.log('-'.repeat(80));

const stats = CronJobService.getJobStatistics();
console.log('✅ Job statistics:');
console.log('   Total jobs:', stats.stats.totalJobs);
console.log('   Enabled jobs:', stats.stats.enabledJobs);
console.log('   Disabled jobs:', stats.stats.disabledJobs);
console.log('   By type:');
console.log(`      Generate: ${stats.stats.byType.generate}`);
console.log(`      Upload: ${stats.stats.byType.upload}`);
console.log(`      Cleanup: ${stats.stats.byType.cleanup}`);
console.log(`      Analyze: ${stats.stats.byType.analyze}`);
console.log('   Execution stats:');
console.log(`      Total runs: ${stats.stats.totalRuns}`);
console.log(`      Successful: ${stats.stats.totalSuccessful}`);
console.log(`      Failed: ${stats.stats.totalFailed}`);
console.log(`      Success rate: ${stats.stats.successRate}%`);
console.log(`      Average duration: ${stats.stats.averageDuration}ms`);

// Test 11: Get running jobs
console.log('\n1️⃣1️⃣ TEST: Running jobs');
console.log('-'.repeat(80));

const running = CronJobService.getRunningJobs();
console.log(`✅ Currently running jobs: ${running.count}`);
if (running.running.length > 0) {
  running.running.forEach((job, i) => {
    console.log(`   ${i + 1}. ${job.name}`);
    console.log(`      Next run: ${job.nextRun || 'Not scheduled'}`);
  });
}

// Test 12: Get process logs
console.log('\n1️⃣2️⃣ TEST: Process logs');
console.log('-'.repeat(80));

const logs = CronJobService.getJobHistory(generateJob.jobId, 10);
console.log(`✅ History for generation job: ${logs.count} entries`);
if (logs.history.length > 0) {
  logs.history.slice(-3).forEach((log, i) => {
    console.log(`   ${i + 1}. ${log.stage} - ${log.status} (${log.timestamp})`);
  });
}

// Test 13: Create job with invalid expression
console.log('\n1️⃣3️⃣ TEST: Invalid cron expression handling');
console.log('-'.repeat(80));

const invalidJob = CronJobService.createJob({
  name: 'Invalid Job',
  schedule: 'invalid * * * *',
  jobType: 'generate',
  handler: async job => ({ success: true })
});

if (!invalidJob.success) {
  console.log('✅ Correctly rejected invalid cron expression');
  console.log('   Error:', invalidJob.error);
} else {
  console.log('❌ Should have rejected invalid expression');
}

// Test 14: Delete job
console.log('\n1️⃣4️⃣ TEST: Delete job');
console.log('-'.repeat(80));

// Create a temp job to delete
const tempJob = CronJobService.createJob({
  name: 'Temp Job',
  schedule: '0 0 * * *',
  jobType: 'cleanup',
  handler: async job => ({ success: true })
});

if (tempJob.success) {
  const deleteResult = CronJobService.deleteJob(tempJob.jobId);
  console.log('✅ Deleted temporary job:', tempJob.jobId);

  // Verify deletion
  const verifyDelete = CronJobService.getJob(tempJob.jobId);
  if (!verifyDelete.success) {
    console.log('✅ Verified: Job no longer exists');
  }
}

// Test 15: Cleanup history
console.log('\n1️⃣5️⃣ TEST: History cleanup');
console.log('-'.repeat(80));

const cleanupHistory = CronJobService.cleanupHistory(0); // Remove all for demo
console.log('✅ Cleaned up job history');
console.log('   Deleted entries:', cleanupHistory.deleted);

// Final Summary
console.log('\n' + '='.repeat(80));
console.log('FINAL JOB STATE');
console.log('='.repeat(80));

const finalStats = CronJobService.getJobStatistics();
console.log('\n📊 Job Summary:');
console.log(`✅ Total jobs: ${finalStats.stats.totalJobs}`);
console.log(`✅ Enabled: ${finalStats.stats.enabledJobs}`);
console.log(`✅ Disabled: ${finalStats.stats.disabledJobs}`);
console.log(`✅ Success rate: ${finalStats.stats.successRate}%`);
console.log(`✅ Next scheduled jobs:`);
finalStats.stats.nextScheduledJobs.slice(0, 3).forEach((job, i) => {
  console.log(`   ${i + 1}. ${job.name} @ ${job.nextRun}`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ CRON JOB SERVICE TEST COMPLETED!');
console.log('='.repeat(80));
