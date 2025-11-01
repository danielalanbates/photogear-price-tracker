#!/bin/bash

# Extension Verification Script
# Checks that all required files are present and valid

cd "/Users/daniel/Documents/aicode/Price Tracker/extension"

echo "🔍 PhotoGear Price Tracker - Extension Verification"
echo "===================================================="
echo ""

# Check required files
echo "📁 Checking required files..."
echo ""

files=("manifest.json" "popup.html" "popup.js" "popup-styles.css" "content.js" "background.js" "styles.css" "icons/icon16.png" "icons/icon48.png" "icons/icon128.png")

all_present=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "✅ $file ($size)"
    else
        echo "❌ $file - MISSING!"
        all_present=false
    fi
done

echo ""

# Check manifest.json syntax
echo "🔍 Checking manifest.json syntax..."
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json is valid JSON"
else
    echo "❌ manifest.json has syntax errors"
    all_present=false
fi

echo ""

# Check JavaScript syntax
echo "🔍 Checking JavaScript syntax..."
for jsfile in popup.js content.js background.js; do
    if node -c "$jsfile" 2>/dev/null; then
        echo "✅ $jsfile syntax is valid"
    else
        echo "❌ $jsfile has syntax errors"
        all_present=false
    fi
done

echo ""
echo "===================================================="

if [ "$all_present" = true ]; then
    echo "✅ All files present and valid!"
    echo ""
    echo "🚀 Ready to load in Chrome!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Open Chrome and go to: chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top-right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select this folder: $PWD"
    echo "5. Extension should load successfully!"
    echo ""
    echo "📖 For troubleshooting, see: EXTENSION_TROUBLESHOOTING.md"
else
    echo "❌ Some files are missing or invalid"
    echo ""
    echo "Please fix the issues above before loading the extension."
fi

echo ""
