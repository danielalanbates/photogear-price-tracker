# 📸 PhotoGear Price Tracker

**Never overpay for photography gear again!** Track prices across B&H Photo, Adorama, KEH Camera, MPB, and more with intelligent deal scoring and price predictions.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Features

### Core Features
- **Multi-Retailer Price Tracking** - Compare prices across B&H, Adorama, KEH, MPB, and eBay
- **Intelligent Deal Scoring** - AI-powered scoring system (0-100) tells you if it's a good deal
- **Price History Charts** - View 90-day price trends for any product
- **Instant Price Alerts** - Get notified via email and browser when prices drop
- **New vs Used Comparison** - Compare new and used prices with warranty information
- **Community Insights** - See what other photographers are tracking

### Smart Features
- **Buy Now vs Wait** - Get recommendations based on historical trends
- **Historical Low Detection** - Know when you're seeing the best price in months
- **Deal Quality Labels** - Amazing, Great, Good, Fair, Poor ratings
- **Out of Stock Alerts** - Get notified when items come back in stock

---

## 🚀 Quick Start

### For Users (Chrome Extension)

1. **Install Extension**
   ```
   Coming soon to Chrome Web Store
   ```

2. **Browse Supported Retailers**
   - Visit any product page on B&H Photo, Adorama, KEH, or MPB
   - See price comparison widget automatically injected
   - Click "Track This Item" to add to watchlist

3. **Set Price Alerts**
   - Set target prices for tracked items
   - Get instant notifications when prices drop

### For Developers

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

#### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd "Price Tracker"
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb photogear_tracker

   # Run schema
   psql photogear_tracker < database/schema.sql
   ```

4. **Environment Configuration**
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit .env with your configuration
   nano .env
   ```

   Required environment variables:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/photogear_tracker
   JWT_SECRET=your_secret_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   ```

5. **Start Backend Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

   Server runs on `http://localhost:3000`

6. **Load Chrome Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder
   - Extension is now active!

---

## 📁 Project Structure

```
Price Tracker/
├── extension/              # Chrome extension files
│   ├── manifest.json      # Extension manifest
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   ├── popup-styles.css   # Popup styles
│   ├── content.js         # Content script (inject widget)
│   ├── background.js      # Background service worker
│   └── styles.css         # Injected styles
│
├── backend/               # Backend API and scrapers
│   ├── api/
│   │   ├── server.js      # Express server
│   │   ├── routes/
│   │   │   ├── products.js  # Product endpoints
│   │   │   ├── users.js     # User management
│   │   │   └── alerts.js    # Alert management
│   │   └── middleware/
│   │       └── auth.js      # JWT authentication
│   │
│   ├── scrapers/
│   │   ├── bhphoto.js      # B&H Photo scraper
│   │   ├── adorama.js      # Adorama scraper (TODO)
│   │   ├── keh.js          # KEH Camera scraper (TODO)
│   │   └── mpb.js          # MPB scraper (TODO)
│   │
│   ├── analysis/
│   │   └── dealScorer.js   # Deal quality algorithm
│   │
│   ├── database/
│   │   ├── schema.sql      # Database schema
│   │   └── db.js           # Database connection
│   │
│   ├── jobs/               # Cron jobs (TODO)
│   │   ├── priceUpdater.js
│   │   └── alertSender.js
│   │
│   ├── package.json
│   └── .env.example
│
└── README.md              # This file
```

---

## 🔧 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Products

**Search Products**
```http
GET /api/products/search?q=canon&category=body&limit=20
```

**Get Product Details**
```http
GET /api/products/:id
```

**Get Price History**
```http
GET /api/products/:id/prices?days=90&retailer=bhphoto
```

**Get Tracked Products**
```http
GET /api/products/tracked
Authorization: Bearer <token>
```

**Get Best Deals**
```http
GET /api/products/best-deals?limit=20&min_score=70
```

**Track Product**
```http
POST /api/products/track
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "uuid",
  "targetPrice": 2999.99
}
```

#### Users

**Register**
```http
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Login**
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Get Profile**
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Update Settings**
```http
PUT /api/users/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "enableNotifications": true,
  "enableEmail": true,
  "alertFrequency": "instant",
  "dealThreshold": "good"
}
```

---

## 🤖 Web Scraping

### B&H Photo Scraper

The scraper uses Puppeteer with stealth plugin to avoid detection.

**Run Test Scraper**
```bash
cd backend
node scrapers/bhphoto.js
```

**Scrape Single Product**
```javascript
import { scrapeBHProduct, saveBHPrice } from './scrapers/bhphoto.js';

const url = 'https://www.bhphotovideo.com/c/product/1602398-REG/canon_eos_r5_mirrorless_digital.html';
const data = await scrapeBHProduct(url);
await saveBHPrice(data);
```

### Adding More Scrapers

Create new scraper in `backend/scrapers/retailer-name.js`:

```javascript
export async function scrapeRetailerProduct(productUrl) {
  // 1. Launch Puppeteer with stealth
  // 2. Navigate to product page
  // 3. Extract product data
  // 4. Return standardized format

  return {
    title: string,
    price: number,
    sku: string,
    inStock: boolean,
    condition: 'new' | 'used' | 'refurbished',
    brand: string,
    imageUrl: string,
    description: string,
    url: string,
    retailer: string
  };
}
```

---

## 📊 Deal Scoring Algorithm

The deal scoring system evaluates prices on a 0-100 scale:

### Scoring Factors

1. **Price Position (40 points)**
   - Lower in historical range = higher score
   - Formula: `(1 - (current - min) / (max - min)) * 40`

2. **vs Average Price (30 points)**
   - Below average = positive points
   - Above average = negative points
   - Formula: `((avg - current) / avg) * 100`

3. **Historical Low Bonus (20 points)**
   - At historical low = +20 points
   - Within 5% of low = +15 points

4. **Recent Trend (10 points)**
   - Below recent average = +10 points

5. **Penalties**
   - Out of stock = -20 points

### Quality Labels

- **🔥 Amazing (85-100)** - Historical low or exceptional price
- **✅ Great (70-84)** - 20%+ below average
- **👍 Good (50-69)** - Below average
- **😐 Fair (30-49)** - Around average
- **❌ Poor (0-29)** - Above average

### Example
```javascript
import { calculateDealScore } from './analysis/dealScorer.js';

