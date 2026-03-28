import { useState } from 'react';
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
    primaryAction: 'allow',
  },
  {
    name: '_fbp',
    category: 'Marketing',
    categoryKind: 'marketing',
    primaryAction: 'allow',
  },
  {
    name: 'session_id',
    category: 'Functional',
    categoryKind: 'functional',
    primaryAction: 'block',
  },
  {
    name: '_gid',
    category: 'Analytics',
    categoryKind: 'analytics',
    primaryAction: 'allow',
  },
];

const LOCK_HINT_SUMMARY =
  'Turn on protection to use the cookie summary.';
const LOCK_HINT_SETTINGS =
  'Turn on protection to change these settings.';
const LOCK_HINT_ADVANCED =
  'Turn on protection to open advanced controls.';

export default function App() {
  const [screen, setScreen] = useState('main');
  const [protectionOn, setProtectionOn] = useState(true);
  const [blockHarmful, setBlockHarmful] = useState(true);
  const [clipboardProtection, setClipboardProtection] = useState(false);

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
              {COOKIE_ROWS.map((row) => (
                <li key={row.name} className="cookie-list__item">
                  <CookieCard
                    name={row.name}
                    category={row.category}
                    categoryKind={row.categoryKind}
                    primaryAction={row.primaryAction}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
