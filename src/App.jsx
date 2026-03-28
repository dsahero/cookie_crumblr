import { useCallback, useEffect, useState } from 'react';
import SummaryCard from './components/SummaryCard.jsx';
import Toggle from './components/Toggle.jsx';
import CookieCard from './components/CookieCard.jsx';
import cookieCrumbledUrl from '../extension/CookieCrumbled.png?url';
import cookieUncrumbledUrl from '../extension/CookieUncrumbled.png?url';
import {
  scrambleCookie,
  resetTracking,
  scanAndProcessCookies,
  getAllCookiesAcrossStores,
  classifyCookiesBatch,
  mapCategoryToUI,
  categoryKindForCard,
  isScrambled,
  isTrackingCategory
} from '../extension/cookieManager.js';
import './App.css';

const LOCK_HINT_SUMMARY = 'Turn on protection to use the cookie summary.';
const LOCK_HINT_SETTINGS = 'Turn on protection to change these settings.';
const LOCK_HINT_ADVANCED = 'Turn on protection to open advanced controls.';

function rowKeyFor(row) {
  const c = row.cookie;
  if (!c) return row.name;
  const sid = c.storeId != null && c.storeId !== '' ? c.storeId : '';
  return `${sid}:${c.domain}:${c.name}:${c.path || '/'}`;
}

