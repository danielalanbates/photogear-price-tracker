/**
 * PhotoGear Price Tracker - Background Service Worker
 * Handles background tasks, API calls, and notifications
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PhotoGear Price Tracker installed:', details.reason);

  if (details.reason === 'install') {
    // First time install
    chrome.storage.local.set({
      enableNotifications: true,
      enableEmail: true,
      alertFrequency: 'instant',
      dealThreshold: 'good',
      trackedItems: []
    });

    // Open welcome page
    chrome.tabs.create({ url: 'https://photogeartracker.com/welcome' });
  }

  // Set up periodic price check alarm
  chrome.alarms.create('checkPrices', {
    periodInMinutes: 60 // Check every hour
  });
});

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkPrices') {
    checkTrackedPrices();
  }
});

/**
 * Check prices for all tracked items
 */
async function checkTrackedPrices() {
  try {
    console.log('Checking tracked prices...');

    const result = await chrome.storage.local.get(['authToken', 'trackedItems', 'enableNotifications']);

    if (!result.authToken || !result.trackedItems || result.trackedItems.length === 0) {
      console.log('No tracked items to check');
      return;
    }

    // Fetch latest prices from API
    const response = await fetch(`${API_BASE_URL}/products/tracked`, {
      headers: {
        'Authorization': `Bearer ${result.authToken}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch tracked prices:', data.message);
      return;
    }

    // Compare with stored prices and send notifications
    const oldPrices = new Map(result.trackedItems.map(item => [item.id, item.currentPrice]));
    const newItems = data.data;

    for (const item of newItems) {
      const oldPrice = oldPrices.get(item.id);

      if (oldPrice && item.currentPrice < oldPrice) {
        // Price dropped!
        const priceDropPercent = ((oldPrice - item.currentPrice) / oldPrice * 100).toFixed(1);

        if (result.enableNotifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: '🎯 Price Drop Alert!',
            message: `${item.name}\nWas: $${oldPrice.toFixed(2)} → Now: $${item.currentPrice.toFixed(2)} (${priceDropPercent}% off)`,
            buttons: [
              { title: 'View Deal' }
            ],
            requireInteraction: true
          }, (notificationId) => {
            // Store product ID for notification click handler
            chrome.storage.local.set({ [`notification_${notificationId}`]: item.id });
          });
        }

        // Play notification sound
        playNotificationSound();
      }
    }

    // Update stored tracked items
    await chrome.storage.local.set({ trackedItems: newItems });

    console.log('Price check complete');
  } catch (error) {
    console.error('Error checking tracked prices:', error);
  }
}

/**
 * Handle notification clicks
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const result = await chrome.storage.local.get([`notification_${notificationId}`]);
  const productId = result[`notification_${notificationId}`];

  if (productId) {
    chrome.tabs.create({ url: `https://photogeartracker.com/product/${productId}` });
  }

  chrome.notifications.clear(notificationId);
});

/**
 * Handle notification button clicks
 */
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // View Deal button
    const result = await chrome.storage.local.get([`notification_${notificationId}`]);
    const productId = result[`notification_${notificationId}`];

    if (productId) {
      chrome.tabs.create({ url: `https://photogeartracker.com/product/${productId}` });
    }
  }

  chrome.notifications.clear(notificationId);
});

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  switch (request.action) {
    case 'trackProduct':
      trackProduct(request.productId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Required for async response

    case 'untrackProduct':
      untrackProduct(request.productId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'fetchPrices':
      fetchPrices(request.productId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'checkPricesNow':
      checkTrackedPrices()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Track a product
 */
async function trackProduct(productId) {
  try {
    const result = await chrome.storage.local.get(['authToken', 'user']);

    if (!result.authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/products/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.authToken}`
      },
      body: JSON.stringify({ productId })
    });

    const data = await response.json();

    if (data.success) {
      // Update local storage
      const trackedItems = await chrome.storage.local.get(['trackedItems']);
      const items = trackedItems.trackedItems || [];

      if (!items.find(item => item.id === productId)) {
        items.push(data.product);
        await chrome.storage.local.set({ trackedItems: items });
      }
    }

    return data;
  } catch (error) {
    console.error('Error tracking product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Untrack a product
 */
async function untrackProduct(productId) {
  try {
    const result = await chrome.storage.local.get(['authToken']);

    if (!result.authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/products/untrack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.authToken}`
      },
      body: JSON.stringify({ productId })
    });

    const data = await response.json();

    if (data.success) {
      // Update local storage
      const trackedItems = await chrome.storage.local.get(['trackedItems']);
      const items = (trackedItems.trackedItems || []).filter(item => item.id !== productId);
      await chrome.storage.local.set({ trackedItems: items });
    }

    return data;
  } catch (error) {
    console.error('Error untracking product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch current prices for a product
 */
async function fetchPrices(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/prices`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching prices:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    // Create an audio context and play a short beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Badge management - show number of tracked items
 */
async function updateBadge() {
  try {
    const result = await chrome.storage.local.get(['trackedItems']);
    const count = (result.trackedItems || []).length;

    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Update badge on storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.trackedItems) {
    updateBadge();
  }
});

// Initialize badge on startup
updateBadge();

console.log('PhotoGear Price Tracker background service worker loaded');
