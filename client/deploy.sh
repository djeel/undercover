#!/usr/bin/env sh

# Abort on errors
set -e

# Navbar to build
echo "Building..."
npm run build

# Navigate into the build output directory
cd dist

# Clean up any existing git config to ensure a fresh start
rm -rf .git

# Initialize a new git repository
git init
git checkout -b deploy

# Add all files
git add -A

# Commit
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to gh-pages
# Uses the remote from the parent directory if possible, or assumes origin
REMOTE=$(git -C ../.. config --get remote.origin.url)

echo "Pushing to $REMOTE..."
git push -f $REMOTE deploy:gh-pages

cd -
