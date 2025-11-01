#!/bin/bash

# Update Dependencies Script
# Safely updates all dependencies to latest versions

echo "🔄 PhotoGear Price Tracker - Dependency Update"
echo "=============================================="
echo ""

cd "$(dirname "$0")"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Backup current package-lock.json
if [ -f "package-lock.json" ]; then
    echo "💾 Backing up package-lock.json..."
    cp package-lock.json package-lock.json.backup
    echo "✅ Backup created: package-lock.json.backup"
    echo ""
fi

# Remove old dependencies
echo "🗑️  Removing old node_modules..."
rm -rf node_modules

if [ -f "package-lock.json" ]; then
    echo "🗑️  Removing old package-lock.json..."
    rm package-lock.json
fi

echo "✅ Cleanup complete"
echo ""

# Install fresh dependencies
echo "📦 Installing updated dependencies..."
echo "   This may take 2-3 minutes..."
echo ""

npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ Dependencies updated successfully!"
    echo "=============================================="
    echo ""

    # Show installed versions
    echo "📊 Installed versions:"
    echo ""
    npm list --depth=0 | grep -E "puppeteer|helmet|express|winston|nodemailer"

    echo ""
    echo "🔍 Running security audit..."
    npm audit

    echo ""
    echo "=============================================="
    echo "✅ Update complete!"
    echo "=============================================="
    echo ""
    echo "📝 Next steps:"
    echo "1. Test backend: npm start"
    echo "2. Test scraper: node scrapers/bhphoto.js"
    echo "3. Check for errors in console"
    echo ""
    echo "📖 See DEPENDENCY_UPDATES.md for details"
    echo ""

else
    echo ""
    echo "=============================================="
    echo "❌ Installation failed!"
    echo "=============================================="
    echo ""
    echo "🔄 Restoring backup..."

    if [ -f "package-lock.json.backup" ]; then
        cp package-lock.json.backup package-lock.json
        npm install
        echo "✅ Backup restored"
    fi

    echo ""
    echo "Please check errors above and try again."
    exit 1
fi
