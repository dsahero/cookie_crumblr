import {
  classifyCookie,
  scrambleCookie,
  isScrambled,
  isScanned,
  unmarkAsScrambled,
  markAsScanned,
  scanAndProcessCookies,
  isTrackingCategory
} from './cookieManager.js';

// CookieCrumblr background script
// Monitors and scrambles tracking cookies in real-time

// Track if we're currently processing to prevent overlapping scans
let isProcessing = false;

// Cookies to ignore (frequently changing session cookies)
const ignoredCookieNames = ['_dd_s', '_abck'];

// Initialize on extension install
browser.runtime.onInstalled.addListener(() => {
  console.log('CookieCrumblr installed');
  // Scan existing cookies on install
  scanAndProcessCookies();
});

// Listen for cookie changes (added or modified)
browser.cookies.onChanged.addListener(async (changeInfo) => {
  // Only process when cookies are added or modified (not removed)
  if (!changeInfo.removed && changeInfo.cookie) {
    const cookie = changeInfo.cookie;
    
    // Ignore specific cookies that change frequently
    if (ignoredCookieNames.includes(cookie.name)) {
      return;
    }
    
    // Skip if this cookie was just scrambled by us
    if (isScrambled(cookie)) {
      return;
    }
    
    // Cookie was added or changed by website
    console.log('Cookie added:', cookie.name);
    
    // If already scanned, unmark it so it can be re-scanned
    if (isScanned(cookie)) {
      unmarkAsScrambled(cookie);
    }
    
    // Classify and process this specific cookie
    const classification = await classifyCookie(cookie);
    
    if (isTrackingCategory(classification)) {
      console.log(`Tracking cookie detected: ${cookie.name}`);
      await scrambleCookie(cookie);
    } else {
      markAsScanned(cookie);
      console.log(`Necessary cookie kept: ${cookie.name}`);
    }
  }
});

console.log('CookieCrumblr background script loaded');