export default function App() {
  const [screen, setScreen] = useState('main');
  const [protectionOn, setProtectionOn] = useState(true);
  const [blockHarmful, setBlockHarmful] = useState(true);
  const [clipboardProtection, setClipboardProtection] = useState(true);
  const [cookieRows, setCookieRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, harmful: 0, safe: 0 });
  const [exitingNames, setExitingNames] = useState(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [cookieAllowlist, setCookieAllowlist] = useState(() => new Set());

  // Load settings and cookies on mount
  useEffect(() => {
    async function init() {
      // Load settings from storage
      const stored = await browser.storage.local.get(['settings', 'cookieAllowlist']);
      if (stored.settings) {
        setProtectionOn(stored.settings.protectionOn ?? true);
        setBlockHarmful(stored.settings.blockHarmful ?? true);
        setClipboardProtection(stored.settings.clipboardProtection ?? true);
      }
      if (stored.cookieAllowlist) {
        setCookieAllowlist(new Set(stored.cookieAllowlist));
      }
      
      // If protection is on, scan cookies first to populate tracking
      const isProtectionOn = stored.settings?.protectionOn ?? true;
      if (isProtectionOn) {
        await scanAndProcessCookies();
      }
      
      // Load cookies
      await loadCookies(stored.cookieAllowlist ? new Set(stored.cookieAllowlist) : new Set());
    }
    init();
  }, []);

  const loadCookies = async (allowlist = cookieAllowlist) => {
    try {
      const cookies = await getAllCookiesAcrossStores();
      const labels = await classifyCookiesBatch(cookies);

      const rows = [];
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const ml = labels[i];
        rows.push({
          name: cookie.name,
          category: mapCategoryToUI(ml),
          categoryKind: categoryKindForCard(ml),
          allowed: !allowlist.has(cookie.name) && !isScrambled(cookie),
          cookie
        });
      }

      let harmful = 0;
      let safe = 0;
      for (const ml of labels) {
        if (isTrackingCategory(ml)) harmful++;
        else safe++;
      }
      setStats({ total: cookies.length, harmful, safe });

      setCookieRows(rows);
      console.log('Loaded cookies:', rows.length);
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  };

  // Save settings to storage
  const saveSettings = async (newSettings) => {
    await browser.storage.local.set({ 
      settings: newSettings,
      cookieAllowlist: Array.from(cookieAllowlist)
    });
  };

  useEffect(() => {
    if (screen !== 'details') setHelpOpen(false);
  }, [screen]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setHelpOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  const crumbleCookie = async (row) => {
    const c = row.cookie;
    if (!c) {
      console.warn('CookieCrumblr: missing cookie object for row', row.name);
      return;
    }

    const name = c.name;
    const newAllowlist = new Set(cookieAllowlist);
    newAllowlist.add(name);
    setCookieAllowlist(newAllowlist);

    await browser.storage.local.set({ cookieAllowlist: Array.from(newAllowlist) });

    try {
      await scrambleCookie(c);
    } catch (e) {
      console.error('CookieCrumblr: scramble failed', e);
    }

    await loadCookies(newAllowlist);
  };

  const requestDeleteCookie = async (row) => {
    const c = row.cookie;
    if (!c) {
      console.warn('CookieCrumblr: missing cookie object for delete', row.name);
      return;
    }

    const rk = rowKeyFor(row);
    setExitingNames((prev) => new Set(prev).add(rk));

    try {
      const host = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      const path = c.path && c.path.length > 0 ? c.path : '/';
      const cookieUrl = `http${c.secure ? 's' : ''}://${host}${path}`;
      await browser.cookies.remove({
        url: cookieUrl,
        name: c.name,
        storeId: c.storeId
      });
      console.log('Cookie deleted:', c.name, c.domain);
      await loadCookies();
    } catch (error) {
      console.error('Error deleting cookie:', error);
    }
  };

  const finishRemoveCookie = useCallback((rk) => {
    setCookieRows((rows) => rows.filter((row) => rowKeyFor(row) !== rk));
    setExitingNames((prev) => {
      const next = new Set(prev);
      next.delete(rk);
      return next;
    });
  }, []);

  const handleCookieRowTransitionEnd = (e, rk) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'opacity') return;
    if (exitingNames.has(rk)) finishRemoveCookie(rk);
  };

  const handleRestart = useCallback(async () => {
    setScreen('main');
    
    // Reset to defaults
    const defaultSettings = {
      protectionOn: true,
      blockHarmful: true,
      clipboardProtection: true
    };
    
    setProtectionOn(true);
    setBlockHarmful(true);
    setClipboardProtection(true);
    setCookieAllowlist(new Set());
    
    await browser.storage.local.set({ 
      settings: defaultSettings,
      cookieAllowlist: []
    });
    
    // Reload cookies
    await loadCookies(new Set());
  }, []);

  return (
    <div className="popup-root">
      <div className="popup-card">
        {screen === 'main' ? (
          <main className="popup-screen popup-screen--main">
            <h1 className="popup-title">CookieCrumblr</h1>

            <button
              type="button"
              className="protection-control"
              onClick={async () => {
                const nextOn = !protectionOn;
                console.log('Protection toggled:', nextOn);
                setProtectionOn(nextOn);
                setBlockHarmful(nextOn);
                setClipboardProtection(nextOn);
                await saveSettings({ protectionOn: nextOn, blockHarmful: nextOn, clipboardProtection: nextOn });
                
                // When protection is turned on, reset tracking and rescan all cookies
                if (nextOn) {
                  resetTracking();
                  await scanAndProcessCookies();
                  await loadCookies();
                }
              }}
              aria-pressed={protectionOn}
              aria-label={
                protectionOn
                  ? 'Protection on. Click to turn off.'
                  : 'Protection off. Click to turn on.'
              }
            >
              <span className="protection-control__outer">
                <span className="protection-control__inner">
                  <img
                    className="protection-control__img"
                    src={protectionOn ? cookieCrumbledUrl : cookieUncrumbledUrl}
                    alt=""
                    width={132}
                    height={132}
                    draggable={false}
                  />
                </span>
              </span>
            </button>

            <div className="protection-status-wrap">
              <p className="protection-status">
                Protection {protectionOn ? 'ON' : 'OFF'}
              </p>
            </div>

            <div className="popup-stack">
              <div
                className={`feature-zone ${!protectionOn ? 'feature-zone--locked' : ''}`}
              >
                {!protectionOn && (
                  <div
                    role="presentation"
                    className="feature-zone__blocker"
                    title={LOCK_HINT_SUMMARY}
                  />
                )}
                <SummaryCard
                  total={stats.total}
                  harmful={stats.harmful}
                  safe={stats.safe}
                  inactive={!protectionOn}
                />
              </div>

              <div
                className={`feature-zone settings-stack ${!protectionOn ? 'feature-zone--locked' : ''}`}
              >
                {!protectionOn && (
                  <div
                    role="presentation"
                    className="feature-zone__blocker"
                    title={LOCK_HINT_SETTINGS}
                  />
                )}
                <Toggle
                  label="Block harmful cookies"
                  checked={blockHarmful}
                  onChange={async (enabled) => {
                    console.log('Block harmful toggled:', enabled);
                    setBlockHarmful(enabled);
                    await saveSettings({ protectionOn, blockHarmful: enabled, clipboardProtection });
                  }}
                  id="toggle-block"
                  disabled={!protectionOn}
                />
                <Toggle
                  label="Clipboard protection"
                  checked={clipboardProtection}
                  onChange={async (enabled) => {
                    console.log('Clipboard protection toggled:', enabled);
                    setClipboardProtection(enabled);
                    await saveSettings({ protectionOn, blockHarmful, clipboardProtection: enabled });
                  }}
                  id="toggle-clipboard"
                  disabled={!protectionOn}
                />
              </div>

              <div
                className={`feature-zone feature-zone--footer ${!protectionOn ? 'feature-zone--locked' : ''}`}
              >
                {!protectionOn && (
                  <div
                    role="presentation"
                    className="feature-zone__blocker"
                    title={LOCK_HINT_ADVANCED}
                  />
                )}
                <button
                  type="button"
                  className="btn-advanced"
                  disabled={!protectionOn}
                  onClick={() => protectionOn && setScreen('details')}
                >
                  Advanced controls
                </button>
              </div>
            </div>
          </main>
        ) : (
          <section className="popup-screen popup-screen--details">
            <header className="details-header">
              <button
                type="button"
                className="btn-back"
                onClick={() => setScreen('main')}
              >
                <span className="btn-back__arrow" aria-hidden="true">
                  ←
                </span>
                Back
              </button>
              <h1 className="details-header__title">Cookie Details</h1>
              <span className="details-header__spacer" aria-hidden="true" />
            </header>

            <ul className="cookie-list">
              {cookieRows.length === 0 ? (
                <li className="cookie-list__empty">
                  No cookies in this list.
                </li>
              ) : (
                cookieRows.map((row) => {
                  const rk = rowKeyFor(row);
                  return (
                  <li
                    key={rk}
                    className={`cookie-list__item ${
                      exitingNames.has(rk)
                        ? 'cookie-list__item--removing'
                        : ''
                    }`}
                    onTransitionEnd={(e) =>
                      handleCookieRowTransitionEnd(e, rk)
                    }
                  >
                    <CookieCard
                      name={row.name}
                      category={row.category}
                      categoryKind={row.categoryKind}
                      crumbled={!row.allowed}
                      onCrumble={() => crumbleCookie(row)}
                      onDelete={() => requestDeleteCookie(row)}
                    />
                  </li>
                  );
                })
              )}
            </ul>

            <div className="details-footer">
              <button
                type="button"
                className="btn-restart"
                onClick={handleRestart}
                aria-label="Recrumble cookies: reset the cookie list and main settings to defaults"
              >
                Recrumble cookies
              </button>
            </div>

            <button
              type="button"
              className="btn-help"
              onClick={() => setHelpOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={helpOpen}
              aria-controls="help-dialog"
            >
              Help
            </button>

            {helpOpen && (
          <div
            className="help-backdrop"
            role="presentation"
            onClick={() => setHelpOpen(false)}
          >
            <div
              id="help-dialog"
              className="help-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-dialog-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="help-dialog__header">
                <h2 id="help-dialog-title" className="help-dialog__title">
                  How CookieCrumblr works
                </h2>
                <button
                  type="button"
                  className="help-dialog__close"
                  onClick={() => setHelpOpen(false)}
                  aria-label="Close help"
                >
                  ×
                </button>
              </div>
              <div className="help-dialog__body">
                <section className="help-section">
                  <h3 className="help-section__title">Protection</h3>
                  <p className="help-section__text">
                    Tap the cookie image to turn protection on or off. When it is
                    off, the summary and settings below are locked.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Cookie summary</h3>
                  <p className="help-section__text">
                    Shows totals for cookies we’ve scanned (example numbers in this
                    preview). Available when protection is on.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Block harmful cookies</h3>
                  <p className="help-section__text">
                    When enabled, harmful cookies are handled according to your rules
                    (preview UI).
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Clipboard protection</h3>
                  <p className="help-section__text">
                    Optional extra protection for clipboard actions while browsing
                    (preview UI).
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Advanced controls</h3>
                  <p className="help-section__text">
                    Opens the cookie list where you can manage individual cookies.
                    Requires protection to be on.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Crumble</h3>
                  <p className="help-section__text">
                    Stops that cookie for good. You can’t undo it on this screen.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Crumbled</h3>
                  <p className="help-section__text">
                    This cookie is already stopped. The button is only a status
                    label.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Delete</h3>
                  <p className="help-section__text">
                    Removes that row from the list below. It does not turn
                    protection off.
                  </p>
                </section>
                <section className="help-section">
                  <h3 className="help-section__title">Recrumble cookies</h3>
                  <p className="help-section__text">
                    Resets the cookie list and your main screen settings to their
                    defaults, like starting over.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </section>
    )}
  </div>
</div>
);
}
