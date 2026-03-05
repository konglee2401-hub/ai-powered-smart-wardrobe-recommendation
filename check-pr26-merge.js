const { execSync } = require('child_process');
const fs = require('fs');

const results = [];

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return '';
  }
}

try {
  results.push('=== PR #26 MERGE CHECK ===\n');
  
  // Current branch
  const branch = exec('git symbolic-ref --short HEAD');
  results.push(`📍 Current Branch: ${branch}`);
  
  // Current HEAD
  const head = exec('git rev-parse HEAD');
  results.push(`📝 Current HEAD: ${head.substring(0, 8)}`);
  
  // Main branch HEAD
  const main = exec('git rev-parse main');
  results.push(`📌 Main Branch HEAD: ${main.substring(0, 8)}`);
  
  // Last 10 commits on main
  results.push('\n🔍 Last 10 Commits on Main:\n');
  const logOut = exec('git log --oneline main -10');
  results.push(logOut);
  
  // Check for PR #26 references
  results.push('\n\n🔎 Searching for PR #26 references:\n');
  const pr26 = exec('git log --all --grep="#26" --oneline');
  if (pr26) {
    results.push('Commits with "#26":');
    results.push(pr26);
  } else {
    results.push('❌ No commits found with "#26"');
  }
  
  // Check for merge commits
  results.push('\n\n🔀 Recent Merge Commits:\n');
  const merges = exec('git log --merges --oneline main -15');
  if (merges) {
    results.push(merges);
  } else {
    results.push('❌ No merge commits found');
  }
  
  // Check branches
  results.push('\n\n🌿 Available Local Branches:\n');
  const branches = exec('git branch -v');
  results.push(branches);
  
  // Check if pr-26 branch exists
  results.push('\n\n🔍 Checking for pr-26 branch:\n');
  const pr26branch = exec('git rev-parse refs/heads/pr-26 2>/dev/null || git rev-parse refs/remotes/origin/pr-26 2>/dev/null');
  if (pr26branch) {
    results.push(`✅ pr-26 branch exists: ${pr26branch.substring(0, 8)}`);
  } else {
    results.push('❌ pr-26 branch does NOT exist locally or remotely');
  }
  
  // File changes compared to main
  results.push('\n\n📊 Files changed from origin/main:\n');
  const changedFiles = exec('git diff origin/main --name-only 2>/dev/null || echo "Cannot diff with origin/main"');
  if (changedFiles) {
    results.push(changedFiles.split('\n').slice(0, 20).join('\n'));
  }
  
  // CONCLUSION
  results.push('\n\n=== CONCLUSION ===\n');
  const branches_str = branches || '';
  if (!branches_str.includes('pr-26')) {
    results.push('✅ PR #26 branch is NOT in local branches (likely merged or deleted)');
  } else {
    results.push('⚠️  PR #26 branch still exists locally');
  }
  
  if (branch === 'main') {
    results.push(`✅ Currently on main branch`);
  } else {
    results.push(`⚠️  Currently on ${branch} branch (not main)`);
  }
  
  results.push('\n✅ Check complete!');
  
  // Write to file
  const output = results.join('\n');
  fs.writeFileSync('git-check-output.txt', output);
  
  // Also log to console
  console.log(output);
  console.log('\n📁 Output saved to: git-check-output.txt');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
