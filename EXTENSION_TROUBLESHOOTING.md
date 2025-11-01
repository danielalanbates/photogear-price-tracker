# Chrome Extension - Troubleshooting Guide

## ✅ Extension Files Checklist

All required files are now present:
- ✅ `manifest.json` - Extension configuration
- ✅ `popup.html` - Popup UI
- ✅ `popup.js` - Popup functionality
- ✅ `popup-styles.css` - Popup styling
- ✅ `content.js` - Content script for injection
- ✅ `background.js` - Background service worker
- ✅ `styles.css` - Injected styles
- ✅ `icons/icon16.png` - 16x16 icon
- ✅ `icons/icon48.png` - 48x48 icon
- ✅ `icons/icon128.png` - 128x128 icon

---

## 🚀 How to Load the Extension

### Step 1: Open Chrome Extensions Page
1. Open Google Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode
1. Look for **"Developer mode"** toggle in the top-right corner
2. Click to enable it (should turn blue/on)

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button (top-left area)
2. Navigate to: `/Users/daniel/Documents/aicode/Price Tracker/extension`
3. Select the `extension` folder
4. Click **"Select"** or **"Open"**

### Step 4: Verify Installation
You should now see:
- 📸 **PhotoGear Price Tracker** card in the extensions list
- **Version**: 1.0.0
- Status: **Enabled** (toggle is on)
- The extension icon in your Chrome toolbar

---

## 🐛 Common Issues & Fixes

### Issue 1: "Failed to load extension"
**Error**: Manifest file is missing or invalid

**Fix**:
```bash
# Verify manifest exists and is valid
cat "/Users/daniel/Documents/aicode/Price Tracker/extension/manifest.json"
```

If file exists, it's valid JSON. ✅ (We've confirmed this)

---

### Issue 2: "Could not load icons"
**Error**: Icon files missing

**Fix**: Icons have been created! Verify with:
```bash
ls "/Users/daniel/Documents/aicode/Price Tracker/extension/icons/"
```

You should see:
- icon16.png
- icon48.png
- icon128.png

✅ All icons are present!

---

### Issue 3: Extension loads but icon doesn't appear in toolbar
**Fix**:
1. Go to `chrome://extensions/`
2. Find PhotoGear Price Tracker
3. Click the **pin icon** 📌 next to the extension
4. Icon should now appear in toolbar

---

### Issue 4: Popup doesn't open when clicking icon
**Fix**:
1. Right-click the extension icon
2. Select **"Inspect popup"**
3. Check Console tab for errors
4. Common errors:
   - **"Failed to load resource"** → Check file paths
   - **"Uncaught ReferenceError"** → Check popup.js

**Test popup manually**:
```bash
# Open test file in browser
open "/Users/daniel/Documents/aicode/Price Tracker/extension/test_popup.html"
```

---

### Issue 5: Service worker errors
**Error**: background.js failing to load

**Fix**:
1. Go to `chrome://extensions/`
2. Find PhotoGear Price Tracker
3. Click **"service worker"** link (under "Inspect views")
4. Check Console for errors

**Common fixes**:
- Clear service worker: Click "Clear" in DevTools
- Reload extension: Click reload icon on extension card

---

### Issue 6: Content script not injecting on pages
**Symptoms**: Visit B&H Photo product page, no widget appears

**Debug steps**:
1. Visit: https://www.bhphotovideo.com/c/product/1602398-REG/canon_eos_r5_mirrorless_digital.html
2. Open DevTools (F12 or Cmd+Option+I)
3. Check Console tab
4. Look for: "PhotoGear Price Tracker content script loaded"

**If not appearing**:
- Verify URL matches pattern in manifest.json
- Reload extension
- Hard refresh page (Cmd+Shift+R)

---

### Issue 7: "Manifest version 2 is deprecated"
**Status**: ✅ We're using Manifest V3 (the latest)

No action needed!

---

## 🧪 Testing the Extension

### Test 1: Extension Loads
```
✅ Extension appears in chrome://extensions/
✅ No errors shown
✅ Status: Enabled
```