const score = await calculateDealScore(productId, 'bhphoto');

console.log(score);
// {
//   score: 92,
//   quality: 'amazing',
//   recommendation: '🔥 AMAZING DEAL! Historical low detected.',
//   confidence: 0.87,
//   averagePrice: 3299.99,
//   minPrice: 2899.99,
//   maxPrice: 3899.99,
//   currentPrice: 2899.99
// }
```

---

## 🗃️ Database Schema

### Key Tables

**products** - Product catalog
```sql
id, name, brand, model, category, sku, description, image_url
```

**prices** - Historical price data
```sql
id, product_id, retailer, price, condition, in_stock, url, scraped_at
```

**tracked_products** - User watchlists
```sql
id, user_id, product_id, target_price, alert_enabled, last_price
```

**deal_scores** - Pre-calculated scores (cached for performance)
```sql
id, product_id, retailer, score, quality, recommendation, confidence
```

**users** - User accounts
```sql
id, email, password_hash, is_paid, subscription_tier
```

See `backend/database/schema.sql` for complete schema.

---

## 🔔 Price Alerts

### How It Works

1. **Cron Job** runs every hour checking tracked products
2. **Price Comparison** - Compare current price vs last known price
3. **Alert Triggers**
   - Price drops below target
   - Price drops by X%
   - Deal quality reaches threshold
   - Item back in stock
4. **Send Notifications**
   - Browser notification (Chrome API)
   - Email notification (nodemailer)

### Email Configuration

Use Gmail with App Password:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

Generate app password: https://myaccount.google.com/apppasswords

---

## 🚦 Development Workflow

### Running Locally

**Terminal 1: Backend**
```bash
cd backend
npm run dev  # Nodemon for auto-reload
```

**Terminal 2: Database**
```bash
psql photogear_tracker
```

**Terminal 3: Test Scrapers**
```bash
node backend/scrapers/bhphoto.js
```

### Testing the Extension

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click reload icon for PhotoGear Tracker
4. Test on supported retailer pages

### Database Maintenance

**Refresh materialized views**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_products;
```

**Recalculate all deal scores**
```bash
node backend/analysis/dealScorer.js
```

---

## 🎨 Customization

### Adding New Retailers

1. Create scraper in `backend/scrapers/retailer.js`
2. Add retailer config to `extension/content.js`
3. Update `extension/manifest.json` with new host permissions
4. Add retailer to database enum (if using enums)

### Changing Deal Score Weights

Edit `backend/analysis/dealScorer.js`:

```javascript
// Adjust scoring factors
const positionScore = (1 - pricePosition) * 40;  // Change 40
const avgScore = avgDifference * 100;            // Change multiplier
```

### Styling the Widget

Edit injected styles in `extension/content.js` (search for `.pgt-widget`)

---

## 🐛 Troubleshooting

### Extension Not Showing Widget

- Check if you're on a supported product page
- Open DevTools Console, look for errors
- Verify `content.js` is injecting properly
- Check retailer selectors haven't changed

### Scraper Failing

- Website HTML structure may have changed
- Update selectors in scraper file
- Check for Cloudflare or anti-bot measures
- Verify stealth plugin is working

### Database Connection Errors

- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check user permissions

### API Not Starting

- Port 3000 already in use? Change PORT in `.env`
- Missing dependencies? Run `npm install`
- Check logs in `backend/error.log`

---

## 📈 Roadmap

### Week 2 (In Progress)
- [ ] Adorama scraper
- [ ] KEH Camera scraper
- [ ] MPB scraper
- [ ] Cron job for automatic price updates

### Week 3
- [ ] Price prediction ML model
- [ ] Email alert system
- [ ] Community ratings and reviews
- [ ] Deal feed page

### Week 4
- [ ] Payment integration (Stripe)
- [ ] Premium features
- [ ] Chrome Web Store submission
- [ ] Landing page

### Future
- [ ] Mobile app (iOS/Android)
- [ ] Push notifications
- [ ] Barcode scanning
- [ ] Portfolio tracking
- [ ] Expand to music gear, PC components

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

## 📄 License

Proprietary License - see [LICENSE](../LICENSE) file for details.

This is NOT open source software. All rights reserved. For licensing inquiries, contact daniel@batesai.org

---

## 🙏 Acknowledgments

- Built following the [CATEGORY_PRICE_TRACKER_COMPLETE_PLAN.md](./CATEGORY_PRICE_TRACKER_COMPLETE_PLAN.md)
- Inspired by CamelCamelCamel and Honey
- Thanks to the photography community for feedback

---

## 📞 Support

- **Issues**: https://github.com/yourusername/photogear-tracker/issues
- **Email**: daniel@batesai.org
- **Discord**: https://discord.gg/photogear (coming soon)

---

**Built with ❤️ for photographers who want to save money on gear!**
