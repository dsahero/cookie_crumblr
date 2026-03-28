// Cookie Crumbler Popup Script
// Bridges React UI with browser extension APIs and backend

// Message types for communication with React
const MESSAGE_TYPES = {
  INIT_DATA: 'INIT_DATA',
  TOGGLE_PROTECTION: 'TOGGLE_PROTECTION',
  TOGGLE_BLOCK_HARMFUL: 'TOGGLE_BLOCK_HARMFUL',
  TOGGLE_CLIPBOARD: 'TOGGLE_CLIPBOARD',
  TOGGLE_COOKIE_ALLOWED: 'TOGGLE_COOKIE_ALLOWED',
  DELETE_COOKIE: 'DELETE_COOKIE',
  REFRESH_COOKIES: 'REFRESH_COOKIES',
  GET_COOKIE_STATS: 'GET_COOKIE_STATS',
  SCRAMBLE_COMPLETE: 'SCRAMBLE_COMPLETE',
  COOKIES_DATA: 'COOKIES_DATA'
};

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Cookie Crumbler popup.js loaded');
  
  // Set up message listener for React app
  window.addEventListener('message', handleReactMessage);
  
  // Initialize popup with current data
  initializePopup();
});

// Initialize popup with current cookie data
async function initializePopup() {
  try {
    console.log('Initializing popup...');
    
    // Get all cookies from browser
    const allCookies = await browser.cookies.getAll({});
    console.log(`Found ${allCookies.length} cookies`);
    
    // Classify cookies (using existing cookieManager.js logic)
    const classifiedCookies = await classifyAllCookies(allCookies);
    
    // Get current settings from storage
    const settings = await getSettings();
    
    // Calculate statistics
    const stats = calculateStats(classifiedCookies);
    
    // Send initial data to React app
    sendToReact({
      type: MESSAGE_TYPES.INIT_DATA,
      payload: {
        cookies: classifiedCookies,
        stats: stats,
        settings: settings
      }
    });
    
    console.log('Popup initialized with', stats);
    
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
}

// Handle messages from React app
async function handleReactMessage(event) {
  // Only process messages from our extension
  if (event.source !== window) return;
  
  const { type, payload } = event.data;
  
  console.log('📨 Received message from React:', type, payload);
  
  switch (type) {
    case MESSAGE_TYPES.TOGGLE_PROTECTION:
      console.log('🛡️ LISTENER TRIGGERED: Protection Toggle');
      await handleToggleProtection(payload.enabled);
      break;
      
    case MESSAGE_TYPES.TOGGLE_BLOCK_HARMFUL:
      console.log('🚫 LISTENER TRIGGERED: Block Harmful Cookies Toggle');
      await handleToggleBlockHarmful(payload.enabled);
      break;
      
    case MESSAGE_TYPES.TOGGLE_CLIPBOARD:
      console.log('📋 LISTENER TRIGGERED: Clipboard Protection Toggle');
      await handleToggleClipboard(payload.enabled);
      break;
      
    case MESSAGE_TYPES.TOGGLE_COOKIE_ALLOWED:
      console.log('🍪 LISTENER TRIGGERED: Cookie Allowed Toggle');
      await handleToggleCookieAllowed(payload.cookieName, payload.allowed);
      break;
      
    case MESSAGE_TYPES.DELETE_COOKIE:
      console.log('🗑️ LISTENER TRIGGERED: Delete Cookie');
      await handleDeleteCookie(payload.cookieName);
      break;
      
    case MESSAGE_TYPES.REFRESH_COOKIES:
      console.log('🔄 LISTENER TRIGGERED: Refresh Cookies');
      await initializePopup();
      break;
      
    case MESSAGE_TYPES.GET_COOKIE_STATS:
      console.log('📊 LISTENER TRIGGERED: Get Cookie Stats');
      await sendCookieStats();
      break;
      
    default:
      console.log('❓ Unknown message type:', type);
  }
}

// Classify all cookies using existing logic
async function classifyAllCookies(cookies) {
  const classified = [];
  
  for (const cookie of cookies) {
    // Use existing classifyCookie function from cookieManager.js
    const category = await classifyCookie(cookie);
    
    classified.push({
      name: cookie.name,
      domain: cookie.domain,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate,
      category: mapCategoryToUI(category),
      categoryKind: category,
      allowed: category === 'tracking' // Tracking cookies are "allowed" to be blocked
    });
  }
  
  return classified;
}

// Map backend category to UI-friendly name
function mapCategoryToUI(category) {
  const mapping = {
    'tracking': 'Tracking',
    'necessary': 'Functional',
    'analytics': 'Analytics',
    'marketing': 'Marketing'
  };
  return mapping[category] || 'Unknown';
}

// Calculate cookie statistics
function calculateStats(cookies) {
  const harmful = cookies.filter(c => c.allowed).length; // Tracking cookies
  const safe = cookies.filter(c => !c.allowed).length;   // Necessary cookies
  
  return {
    total: cookies.length,
    harmful: harmful,
    safe: safe
  };
}

// Get settings from browser storage
async function getSettings() {
  try {
    const result = await browser.storage.local.get({
      protectionOn: true,
      blockHarmful: true,
      clipboardProtection: false
    });
    return result;
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      protectionOn: true,
      blockHarmful: true,
      clipboardProtection: false
    };
  }
}

