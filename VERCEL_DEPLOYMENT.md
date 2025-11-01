# Deploying to Vercel - Quick Guide

## Overview

Vercel is perfect for deploying the backend API. It provides:
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Environment variables
- ✅ PostgreSQL database (via Vercel Postgres)
- ✅ Easy deployment from GitHub

---

## Prerequisites

- Vercel account (free): https://vercel.com/signup
- GitHub account (to push your code)
- PostgreSQL database (Vercel Postgres or external)

---

## Option 1: Deploy Backend to Vercel (Recommended)

### Step 1: Prepare Backend for Vercel

Create `vercel.json` in backend folder:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/server.js"
    },
    {
      "src": "/health",
      "dest": "api/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 2: Update package.json

Add this to `backend/package.json`:

```json
{
  "scripts": {
    "start": "node api/server.js",
    "dev": "nodemon api/server.js",
    "vercel-build": "echo 'Build complete'"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### Step 3: Push to GitHub

```bash
cd "/Users/daniel/Documents/aicode/Price Tracker"

# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - PhotoGear Price Tracker"

# Create GitHub repo and push
# (Follow GitHub instructions to create new repo)
git remote add origin https://github.com/yourusername/photogear-tracker.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Vercel

**Via Vercel Dashboard** (Easiest):

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repo
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Add Environment Variables (see below)
6. Click "Deploy"

**Via Vercel CLI**:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from backend folder
cd backend
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? Your account
# - Link to existing project? N
# - Project name? photogear-tracker-api
# - Directory? ./
# - Override settings? N
```

### Step 5: Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=production
PORT=3000
CORS_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

**Note**: Get your Chrome extension ID from `chrome://extensions/`

### Step 6: Set Up Database

**Option A: Vercel Postgres** (Easiest):

1. In Vercel Dashboard → Your Project → Storage
2. Click "Create Database"
3. Select "Postgres"
4. Follow setup
5. Copy DATABASE_URL to environment variables
6. Run schema manually via Vercel Postgres dashboard

**Option B: External PostgreSQL** (Recommended for production):

Use services like:
- Neon (https://neon.tech) - Free tier, serverless Postgres
- Supabase (https://supabase.com) - Free tier, includes auth
- Railway (https://railway.app) - PostgreSQL hosting

### Step 7: Update Extension

Edit `extension/config.js`:

```javascript
const CONFIG = {
  // Replace with your Vercel URL
  API_BASE_URL: 'https://photogear-tracker-api.vercel.app/api',
  WEB_BASE_URL: 'https://photogear-tracker-api.vercel.app',

  // Turn off demo mode for production
  DEMO_MODE: false,

  VERSION: '1.0.0',
  NAME: 'PhotoGear Price Tracker'
};
```

Then reload extension in Chrome!

---

## Option 2: Deploy Full Stack (Backend + Frontend)

If you want to deploy web dashboard too:

### Project Structure:

```
photogear-tracker/
├── backend/          # API (Vercel Function)
└── frontend/         # Web dashboard (Vercel Static)
```

### Deploy Both:

1. Push both to GitHub
2. Create 2 Vercel projects:
   - `photogear-api` (root: `/backend`)
   - `photogear-web` (root: `/frontend`)
3. Link them via environment variables

---

## Testing Your Deployment

### Test 1: Health Check

```bash
curl https://your-app.vercel.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "uptime": 123.45,
  "environment": "production"
}
```

### Test 2: API Endpoints

```bash
# Test product search
curl https://your-app.vercel.app/api/products/search?q=canon

# Test best deals
curl https://your-app.vercel.app/api/products/best-deals
```

### Test 3: Extension Connection

1. Update `extension/config.js` with your Vercel URL
2. Reload extension
3. Click "Best Deals"
4. Should load real data (not demo) ✅

---

## CORS Configuration

**Important**: Vercel needs proper CORS setup for Chrome extension!

In `backend/api/server.js`:

```javascript
app.use(cors({
  origin: [
    'chrome-extension://YOUR_EXTENSION_ID',
    'https://photogear-tracker.vercel.app' // Your web dashboard
  ],
  credentials: true
}));
```

**Get Extension ID**:
1. Go to `chrome://extensions/`
2. Find PhotoGear Price Tracker
3. Copy the ID (e.g., `abcdefghijklmnop`)
4. Add to CORS_ORIGINS environment variable

---

## Common Issues & Fixes

### Issue 1: "Database connection failed"

**Fix**: Check DATABASE_URL in Vercel environment variables

```bash
# Test connection locally
psql $DATABASE_URL -c "SELECT 1"
```

### Issue 2: "CORS error in extension"

**Fix**: Add extension ID to CORS origins

```javascript
// backend/api/server.js
const allowedOrigins = [
  'chrome-extension://YOUR_EXTENSION_ID',
  process.env.WEB_BASE_URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Issue 3: "Function timeout"

**Fix**: Vercel free tier has 10s timeout. Optimize:
- Add database indexes
- Cache expensive queries
- Use background jobs for scraping (not Vercel Functions)

### Issue 4: "Cold starts"

**Fix**: Vercel Functions sleep after inactivity
- Keep-alive service (ping every 5 minutes)
- Upgrade to Pro plan ($20/month) for instant wake

---

## Monitoring Your Deployment

### Vercel Dashboard

- View logs: Deployments → Your deployment → Function Logs
- Monitor performance: Analytics tab
- Check errors: Errors tab

### Set Up Alerts

In Vercel Dashboard:
1. Settings → Integrations
2. Add Slack/Discord for deployment notifications
3. Enable error alerting

---

## Cost Estimate

### Free Tier Limits:

- **Bandwidth**: 100 GB/month
- **Function Invocations**: 100k/month
- **Function Execution**: 100 hours/month
- **Build Time**: 6,000 minutes/month

**Estimate for 1,000 users**:
- API calls: ~50k/month (well within free tier)
- Bandwidth: ~10 GB/month (free tier OK)
- **Cost**: $0/month ✅

### When to Upgrade ($20/month):

- 10k+ users
- Need faster cold starts
- Want custom domains
- Need more build minutes

---

## Security Checklist

Before going live:

- [ ] Strong JWT_SECRET (32+ random characters)
- [ ] Environment variables set in Vercel (not in code)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] HTTPS only (Vercel does this automatically)
- [ ] Database credentials secure
- [ ] No sensitive data in git history
- [ ] .gitignore includes .env files

---

## Alternative: Railway.app

If Vercel doesn't work for you, try Railway:

**Pros**:
- Better for long-running processes
- Built-in PostgreSQL
- Simpler for Node.js apps
- No cold starts

**Cons**:
- More expensive ($5/month minimum)
- Less generous free tier

**Deploy to Railway**:

```bash
npm install -g railway

railway login

cd backend
railway init
railway up
```

---

## Next Steps After Deployment

1. ✅ Backend deployed to Vercel
2. ✅ Extension updated with Vercel URL
3. ✅ CORS configured
4. ✅ Database running
5. ✅ Environment variables set

**Now you can**:
- Test extension with real API
- Start scraping products
- Build auth UI
- Launch beta
- Submit to Chrome Web Store

---

## Quick Reference

```bash
# Deploy updates
cd backend
vercel --prod

# View logs
vercel logs

# Check environment variables
vercel env ls

# Add environment variable
vercel env add DATABASE_URL

# Open project in browser
vercel open
```

---

**Your Vercel URL will be**: `https://photogear-tracker-api.vercel.app`

Update this in `extension/config.js` and you're good to go! 🚀
