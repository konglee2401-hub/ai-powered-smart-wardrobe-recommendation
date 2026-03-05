@echo off
cd /d c:\Work\Affiliate-AI\smart-wardrobe
echo === CURRENT BRANCH === > git-check-output.txt
git rev-parse --abbrev-ref HEAD >> git-check-output.txt 2>&1
echo === GIT LOG (last 2 commits) === >> git-check-output.txt
git log --oneline -2 >> git-check-output.txt 2>&1
echo === GIT STATUS === >> git-check-output.txt
git status --porcelain >> git-check-output.txt 2>&1
type git-check-output.txt
