# 🚀 Quick Start Guide - PhotoGear Price Tracker

Get up and running in 10 minutes!

---

## Prerequisites Check

Before starting, make sure you have:
- ✅ **Node.js 18+** - `node --version`
- ✅ **PostgreSQL 14+** - `psql --version`
- ✅ **Chrome Browser** - For testing the extension
- ✅ **npm** - Comes with Node.js

---

## 1. Backend Setup (5 minutes)

### Step 1.1: Navigate to Backend
```bash
cd backend
```

### Step 1.2: Run Automated Setup
```bash
./setup.sh
```

This script will:
- ✅ Install npm dependencies
- ✅ Create `.env` file from template
- ✅ Create PostgreSQL database
- ✅ Run database schema
- ✅ Seed sample products
- ✅ Test the B&H Photo scraper

**Follow the prompts!**

### Step 1.3: Edit .env File (If Needed)
```bash
nano .env
```

Minimum required settings:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/photogear_tracker
JWT_SECRET=your_random_secret_key_here
PORT=3000
```

### Step 1.4: Start Backend Server
```bash
npm run dev
```

You should see:
```
🚀 PhotoGear Price Tracker API running on port 3000
📸 Environment: development
```

**Leave this running!** Open a new terminal for next steps.

---

## 2. Test Backend API (1 minute)

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "uptime": 5.2,
  "environment": "development"
}
```

### Test API Documentation
Open in browser: http://localhost:3000/api

You should see the API documentation page.

---

## 3. Load Chrome Extension (2 minutes)

### Step 3.1: Open Chrome Extensions
1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)

### Step 3.2: Load Extension
1. Click **"Load unpacked"**
2. Navigate to your project folder
3. Select the `extension/` folder
4. Click **"Select Folder"**

### Step 3.3: Verify Installation
You should see:
- 📸 **PhotoGear Price Tracker** extension card
- Status: **Enabled**
- Version: **1.0.0**

The extension icon should appear in your Chrome toolbar!

---

## 4. Test the Extension (2 minutes)

### Step 4.1: Test Popup
1. Click the extension icon in Chrome toolbar
2. You should see the popup with 3 tabs:
   - Tracked Items
   - Best Deals
   - Settings

### Step 4.2: Test on B&H Photo
1. Open this URL in Chrome:
   ```
   https://www.bhphotovideo.com/c/product/1602398-REG/canon_eos_r5_mirrorless_digital.html
   ```

2. The extension should inject a price comparison widget (may show "No data" initially - that's OK!)

### Step 4.3: Check Console
1. Open DevTools (F12)
2. Check Console tab
3. You should see:
   ```
   PhotoGear Price Tracker content script loaded
   Detected retailer: B&H Photo
   ```

---

## 5. Create Your First User (Optional)

### Register via API
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

You'll get back:
```json
{
  "success": true,
  "user": { "id": "...", "email": "test@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token!** You'll need it for authenticated requests.

---

## 6. Test Scraper (Optional)

### Scrape a B&H Photo Product
```bash
cd backend
node scrapers/bhphoto.js
```

This will:
1. Launch headless Chrome
2. Navigate to sample product pages
3. Extract product data
4. Display results in console

Expected output:
```
🧪 Testing B&H Photo scraper...
Scraping B&H product: https://...
Successfully scraped: Canon EOS R5 $3,899.00
---
Scraped data: {
  "title": "Canon EOS R5 Mirrorless Camera Body",
  "price": 3899,
  "sku": "...",
  "inStock": true,
  ...
}
✅ Test complete
```

---

## 7. Verify Database (Optional)

### Connect to Database
```bash
psql photogear_tracker
```

### View Sample Data
```sql
-- View products
SELECT name, brand FROM products LIMIT 5;

-- View latest prices
SELECT p.name, pr.retailer, pr.price, pr.scraped_at
FROM products p
JOIN prices pr ON pr.product_id = p.id
ORDER BY pr.scraped_at DESC
LIMIT 10;

-- Exit
\q
```

---

## 🎉 You're All Set!

### What You Have Now:
✅ Backend API running on http://localhost:3000
✅ PostgreSQL database with schema
✅ Chrome extension loaded and active
✅ B&H Photo scraper working
✅ Deal scoring algorithm implemented

### Next Steps:

#### Immediate (Today)
1. **Test the full flow:**
   - Visit B&H product page
   - Click extension icon
   - Try tracking an item

2. **Read the documentation:**
   - [README.md](./README.md) - Full documentation
   - [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current status & roadmap

#### This Week
3. **Build remaining scrapers:**
   - Adorama: `backend/scrapers/adorama.js`
   - KEH Camera: `backend/scrapers/keh.js`
   - MPB: `backend/scrapers/mpb.js`

4. **Implement cron jobs:**
   - Price updater: `backend/jobs/priceUpdater.js`
   - Alert sender: `backend/jobs/alertSender.js`

5. **Set up email alerts:**
   - Configure Gmail App Password
   - Create email templates

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Use different port
echo "PORT=3001" >> backend/.env
```

### Database connection error
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL (macOS)
brew services start postgresql@14

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### Extension not showing widget
1. Check DevTools Console for errors
2. Verify you're on a supported site (B&H Photo)
3. Reload extension: `chrome://extensions/` → Click reload
4. Hard refresh page: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

### Scraper failing
```bash
# Install Chromium dependencies (Linux only)
sudo apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1
```

---

## 📚 Important Files

| File | Purpose |
|------|---------|
| `README.md` | Complete documentation |
| `PROJECT_STATUS.md` | Current status & roadmap |
| `backend/.env` | Configuration |
| `backend/api/server.js` | API entry point |
| `extension/manifest.json` | Extension config |
| `extension/content.js` | Inject widget on pages |
| `backend/scrapers/bhphoto.js` | B&H Photo scraper |

---

## 🆘 Need Help?

1. **Check logs:**
   ```bash
   # Backend logs
   tail -f backend/combined.log
   tail -f backend/error.log

   # Chrome extension logs
   # Open: chrome://extensions/ → Details → Inspect views
   ```

2. **Read troubleshooting:**
   - See README.md "Troubleshooting" section

3. **Database issues:**
   ```bash
   # Recreate database
   dropdb photogear_tracker
   createdb photogear_tracker
   psql photogear_tracker < backend/database/schema.sql
   ```

---

## ✅ Success Checklist

Mark these off as you complete them:

- [ ] Backend API running and accessible
- [ ] Database created with sample data
- [ ] Chrome extension loaded in browser
- [ ] Extension popup opens when clicked
- [ ] Widget appears on B&H Photo pages
- [ ] B&H scraper test runs successfully
- [ ] Can register a user via API
- [ ] Can query products via API

---

**Time to complete:** ~10 minutes
**Difficulty:** ⭐⭐☆☆☆ (Easy with the setup script)

Happy coding! 🚀📸