### Test 2: Popup Opens
```
✅ Click extension icon
✅ Popup window appears
✅ Shows 3 tabs (Tracked Items, Best Deals, Settings)
```

### Test 3: Content Script Injection
```
✅ Visit B&H Photo product page
✅ Open DevTools Console
✅ See message: "PhotoGear Price Tracker content script loaded"
```

### Test 4: Background Worker
```
✅ Go to chrome://extensions/
✅ Click "service worker" under extension
✅ Console opens with no errors
```

---

## 📝 Manual Testing Steps

### Step 1: Test Popup UI
```bash
# Open test file in browser
open "/Users/daniel/Documents/aicode/Price Tracker/extension/test_popup.html"
```

Expected result: See popup UI in iframe

### Step 2: Test on Live Site
1. Go to: https://www.bhphotovideo.com/c/product/1602398-REG/canon_eos_r5_mirrorless_digital.html
2. Open DevTools (F12)
3. Check Console for messages

Expected console output:
```
PhotoGear Price Tracker content script loaded
Detected retailer: B&H Photo
```

### Step 3: Test Popup Functionality
1. Click extension icon in toolbar
2. Click on each tab (Tracked Items, Best Deals, Settings)
3. Check for JavaScript errors in DevTools

---

## 🔍 Debug Checklist

If extension still won't load, check:

- [ ] Chrome version is up to date (v88+)
- [ ] Developer mode is enabled
- [ ] Loading the correct folder (extension/, not parent)
- [ ] No other extension with same name installed
- [ ] All files present (see checklist at top)
- [ ] Icons exist (icons/ folder with 3 PNG files)
- [ ] No permission errors (files are readable)
- [ ] manifest.json is valid JSON

**Verify all files**:
```bash
cd "/Users/daniel/Documents/aicode/Price Tracker/extension"
ls -la

# Should show:
# manifest.json
# popup.html
# popup.js
# popup-styles.css
# content.js
# background.js
# styles.css
# icons/ (directory)
```

---

## 🆘 Still Having Issues?

### Get Detailed Error Messages

1. Open Chrome
2. Go to `chrome://extensions/`
3. Click "Errors" button on extension card (if visible)
4. Screenshot any error messages

### Check Service Worker Status

1. Go to `chrome://serviceworker-internals/`
2. Find PhotoGear Price Tracker
3. Check status and errors

### Enable Verbose Logging

1. Open Chrome with verbose logging:
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --enable-logging --v=1
```

2. Errors will be in: `~/Library/Application Support/Google/Chrome/chrome_debug.log`

---

## ✅ Quick Verification Script

Run this to verify everything is in place:

```bash
#!/bin/bash
cd "/Users/daniel/Documents/aicode/Price Tracker/extension"

echo "🔍 Checking extension files..."
echo ""

# Check required files
files=("manifest.json" "popup.html" "popup.js" "popup-styles.css" "content.js" "background.js" "styles.css" "icons/icon16.png" "icons/icon48.png" "icons/icon128.png")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING!"
    fi
done

echo ""
echo "🔍 Checking manifest.json syntax..."
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json is valid JSON"
else
    echo "❌ manifest.json has syntax errors"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next steps:"
echo "1. Open Chrome: chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select this folder: $PWD"
```

Save this as `verify.sh` and run: `bash verify.sh`

---

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ Extension appears in `chrome://extensions/` with no errors
2. ✅ Extension icon appears in Chrome toolbar
3. ✅ Clicking icon opens popup with 3 tabs
4. ✅ Console shows "PhotoGear Price Tracker content script loaded" on B&H pages
5. ✅ No errors in service worker console

---

## 📞 Need More Help?

Check these files:
- [README.md](./README.md) - Full documentation
- [QUICKSTART.md](./QUICKSTART.md) - Setup guide
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current status

---

**All extension files are now present and valid. The extension should load successfully!**

Try loading it now following the steps above. If you see any specific error messages, let me know and I'll help debug them.
