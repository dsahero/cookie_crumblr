// Shared Cookie Management Module — background + bundled popup (Vite)

const CLASSIFIER_BASE_URL = 'http://127.0.0.1:8000';
const CLASSIFY_TIMEOUT_MS = 15000;

if (typeof window !== 'undefined') {
  window.scrambledCookiesTracker = window.scrambledCookiesTracker || new Set();
  window.scannedCookiesTracker = window.scannedCookiesTracker || new Set();
}

const scrambledCookiesTracker =
  typeof window !== 'undefined' ? window.scrambledCookiesTracker : new Set();
const scannedCookiesTracker =
  typeof window !== 'undefined' ? window.scannedCookiesTracker : new Set();

/** Include storeId so keys are unique across Firefox cookie jars. */
function getCookieKey(cookie) {
  const sid = cookie.storeId != null && cookie.storeId !== '' ? cookie.storeId : '';
  return `${sid}:${cookie.domain}:${cookie.name}:${cookie.path || '/'}`;
}

export function isScrambled(cookie) {
  return scrambledCookiesTracker.has(getCookieKey(cookie));
}

export function isScanned(cookie) {
  return scannedCookiesTracker.has(getCookieKey(cookie));
}

export function markAsScrambled(cookie) {
  scrambledCookiesTracker.add(getCookieKey(cookie));
  scannedCookiesTracker.add(getCookieKey(cookie));
}

export function markAsScanned(cookie) {
  scannedCookiesTracker.add(getCookieKey(cookie));
}

export function unmarkAsScrambled(cookie) {
  scrambledCookiesTracker.delete(getCookieKey(cookie));
  scannedCookiesTracker.delete(getCookieKey(cookie));
}

export function resetTracking() {
  scrambledCookiesTracker.clear();
  scannedCookiesTracker.clear();
  console.log('Cookie tracking reset - all cookies will be rescanned');
}

export function getStats() {
  const harmful = scrambledCookiesTracker.size;
  const safe = [...scannedCookiesTracker].filter(
    (k) => !scrambledCookiesTracker.has(k)
  ).length;
  return {
    total: harmful + safe,
    harmful,
    safe
  };
}

export function cookieRetentionPeriod(cookie) {
  if (cookie.expirationDate == null || cookie.expirationDate === undefined) {
    return 'session';
  }
  const nowSec = Date.now() / 1000;
  const secs = Math.max(0, cookie.expirationDate - nowSec);
  return String(Math.floor(secs));
}

/**
 * Maps API / heuristic labels to "harmful" for scrambling.
 * ML categories: Marketing, Functional, Analytics, Personalization
 */
export function isTrackingCategory(category) {
  if (category === 'tracking') return true;
  if (category === 'necessary') return false;
  return (
    category === 'Marketing' ||
    category === 'Analytics' ||
    category === 'Personalization'
  );
}

/** When the API is down — assign one of the four categories from cookie name heuristics. */
function classifyCookieHeuristic(cookie) {
  const n = cookie.name.toLowerCase();
  if (
    /(_ga|_gid|gtag|analytics|segment|mixpanel|hotjar|clarity|plausible)/.test(n)
  ) {
    return 'Analytics';
  }
  if (/(ads?|fbp|fr|gclid|doubleclick|marketing|muid|visitor)/.test(n)) {
    return 'Marketing';
  }
  if (/(pref|personal|locale|theme|consent|cookie|gdpr|notice)/.test(n)) {
    return 'Personalization';
  }
  return 'Functional';
}

export function mapCategoryToUI(category) {
  const m = {
    tracking: 'Tracking',
    necessary: 'Functional',
    Marketing: 'Marketing',
    Functional: 'Functional',
    Analytics: 'Analytics',
    Personalization: 'Personalization'
  };
  return m[category] || 'Unknown';
}

/** Lowercase key for CookieCard tag CSS */
export function categoryKindForCard(category) {
  const map = {
    Marketing: 'marketing',
    Functional: 'functional',
    Analytics: 'analytics',
    Personalization: 'personalization',
    tracking: 'tracking',
    necessary: 'functional'
  };
  return map[category] || 'functional';
}

/**
 * Batch call to FastAPI POST /classify_batch.
 * Returns an array of category strings (Marketing | Functional | Analytics | Personalization).
 */
export async function classifyCookiesBatch(cookies) {
  if (!cookies.length) return [];
  const items = cookies.map((c) => ({
    cookie_name: c.name,
    retention_period: cookieRetentionPeriod(c)
  }));
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);
    const res = await fetch(`${CLASSIFIER_BASE_URL}/classify_batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: controller.signal
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length !== cookies.length) {
      throw new Error('classify_batch length mismatch');
    }
    return data.results.map((r, i) => {
      const cat = r && r.category;
      if (typeof cat === 'string' && cat.length) return cat;
      return classifyCookieHeuristic(cookies[i]);
    });
  } catch (e) {
    console.warn('CookieCrumblr: classifier API failed, using heuristic:', e);
    return cookies.map((c) => classifyCookieHeuristic(c));
  }
}

export async function classifyCookie(cookie) {
  const [cat] = await classifyCookiesBatch([cookie]);
  return cat;
}

/**
 * All cookies in every Firefox cookie store (default, containers, private).
 */
export async function getAllCookiesAcrossStores() {
  try {
    if (typeof browser.cookies.getAllCookieStores !== 'function') {
      return browser.cookies.getAll({});
    }
    const stores = await browser.cookies.getAllCookieStores();
    const out = [];
    for (const store of stores) {
      const id = store.id;
      const chunk = await browser.cookies.getAll({ storeId: id });
      for (const c of chunk) {
        out.push({
          ...c,
          storeId: c.storeId != null && c.storeId !== '' ? c.storeId : id
        });
      }
    }
    return out;
  } catch (e) {
    console.warn('CookieCrumblr: getAllCookieStores failed:', e);
    return browser.cookies.getAll({});
  }
}

export async function scrambleCookie(cookie) {
  try {
    const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    const path = cookie.path && cookie.path.length > 0 ? cookie.path : '/';
    const url = `http${cookie.secure ? 's' : ''}://${domain}${path}`;

    const originalValue = cookie.value;
    const scrambledValue = generateRandomString(cookie.value.length);

    markAsScrambled(cookie);

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

    console.log('=== COOKIE SCRAMBLED ===', cookie.name, cookie.domain);
    return true;
  } catch (error) {
    console.error(`Failed to scramble cookie ${cookie.name}:`, error);
    return false;
  }
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function scanAndProcessCookies() {
  const cookies = await getAllCookiesAcrossStores();
  const pending = [];
  for (const cookie of cookies) {
    if (!isScanned(cookie)) pending.push(cookie);
  }

  const classifications = await classifyCookiesBatch(pending);

  let scrambledCount = 0;
  let necessaryCount = 0;
  let skippedCount = cookies.length - pending.length;

  for (let j = 0; j < pending.length; j++) {
    const cookie = pending[j];
    const classification = classifications[j];

    if (isTrackingCategory(classification)) {
      const ok = await scrambleCookie(cookie);
      if (ok) scrambledCount++;
    } else {
      markAsScanned(cookie);
      necessaryCount++;
    }
  }

  console.log(
    `Cookie scan: scrambled ${scrambledCount}, kept ${necessaryCount}, skipped ${skippedCount}`
  );

  return {
    total: cookies.length,
    scrambled: scrambledCount,
    necessary: necessaryCount,
    skipped: skippedCount
  };
}
