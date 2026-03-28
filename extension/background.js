// Cookie Crumbler Background Script
// Monitors and scrambles tracking cookies in real-time

// Track if we're currently processing to prevent overlapping scans
let isProcessing = false;

// Cookies to ignore (frequently changing session cookies)
const ignoredCookieNames = ['_dd_s', '_abck'];

// Initialize on extension install
browser.runtime.onInstalled.addListener(() => {
  console.log('Cookie Crumbler installed');
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
    
    // Cookie was added or changed by website - trigger full scan
    console.log('Cookie added:', cookie.name);
    
    // Prevent overlapping scans
    if (!isProcessing) {
      isProcessing = true;
      await scanAndProcessCookies();
      isProcessing = false;
    }
  }
});

console.log('Cookie Crumbler background script loaded');
