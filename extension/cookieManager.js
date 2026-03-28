// Shared Cookie Management Module
// Used by both background.js (automatic scanning) and popup.js (manual trigger)

// Global set to track scrambled cookies (shared across all callers)
const scrambledCookiesTracker = new Set();

// Global set to track all scanned cookies (both necessary and tracking)
const scannedCookiesTracker = new Set();

// Helper to create unique cookie identifier
function getCookieKey(cookie) {
  return `${cookie.domain}:${cookie.name}:${cookie.path}`;
}

// Check if a cookie has been scrambled
function isScrambled(cookie) {
  return scrambledCookiesTracker.has(getCookieKey(cookie));
}

// Check if a cookie has been scanned
function isScanned(cookie) {
  return scannedCookiesTracker.has(getCookieKey(cookie));
}

// Mark a cookie as scrambled
function markAsScrambled(cookie) {
  scrambledCookiesTracker.add(getCookieKey(cookie));
  scannedCookiesTracker.add(getCookieKey(cookie));
}

// Mark a cookie as scanned (but not scrambled)
function markAsScanned(cookie) {
  scannedCookiesTracker.add(getCookieKey(cookie));
}

// Remove a cookie from scrambled tracking (when website changes it)
function unmarkAsScrambled(cookie) {
  scrambledCookiesTracker.delete(getCookieKey(cookie));
  scannedCookiesTracker.delete(getCookieKey(cookie));
}

// ML Classification Function (Placeholder)
async function classifyCookie(cookie) {
  // TODO: Implement ML algorithm to classify cookies
  // This should call the backend ML service or use a local model
  
  // Placeholder logic - returns 'necessary' or 'tracking'
  // In production, this will analyze cookie properties:
  // - name, domain, path, value length, expiration, etc.
  
  //console.log('Classifying cookie:', cookie.name);
  
  // Temporary heuristic until ML is integrated
  const trackingKeywords = ['analytics', 'tracking', 'ad', 'facebook', 'google'];
  const cookieName = cookie.name.toLowerCase();
  
  for (const keyword of trackingKeywords) {
    if (cookieName.includes(keyword)) {
      return 'tracking';
    }
  }
  
  return 'necessary';
}

// Scramble cookie by modifying its value
async function scrambleCookie(cookie) {
  try {
    // Remove leading dot from domain if present (e.g., ".macys.com" -> "macys.com")
    const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const url = `http${cookie.secure ? 's' : ''}://${domain}${cookie.path}`;
    
    // Store original value for logging
    const originalValue = cookie.value;
    
    // Generate random scrambled value
    const scrambledValue = generateRandomString(cookie.value.length);
    
    // Mark as scrambled BEFORE setting to prevent loop
    markAsScrambled(cookie);
    
    // Set the cookie with scrambled value
    await browser.cookies.set({
      url: url,
      name: cookie.name,
      value: scrambledValue,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate,
      storeId: cookie.storeId,
      sameSite: cookie.sameSite
    });
    
    // Log the change with before/after values
    console.log('=== COOKIE SCRAMBLED ===');
    console.log(`Name: ${cookie.name}`);
    console.log(`Domain: ${cookie.domain}`);
    console.log(`Original Value: ${originalValue}`);
    console.log(`Scrambled Value: ${scrambledValue}`);
    console.log('========================');
    
    return true;
  } catch (error) {
    console.error(`Failed to scramble cookie ${cookie.name}:`, error);
    return false;
  }
}

// Generate random string for scrambling
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Main function to scan and process all cookies
async function scanAndProcessCookies() {
  try {
    console.log('Starting cookie scan...');
    
    // Get all cookies
    const cookies = await browser.cookies.getAll({});
    console.log(`Found ${cookies.length} cookies`);
    
    let scrambledCount = 0;
    let necessaryCount = 0;
    let skippedCount = 0;
    
    // Process each cookie and wait for completion
    for (const cookie of cookies) {
      // Skip if already scanned
      if (isScanned(cookie)) {
        skippedCount++;
        continue;
      }
      
      const classification = await classifyCookie(cookie);
      
      if (classification === 'tracking') {
        const success = await scrambleCookie(cookie);
        if (success) scrambledCount++;
      } else {
        markAsScanned(cookie);
        necessaryCount++;
      }
    }
    
    console.log(`Cookie scan complete - Scrambled: ${scrambledCount}, Kept: ${necessaryCount}, Skipped: ${skippedCount}`);
    
    return {
      total: cookies.length,
      scrambled: scrambledCount,
      necessary: necessaryCount,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('Error scanning cookies:', error);
    throw error;
  }
}
