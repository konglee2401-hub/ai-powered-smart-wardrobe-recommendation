const { execSync } = require('child_process');
const path = require('path');

const workDir = 'c:\\Work\\Affiliate-AI\\smart-wardrobe';
process.chdir(workDir);

console.log('=== STEP 1: CURRENT BRANCH ===');
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  console.log(`Branch: ${branch}`);
} catch (e) {
  console.error('Error:', e.message);
}

console.log('\n=== STEP 2: GIT LOG (last 2 commits) ===');
try {
  const log = execSync('git log --oneline -2', { encoding: 'utf-8' });
  console.log(log);
} catch (e) {
  console.error('Error:', e.message);
}

console.log('\n=== STEP 3: GIT STATUS ===');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.trim() === '') {
    console.log('No changes (working directory clean)');
  } else {
    console.log('Modified files:');
    console.log(status);
  }
} catch (e) {
  console.error('Error:', e.message);
}
