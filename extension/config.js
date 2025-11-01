/**
 * PhotoGear Price Tracker - Configuration
 * Centralized configuration for API URLs and settings
 */

// API Configuration
// IMPORTANT: Update these URLs when deploying to production
const CONFIG = {
  // Backend API URL - Change to your Vercel URL when deployed
  API_BASE_URL: 'http://localhost:3000/api',

  // Web app URL - For auth, dashboard, etc.
  WEB_BASE_URL: 'http://localhost:3000',

  // Demo mode - Shows sample data when backend is not available
  DEMO_MODE: true,

  // Extension settings
  VERSION: '1.0.0',
  NAME: 'PhotoGear Price Tracker'
};

// Sample data for demo mode
const DEMO_DATA = {
  bestDeals: [
    {
      id: 'demo-1',
      name: 'Canon EOS R5 Mirrorless Camera Body',
      brand: 'Canon',
      category: 'body',
      currentPrice: 2899.00,
      priceChange: -15.2,
      dealScore: 92,
      retailer: 'B&H Photo',
      condition: 'new',
      watcherCount: 847,
      avgRating: 4.8,
      reviewCount: 342
    },
    {
      id: 'demo-2',
      name: 'Sony A7 IV Mirrorless Camera',
      brand: 'Sony',
      category: 'body',
      currentPrice: 2298.00,
      priceChange: -8.5,
      dealScore: 85,
      retailer: 'Adorama',
      condition: 'new',
      watcherCount: 623,
      avgRating: 4.7,
      reviewCount: 289
    },
    {
      id: 'demo-3',
      name: 'Canon RF 24-70mm f/2.8L IS USM Lens',
      brand: 'Canon',
      category: 'lens',
      currentPrice: 2199.00,
      priceChange: -5.3,
      dealScore: 78,
      retailer: 'KEH Camera',
      condition: 'excellent',
      watcherCount: 412,
      avgRating: 4.9,
      reviewCount: 156
    }
  ],

  trackedItems: []
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, DEMO_DATA };
}
