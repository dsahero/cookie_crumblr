// Cookie Crumbler Background Script
// Periodically scans and scrambles tracking cookies

// Alarm interval in minutes
const SCAN_INTERVAL = 1; // 60 seconds

// Initialize alarm on extension install
browser.runtime.onInstalled.addListener(() => {
  console.log('Cookie Crumbler installed');
  browser.alarms.create('cookieScan', { periodInMinutes: SCAN_INTERVAL });
  // Run immediately on install
  scanAndProcessCookies();
});

// Listen for alarm to trigger cookie scan
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cookieScan') {
    scanAndProcessCookies();
  }
});

console.log('Cookie Crumbler background script loaded');
