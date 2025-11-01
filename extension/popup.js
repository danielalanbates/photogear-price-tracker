/**
 * PhotoGear Price Tracker - Popup JavaScript
 * Handles the extension popup UI and interactions
 */

// Use configuration from config.js
const API_BASE_URL = CONFIG.API_BASE_URL;
const WEB_BASE_URL = CONFIG.WEB_BASE_URL;
const DEMO_MODE = CONFIG.DEMO_MODE;

// State management
let currentUser = null;
let trackedItems = [];
let bestDeals = [];

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('PhotoGear Price Tracker popup loaded');

  // Initialize tabs
  initializeTabs();

  // Load user data
  await loadUserData();

  // Load tracked items
  await loadTrackedItems();

  // Load best deals
  await loadBestDeals();

  // Initialize settings
  loadSettings();

  // Attach event listeners
  attachEventListeners();
});

/**
 * Initialize tab switching functionality
 */
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding content
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

/**
 * Load user data from storage
 */
async function loadUserData() {
  try {
    const result = await chrome.storage.local.get(['user', 'authToken']);

    if (result.user && result.authToken) {
      currentUser = result.user;
      document.getElementById('user-email').textContent = result.user.email;
      document.getElementById('sign-in-btn').textContent = 'Sign Out';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

/**
 * Load tracked items from storage and API
 */
async function loadTrackedItems() {
  try {
    // First, load from local storage for instant display
    const result = await chrome.storage.local.get(['trackedItems']);

    if (result.trackedItems && result.trackedItems.length > 0) {
      trackedItems = result.trackedItems;
      renderTrackedItems();
    }

    // Then, fetch latest data from API
    if (currentUser) {
      const response = await fetchAPI('/products/tracked');
      if (response.success) {
        trackedItems = response.data;

        // Update local storage
        await chrome.storage.local.set({ trackedItems });

        renderTrackedItems();
      }
    }
  } catch (error) {
    console.error('Error loading tracked items:', error);
  }
}

/**
 * Load best deals from API or demo data
 */
async function loadBestDeals() {
  try {
    const dealsListEl = document.getElementById('deals-list');
    dealsListEl.innerHTML = '<div class="loading">Loading deals...</div>';

    // Try API first
    const response = await fetchAPI('/products/best-deals');

    if (response.success && response.data && response.data.length > 0) {
      bestDeals = response.data;
      renderBestDeals();
    } else if (DEMO_MODE) {
      // Use demo data if API fails or returns empty
      console.log('Using demo data for best deals');
      bestDeals = DEMO_DATA.bestDeals;
      renderBestDeals();

      // Show demo mode indicator
      const header = document.querySelector('.section-header h2');
      if (header && header.textContent.includes('Best Deals')) {
        header.innerHTML = '🔥 Best Deals Today <span style="font-size: 11px; color: #999; font-weight: normal;">(Demo Mode)</span>';
      }
    } else {
      dealsListEl.innerHTML = '<div class="empty-state"><p>Unable to load deals. Start the backend server to see real data.</p></div>';
    }
  } catch (error) {
    console.error('Error loading best deals:', error);

    if (DEMO_MODE) {
      // Fallback to demo data on error
      bestDeals = DEMO_DATA.bestDeals;
      renderBestDeals();
    } else {
      document.getElementById('deals-list').innerHTML =
        '<div class="empty-state"><p>Backend server not running. Start with: npm run dev</p></div>';
    }
  }
}

/**
 * Render tracked items in the UI
 */
function renderTrackedItems() {
  const trackedListEl = document.getElementById('tracked-list');
  const trackedCountEl = document.getElementById('tracked-count');

  if (trackedItems.length === 0) {
    trackedListEl.innerHTML = `
      <div class="empty-state">
        <p>No tracked items yet</p>
        <p class="hint">Visit B&H, Adorama, KEH, or MPB and click "Track This Item"</p>
      </div>
    `;
    trackedCountEl.textContent = '0';
    return;
  }

  trackedCountEl.textContent = trackedItems.length;

  trackedListEl.innerHTML = trackedItems.map(item => `
    <div class="item-card" data-product-id="${item.id}">
      <div class="item-title">${item.name}</div>
      <div class="item-prices">
        <div class="current-price">$${item.currentPrice.toFixed(2)}</div>
        ${renderPriceChange(item.priceChange)}
      </div>
      ${renderDealScore(item.dealScore)}
      <div class="item-retailers">
        Available at: ${item.retailers.join(', ')}
      </div>
      <button class="btn-primary" onclick="viewProductDetails('${item.id}')">
        View Details
      </button>
    </div>
  `).join('');
}

/**
 * Render best deals in the UI
 */
function renderBestDeals() {
  const dealsListEl = document.getElementById('deals-list');

  if (bestDeals.length === 0) {
    dealsListEl.innerHTML = `
      <div class="empty-state">
        <p>No deals available right now</p>
        <p class="hint">Check back later for amazing photography gear deals!</p>
      </div>
    `;
    return;
  }

  dealsListEl.innerHTML = bestDeals.map(deal => `
    <div class="item-card" data-product-id="${deal.id}">
      <div class="item-title">${deal.name}</div>
      <div class="item-prices">
        <div class="current-price">$${deal.currentPrice.toFixed(2)}</div>
        ${renderPriceChange(deal.priceChange)}
      </div>
      ${renderDealScore(deal.dealScore)}
      <div class="item-retailers">
        ${deal.retailer} - ${deal.condition}
      </div>
      <button class="btn-primary" onclick="trackProduct('${deal.id}')">
        Track This Item
      </button>
    </div>
  `).join('');
}

/**
 * Render price change indicator
 */
function renderPriceChange(change) {
  if (!change || change === 0) return '';

  const className = change < 0 ? 'down' : 'up';
  const symbol = change < 0 ? '▼' : '▲';
  const percentage = Math.abs(change).toFixed(1);

  return `<div class="price-change ${className}">${symbol} ${percentage}%</div>`;
}

/**
 * Render deal score badge
 */
function renderDealScore(score) {
  if (!score) return '';

  let badgeClass = 'fair';
  let badgeText = 'Fair Price';

  if (score >= 85) {
    badgeClass = 'amazing';
    badgeText = '🔥 AMAZING DEAL';
  } else if (score >= 70) {
    badgeClass = 'great';
    badgeText = '✅ Great Deal';
  } else if (score >= 50) {
    badgeClass = 'good';
    badgeText = '👍 Good Deal';
  }

  return `
    <div class="deal-score">
      <div class="deal-badge ${badgeClass}">${badgeText}</div>
      <span style="font-size: 12px; color: #666;">Score: ${score}/100</span>
    </div>
  `;
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'enableNotifications',
      'enableEmail',
      'alertFrequency',
      'dealThreshold'
    ]);

    document.getElementById('enable-notifications').checked = result.enableNotifications !== false;
    document.getElementById('enable-email').checked = result.enableEmail !== false;
    document.getElementById('alert-frequency').value = result.alertFrequency || 'instant';
    document.getElementById('deal-threshold').value = result.dealThreshold || 'good';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      enableNotifications: document.getElementById('enable-notifications').checked,
      enableEmail: document.getElementById('enable-email').checked,
      alertFrequency: document.getElementById('alert-frequency').value,
      dealThreshold: document.getElementById('deal-threshold').value
    };

    await chrome.storage.local.set(settings);

    // Sync with API if user is logged in
    if (currentUser) {
      await fetchAPI('/users/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners() {
  // Sign in/out button
  document.getElementById('sign-in-btn').addEventListener('click', handleSignInOut);

  // Settings changes
  document.getElementById('enable-notifications').addEventListener('change', saveSettings);
  document.getElementById('enable-email').addEventListener('change', saveSettings);
  document.getElementById('alert-frequency').addEventListener('change', saveSettings);
  document.getElementById('deal-threshold').addEventListener('change', saveSettings);

  // Upgrade button
  document.getElementById('upgrade-btn').addEventListener('click', () => {
    alert('Premium features coming soon!\n\nFor now, enjoy unlimited tracking during beta.\n\nPremium features will include:\n- Advanced price predictions\n- Priority alerts\n- Portfolio tracking\n- And more!');
    // chrome.tabs.create({ url: `${WEB_BASE_URL}/upgrade` });
  });

  // View dashboard button
  document.getElementById('view-dashboard').addEventListener('click', () => {
    alert('Web dashboard coming soon!\n\nFor now, use the extension popup to:\n- View tracked items\n- See best deals\n- Manage settings');
    // chrome.tabs.create({ url: `${WEB_BASE_URL}/dashboard` });
  });
}

/**
 * Handle sign in/out
 */
async function handleSignInOut() {
  if (currentUser) {
    // Sign out
    await chrome.storage.local.remove(['user', 'authToken', 'trackedItems']);
    currentUser = null;
    document.getElementById('user-email').textContent = 'Not signed in';
    document.getElementById('sign-in-btn').textContent = 'Sign In';
    trackedItems = [];
    renderTrackedItems();
  } else {
    // Sign in - open auth page (create a simple login page)
    alert('Authentication system coming soon! For now, the extension works without login.\n\nTo enable full features:\n1. Start the backend: npm run dev\n2. Register via API or wait for web UI');
    // chrome.tabs.create({ url: `${WEB_BASE_URL}/auth` });
  }
}

/**
 * Track a product
 */
async function trackProduct(productId) {
  try {
    if (!currentUser) {
      alert('Sign in to track products!\n\nFor now during beta, tracking works without authentication.');
      // Continue anyway for beta testing
      // chrome.tabs.create({ url: `${WEB_BASE_URL}/auth` });
      // return;
    }

    const response = await fetchAPI('/products/track', {
      method: 'POST',
      body: JSON.stringify({ productId })
    });

    if (response.success) {
      // Reload tracked items
      await loadTrackedItems();

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Product Tracked!',
        message: 'We\'ll notify you when the price drops.'
      });
    }
  } catch (error) {
    console.error('Error tracking product:', error);
  }
}

/**
 * View product details
 */
function viewProductDetails(productId) {
  alert('Product details page coming soon!\n\nFor now, view prices directly on retailer sites.');
  // chrome.tabs.create({ url: `${WEB_BASE_URL}/product/${productId}` });
}

/**
 * Utility function to make API calls
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const result = await chrome.storage.local.get(['authToken']);

    const headers = {
      'Content-Type': 'application/json',
      ...(result.authToken && { 'Authorization': `Bearer ${result.authToken}` })
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return { success: false, error: error.message };
  }
}

// Make functions available globally for onclick handlers
window.trackProduct = trackProduct;
window.viewProductDetails = viewProductDetails;
