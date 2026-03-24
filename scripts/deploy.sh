#!/bin/bash
set -e

echo "=== Treasury Committee Deploy ==="

# 1. Build check
echo "[1/4] Building..."
npm run build

# 2. Prepare deploy directory
echo "[2/4] Preparing deploy..."
rm -rf /tmp/tma-deploy
cp -r "$(pwd)" /tmp/tma-deploy
rm -rf /tmp/tma-deploy/node_modules /tmp/tma-deploy/.next /tmp/tma-deploy/.firebase \
       /tmp/tma-deploy/.git /tmp/tma-deploy/.env.local /tmp/tma-deploy/.emulator-data \
       /tmp/tma-deploy/docs /tmp/tma-deploy/scripts

# 3. Deploy to Cloud Run via Windows gcloud
echo "[3/4] Deploying to Cloud Run..."
DEPLOY_SOURCE=$(wslpath -w /tmp/tma-deploy)
powershell.exe -Command "cmd /c 'gcloud run deploy treasury-committee --source=${DEPLOY_SOURCE} --region=asia-northeast1 --allow-unauthenticated --memory=512Mi --no-cache --quiet'"

# 4. Git push
echo "[4/4] Pushing to GitHub..."
export PATH="$HOME/bin:$PATH"
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "deploy: $(date +%Y-%m-%d_%H:%M)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
  git push origin main
fi

echo "=== Deploy complete ==="
echo "URL: https://treasury-committee.web.app"
