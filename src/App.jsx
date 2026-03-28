import { useCallback, useState } from 'react';
import SummaryCard from './components/SummaryCard.jsx';
import Toggle from './components/Toggle.jsx';
import CookieCard from './components/CookieCard.jsx';
import cookieCrumbledUrl from '../extension/CookieCrumbled.png?url';
import cookieUncrumbledUrl from '../extension/CookieUncrumbled.png?url';
import './App.css';

const COOKIE_ROWS = [
  {
    name: '_ga',
    category: 'Analytics',
    categoryKind: 'analytics',
    allowed: true,
  },
  {
    name: '_fbp',
    category: 'Marketing',
    categoryKind: 'marketing',
    allowed: true,
  },
  {
    name: 'session_id',
    category: 'Functional',
    categoryKind: 'functional',
    allowed: false,
  },
  {
    name: '_gid',
    category: 'Analytics',
    categoryKind: 'analytics',
    allowed: true,
  },
];

const LOCK_HINT_SUMMARY =
  'Turn on protection to use the cookie summary.';
const LOCK_HINT_SETTINGS =
  'Turn on protection to change these settings.';
const LOCK_HINT_ADVANCED =
  'Turn on protection to open advanced controls.';

const initialCookieAllowedByName = () =>
  Object.fromEntries(COOKIE_ROWS.map((row) => [row.name, row.allowed]));

export default function App() {
  const [screen, setScreen] = useState('main');
  const [protectionOn, setProtectionOn] = useState(true);
  const [blockHarmful, setBlockHarmful] = useState(true);
  const [clipboardProtection, setClipboardProtection] = useState(false);
  const [cookieRows, setCookieRows] = useState(() => [...COOKIE_ROWS]);
  const [cookieAllowedByName, setCookieAllowedByName] = useState(
    initialCookieAllowedByName,
  );
  const [exitingNames, setExitingNames] = useState(() => new Set());

  const toggleCookieAllowed = (name) => {
    setCookieAllowedByName((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const requestDeleteCookie = (name) => {
    setExitingNames((prev) => new Set(prev).add(name));
  };

  const finishRemoveCookie = useCallback((name) => {
    setCookieRows((rows) => rows.filter((row) => row.name !== name));
    setCookieAllowedByName((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setExitingNames((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  const handleCookieRowTransitionEnd = (e, name) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'opacity') return;
    if (exitingNames.has(name)) finishRemoveCookie(name);
  };

  const handleRestart = useCallback(() => {
    setScreen('main');
    setProtectionOn(true);
    setBlockHarmful(true);
    setClipboardProtection(false);
    setCookieRows([...COOKIE_ROWS]);
    setCookieAllowedByName(initialCookieAllowedByName());
    setExitingNames(new Set());
  }, []);

  return (
    <div className="popup-root">
      <div className="popup-card">
        <div
          className={`popup-views ${screen === 'details' ? 'popup-views--details' : ''}`}
        >
          <main
            className="popup-screen popup-screen--main"
            aria-hidden={screen !== 'main'}
          >
            <h1 className="popup-title">CookieCrumbler</h1>

            <button
              type="button"
              className="protection-control"
              onClick={() => setProtectionOn((v) => !v)}
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
                  total={24}
                  harmful={18}
                  safe={6}
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
                  onChange={setBlockHarmful}
                  id="toggle-block"
                  disabled={!protectionOn}
                />
                <Toggle
                  label="Clipboard protection"
                  checked={clipboardProtection}
                  onChange={setClipboardProtection}
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

          <section
            className="popup-screen popup-screen--details"
            aria-hidden={screen !== 'details'}
          >
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
                cookieRows.map((row) => (
                  <li
                    key={row.name}
                    className={`cookie-list__item ${
                      exitingNames.has(row.name)
                        ? 'cookie-list__item--removing'
                        : ''
                    }`}
                    onTransitionEnd={(e) =>
                      handleCookieRowTransitionEnd(e, row.name)
                    }
                  >
                    <CookieCard
                      name={row.name}
                      category={row.category}
                      categoryKind={row.categoryKind}
                      allowed={cookieAllowedByName[row.name]}
                      onToggle={() => toggleCookieAllowed(row.name)}
                      onDelete={() => requestDeleteCookie(row.name)}
                    />
                  </li>
                ))
              )}
            </ul>

            <div className="details-footer">
              <button
                type="button"
                className="btn-restart"
                onClick={handleRestart}
                aria-label="Recrumble cookies and reset all settings to defaults"
              >
                Recrumble cookies
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
