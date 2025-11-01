/**
 * PhotoGear Price Tracker - Content Script
 * Injects price comparison widget on retailer product pages
 */

(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:3000/api';

  // Retailer configurations
  const RETAILER_CONFIGS = {
    'bhphotovideo.com': {
      name: 'B&H Photo',
      selectors: {
        title: 'h1[data-selenium="productTitle"]',
        price: '[data-selenium="pricingPrice"]',
        sku: '[data-selenium="sku"]',
        stock: '[data-selenium="availabilityStatus"]',
        priceContainer: '.price-area_OUZO6'
      }
    },
    'adorama.com': {
      name: 'Adorama',
      selectors: {
        title: 'h1[itemprop="name"]',
        price: '.price',
        sku: '.item-code',
        stock: '.availability',
        priceContainer: '.product-price-section'
      }
    },
    'keh.com': {
      name: 'KEH Camera',
      selectors: {
        title: '.product-title',
        price: '.product-price',
        sku: '.product-sku',
        stock: '.stock-status',
        priceContainer: '.product-pricing'
      }
    },
    'mpb.com': {
      name: 'MPB',
      selectors: {
        title: 'h1.product-name',
        price: '.price-value',
        sku: '.product-sku',
        stock: '.availability',
        priceContainer: '.product-price-section'
      }
    }
  };

  /**
   * Detect current retailer
   */
  function detectRetailer() {
    const hostname = window.location.hostname.replace('www.', '');

    for (const [domain, config] of Object.entries(RETAILER_CONFIGS)) {
      if (hostname.includes(domain.replace('.com', ''))) {
        return { domain, ...config };
      }
    }

    return null;
  }

  /**
   * Extract product information from page
   */
  function extractProductInfo(retailer) {
    try {
      const selectors = retailer.selectors;

      const titleEl = document.querySelector(selectors.title);
      const priceEl = document.querySelector(selectors.price);
      const skuEl = document.querySelector(selectors.sku);
      const stockEl = document.querySelector(selectors.stock);

      if (!titleEl || !priceEl) {
        console.warn('Could not extract product info - missing elements');
        return null;
      }

      const title = titleEl.textContent.trim();
      const priceText = priceEl.textContent.trim();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const sku = skuEl ? skuEl.textContent.trim() : '';
      const inStock = stockEl ? !stockEl.textContent.toLowerCase().includes('out of stock') : true;

      return {
        title,
        price,
        sku,
        inStock,
        url: window.location.href,
        retailer: retailer.name
      };
    } catch (error) {
      console.error('Error extracting product info:', error);
      return null;
    }
  }

  /**
   * Fetch price comparison data from API
   */
  async function fetchPriceComparison(productInfo) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?q=${encodeURIComponent(productInfo.title)}&sku=${productInfo.sku}`);
      const data = await response.json();

      if (data.success && data.product) {
        return data.product;
      }

      return null;
    } catch (error) {
      console.error('Error fetching price comparison:', error);
      return null;
    }
  }

  /**
   * Create price comparison widget
   */
  function createPriceWidget(productData, currentRetailer) {
    const widget = document.createElement('div');
    widget.id = 'photogear-tracker-widget';
    widget.className = 'pgt-widget';

    // Sort prices by value
    const prices = productData.prices.sort((a, b) => a.price - b.price);

    // Find best deal
    const bestPrice = prices[0];
    const currentPrice = prices.find(p => p.retailer === currentRetailer.name);

    // Calculate deal score
    const dealScore = productData.dealScore || 0;
    const dealQuality = getDealQuality(dealScore);

    widget.innerHTML = `
      <div class="pgt-header">
        <div class="pgt-title">
          <span class="pgt-icon">📸</span>
          <span>PhotoGear Price Tracker</span>
        </div>
        <div class="pgt-deal-badge pgt-deal-${dealQuality.class}">
          ${dealQuality.label}
        </div>
      </div>

      <div class="pgt-content">
        <div class="pgt-current-deal">
          <div class="pgt-score">
            <div class="pgt-score-value">${dealScore}</div>
            <div class="pgt-score-label">Deal Score</div>
          </div>
          <div class="pgt-recommendation">
            ${dealQuality.recommendation}
          </div>
        </div>

        <div class="pgt-price-comparison">
          <h3>Price Comparison</h3>
          <div class="pgt-prices">
            ${prices.map(price => `
              <div class="pgt-price-row ${price.retailer === bestPrice.retailer ? 'pgt-best-deal' : ''} ${price.retailer === currentRetailer.name ? 'pgt-current-site' : ''}">
                <div class="pgt-retailer">
                  <span class="pgt-retailer-name">${price.retailer}</span>
                  ${price.condition ? `<span class="pgt-condition">${price.condition}</span>` : ''}
                  ${price.retailer === bestPrice.retailer ? '<span class="pgt-badge-best">Best Price!</span>' : ''}
                  ${price.retailer === currentRetailer.name ? '<span class="pgt-badge-current">You are here</span>' : ''}
                </div>
                <div class="pgt-price">
                  <span class="pgt-price-value">$${price.price.toFixed(2)}</span>
                  ${price.inStock ? '<span class="pgt-stock pgt-in-stock">In Stock</span>' : '<span class="pgt-stock pgt-out-of-stock">Out of Stock</span>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="pgt-savings">
          ${bestPrice.retailer !== currentRetailer.name && currentPrice ? `
            <p class="pgt-savings-text">
              💰 Save $${(currentPrice.price - bestPrice.price).toFixed(2)} (${(((currentPrice.price - bestPrice.price) / currentPrice.price) * 100).toFixed(1)}%) by buying from ${bestPrice.retailer}
            </p>
          ` : '<p class="pgt-savings-text">🎉 You\'re viewing the best price!</p>'}
        </div>

        <div class="pgt-community">
          <span>👥 ${productData.watcherCount || 0} photographers tracking this item</span>
          ${productData.rating ? `<span>⭐ ${productData.rating}/5 (${productData.reviewCount} reviews)</span>` : ''}
        </div>

        <div class="pgt-actions">
          <button class="pgt-btn pgt-btn-primary" id="pgt-track-btn">
            Track This Item
          </button>
          <button class="pgt-btn pgt-btn-secondary" id="pgt-view-chart-btn">
            View Price History
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    widget.querySelector('#pgt-track-btn').addEventListener('click', () => trackProduct(productData));
    widget.querySelector('#pgt-view-chart-btn').addEventListener('click', () => viewPriceHistory(productData));

    return widget;
  }

  /**
   * Get deal quality information
   */
  function getDealQuality(score) {
    if (score >= 85) {
      return {
        class: 'amazing',
        label: '🔥 AMAZING DEAL',
        recommendation: 'This is an exceptional price! Historical low detected.'
      };
    } else if (score >= 70) {
      return {
        class: 'great',
        label: '✅ Great Deal',
        recommendation: 'Excellent price - 20%+ below average. Good time to buy!'
      };
    } else if (score >= 50) {
      return {
        class: 'good',
        label: '👍 Good Deal',
        recommendation: 'Decent price - below average. Consider buying now.'
      };
    } else if (score >= 30) {
      return {
        class: 'fair',
        label: '😐 Fair Price',
        recommendation: 'Average price. May want to wait for a better deal.'
      };
    } else {
      return {
        class: 'poor',
        label: '❌ Overpriced',
        recommendation: 'Above average price. Wait for a price drop.'
      };
    }
  }

  /**
   * Track product
   */
  async function trackProduct(productData) {
    try {
      const result = await chrome.storage.local.get(['authToken', 'user']);

      if (!result.authToken) {
        window.open('https://photogeartracker.com/auth', '_blank');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.authToken}`
        },
        body: JSON.stringify({ productId: productData.id })
      });

      const data = await response.json();

      if (data.success) {
        showNotification('Product tracked!', 'We\'ll notify you when the price drops.');
      } else {
        showNotification('Error', data.message || 'Could not track product');
      }
    } catch (error) {
      console.error('Error tracking product:', error);
      showNotification('Error', 'Could not track product');
    }
  }

  /**
   * View price history
   */
  function viewPriceHistory(productData) {
    window.open(`https://photogeartracker.com/product/${productData.id}`, '_blank');
  }

  /**
   * Show notification
   */
  function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'pgt-notification';
    notification.innerHTML = `
      <div class="pgt-notification-content">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('pgt-notification-show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('pgt-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Inject widget into page
   */
  async function injectWidget() {
    // Detect retailer
    const retailer = detectRetailer();

    if (!retailer) {
      console.log('Not a supported retailer page');
      return;
    }

    console.log('Detected retailer:', retailer.name);

    // Extract product info
    const productInfo = extractProductInfo(retailer);

    if (!productInfo) {
      console.warn('Could not extract product information');
      return;
    }

    console.log('Extracted product info:', productInfo);

    // Fetch price comparison data
    const productData = await fetchPriceComparison(productInfo);

    if (!productData) {
      console.log('No price comparison data available');
      return;
    }

    // Create widget
    const widget = createPriceWidget(productData, retailer);

    // Find injection point
    const priceContainer = document.querySelector(retailer.selectors.priceContainer);

    if (priceContainer) {
      // Inject after price container
      priceContainer.insertAdjacentElement('afterend', widget);
      console.log('Widget injected successfully');
    } else {
      console.warn('Could not find price container for injection');
    }
  }

  /**
   * Inject styles
   */
  function injectStyles() {
    if (document.getElementById('pgt-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'pgt-styles';
    styles.textContent = `
      .pgt-widget {
        background: white;
        border: 2px solid #667eea;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      .pgt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .pgt-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
        color: #333;
      }

      .pgt-icon {
        font-size: 20px;
      }

      .pgt-deal-badge {
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .pgt-deal-amazing { background: #ff5722; color: white; }
      .pgt-deal-great { background: #4caf50; color: white; }
      .pgt-deal-good { background: #2196f3; color: white; }
      .pgt-deal-fair { background: #ff9800; color: white; }
      .pgt-deal-poor { background: #f44336; color: white; }

      .pgt-current-deal {
        display: flex;
        gap: 20px;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 6px;
        margin-bottom: 16px;
      }

      .pgt-score {
        text-align: center;
      }

      .pgt-score-value {
        font-size: 36px;
        font-weight: 700;
        color: #667eea;
      }

      .pgt-score-label {
        font-size: 12px;
        color: #666;
      }

      .pgt-recommendation {
        flex: 1;
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #333;
      }

      .pgt-price-comparison h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #333;
      }

      .pgt-prices {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .pgt-price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f9f9f9;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }

      .pgt-price-row.pgt-best-deal {
        border-color: #4caf50;
        background: #e8f5e9;
      }

      .pgt-price-row.pgt-current-site {
        border-color: #667eea;
        background: #e8eaf6;
      }

      .pgt-retailer {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pgt-retailer-name {
        font-weight: 600;
        color: #333;
      }

      .pgt-condition {
        font-size: 11px;
        color: #666;
        padding: 2px 6px;
        background: #e0e0e0;
        border-radius: 3px;
      }

      .pgt-badge-best, .pgt-badge-current {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 600;
      }

      .pgt-badge-best {
        background: #4caf50;
        color: white;
      }

      .pgt-badge-current {
        background: #667eea;
        color: white;
      }

      .pgt-price {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pgt-price-value {
        font-size: 18px;
        font-weight: 700;
        color: #333;
      }

      .pgt-stock {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .pgt-in-stock {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .pgt-out-of-stock {
        background: #ffebee;
        color: #c62828;
      }

      .pgt-savings {
        margin: 16px 0;
        padding: 12px;
        background: #fff3e0;
        border-radius: 6px;
        text-align: center;
      }

      .pgt-savings-text {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #e65100;
      }

      .pgt-community {
        display: flex;
        justify-content: space-around;
        padding: 12px 0;
        border-top: 1px solid #e0e0e0;
        border-bottom: 1px solid #e0e0e0;
        margin: 16px 0;
        font-size: 13px;
        color: #666;
      }

      .pgt-actions {
        display: flex;
        gap: 12px;
      }

      .pgt-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .pgt-btn-primary {
        background: #667eea;
        color: white;
      }

      .pgt-btn-primary:hover {
        background: #5568d3;
        transform: translateY(-1px);
      }

      .pgt-btn-secondary {
        background: white;
        color: #667eea;
        border: 2px solid #667eea;
      }

      .pgt-btn-secondary:hover {
        background: #f5f5f5;
      }

      .pgt-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #667eea;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s;
      }

      .pgt-notification-show {
        opacity: 1;
        transform: translateX(0);
      }

      .pgt-notification-content strong {
        display: block;
        margin-bottom: 4px;
        color: #333;
      }

      .pgt-notification-content p {
        margin: 0;
        font-size: 13px;
        color: #666;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Initialize content script
   */
  function init() {
    console.log('PhotoGear Price Tracker content script loaded');

    // Inject styles
    injectStyles();

    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectWidget);
    } else {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(injectWidget, 1000);
    }
  }

  // Start
  init();
})();