// Handle protection toggle
async function handleToggleProtection(enabled) {
  console.log('✅ EXECUTING: Toggle protection ->', enabled);
  await browser.storage.local.set({ protectionOn: enabled });
  
  if (enabled) {
    console.log('   → Starting background protection');
    // Start background protection
    await browser.runtime.sendMessage({ action: 'START_PROTECTION' });
  } else {
    console.log('   → Stopping background protection');
    // Stop background protection
    await browser.runtime.sendMessage({ action: 'STOP_PROTECTION' });
  }
  console.log('✅ COMPLETED: Protection toggle');
}

// Handle block harmful cookies toggle
async function handleToggleBlockHarmful(enabled) {
  console.log('✅ EXECUTING: Block harmful cookies ->', enabled);
  await browser.storage.local.set({ blockHarmful: enabled });
  
  if (enabled) {
    console.log('   → Starting cookie scan and scramble...');
    
    try {
      // Call existing scanAndProcessCookies function from cookieManager.js
      const results = await scanAndProcessCookies();
      
      console.log('   → Scramble complete:', results);
      
      // Send results back to React
      sendToReact({
        type: MESSAGE_TYPES.SCRAMBLE_COMPLETE,
        payload: {
          scrambled: results.scrambled,
          necessary: results.necessary,
          skipped: results.skipped,
          total: results.total
        }
      });
      
      // Refresh cookie list in UI
      await initializePopup();
      
    } catch (error) {
      console.error('   ❌ Error scrambling cookies:', error);
      sendToReact({
        type: 'ERROR',
        payload: { message: 'Failed to scramble cookies' }
      });
    }
  }
  console.log('✅ COMPLETED: Block harmful toggle');
}

// Handle clipboard protection toggle
async function handleToggleClipboard(enabled) {
  console.log('✅ EXECUTING: Clipboard protection ->', enabled);
  await browser.storage.local.set({ clipboardProtection: enabled });
  console.log('✅ COMPLETED: Clipboard protection toggle');
}

// Handle cookie allowed toggle
async function handleToggleCookieAllowed(cookieName, allowed) {
  console.log('✅ EXECUTING: Toggle cookie allowed ->', cookieName, allowed);
  
  // Store preference
  const key = `cookie_allowed_${cookieName}`;
  await browser.storage.local.set({ [key]: allowed });
  
  // If not allowed, scramble the cookie
  if (!allowed) {
    console.log('   → Scrambling cookie:', cookieName);
    const cookies = await browser.cookies.getAll({ name: cookieName });
    for (const cookie of cookies) {
      await scrambleCookie(cookie);
    }
  }
  
  // Refresh UI
  await initializePopup();
  console.log('✅ COMPLETED: Cookie allowed toggle');
}

// Handle cookie deletion
async function handleDeleteCookie(cookieName) {
  console.log('✅ EXECUTING: Delete cookie ->', cookieName);
  
  try {
    const cookies = await browser.cookies.getAll({ name: cookieName });
    console.log('   → Found', cookies.length, 'cookie(s) to delete');
    
    for (const cookie of cookies) {
      const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
      const url = `http${cookie.secure ? 's' : ''}://${domain}${cookie.path}`;
      
      await browser.cookies.remove({
        url: url,
        name: cookie.name,
        storeId: cookie.storeId
      });
      console.log('   → Deleted:', cookie.name, 'from', cookie.domain);
    }
    
    // Refresh cookie list
    await initializePopup();
    console.log('✅ COMPLETED: Cookie deletion');
    
  } catch (error) {
    console.error('   ❌ Error deleting cookie:', cookieName, error);
  }
}

// Send cookie statistics to React
async function sendCookieStats() {
  const allCookies = await browser.cookies.getAll({});
  const classifiedCookies = await classifyAllCookies(allCookies);
  const stats = calculateStats(classifiedCookies);
  
  sendToReact({
    type: 'COOKIE_STATS',
    payload: stats
  });
}

// Send message to React app
function sendToReact(message) {
  window.postMessage(message, '*');
}

console.log('Cookie Crumbler popup script loaded');
