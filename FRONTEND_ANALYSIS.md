# Cookie Crumbler Frontend Analysis

## Overview
The frontend is a React application built with Vite that gets compiled into the `extension/assets/` directory. The popup UI is loaded via `extension/popup.html` which mounts the React app.

---

## Architecture Flow

```
User clicks extension icon
    ↓
popup.html loads
    ↓
Loads compiled React bundle from extension/assets/
    ↓
App.jsx renders (main UI component)
    ↓
popup.js can communicate with React via window.postMessage()
```

---

## Interactive Elements & Their Functions

### 1. **Main Screen** (`screen === 'main'`)

#### A. Protection Toggle Button (Cookie Image)
- **Location**: Center of main screen
- **Element**: `<button className="protection-control">`
- **Function**: `onClick={() => setProtectionOn((v) => !v)}`
- **State**: `protectionOn` (boolean)
- **Visual**: Shows crumbled cookie when ON, uncrumbled when OFF
- **Effect**: Enables/disables all protection features

#### B. Summary Card (Read-only Display)
- **Component**: `<SummaryCard />`
- **Props**: 
  - `total={24}` - Total cookies detected
  - `harmful={18}` - Tracking/harmful cookies
  - `safe={6}` - Necessary/functional cookies
  - `inactive={!protectionOn}` - Grayed out when protection OFF
- **Currently**: Hardcoded values, needs backend connection

#### C. Toggle Switches (2 settings)

**Toggle 1: Block Harmful Cookies**
- **Component**: `<Toggle />`
- **Props**:
  - `label="Block harmful cookies"`
  - `checked={blockHarmful}`
  - `onChange={setBlockHarmful}`
  - `disabled={!protectionOn}`
- **State**: `blockHarmful` (boolean)
- **Function**: When enabled, should trigger cookie scrambling

**Toggle 2: Clipboard Protection**
- **Component**: `<Toggle />`
- **Props**:
  - `label="Clipboard protection"`
  - `checked={clipboardProtection}`
  - `onChange={setClipboardProtection}`
  - `disabled={!protectionOn}`
- **State**: `clipboardProtection` (boolean)
- **Function**: Protects clipboard from tracking

#### D. Advanced Controls Button
- **Element**: `<button className="btn-advanced">`
- **Function**: `onClick={() => protectionOn && setScreen('details')}`
- **Effect**: Navigates to cookie details screen
- **Disabled**: When `protectionOn === false`

---

### 2. **Details Screen** (`screen === 'details'`)

#### A. Back Button
- **Element**: `<button className="btn-back">`
- **Function**: `onClick={() => setScreen('main')}`
- **Effect**: Returns to main screen

#### B. Cookie List (Dynamic)
- **Data Source**: `cookieRows` array
- **Current Data**: Hardcoded 4 sample cookies
  ```javascript
  [
    { name: '_ga', category: 'Analytics', categoryKind: 'analytics', allowed: true },
    { name: '_fbp', category: 'Marketing', categoryKind: 'marketing', allowed: true },
    { name: 'session_id', category: 'Functional', categoryKind: 'functional', allowed: false },
    { name: '_gid', category: 'Analytics', categoryKind: 'analytics', allowed: true }
  ]
  ```

#### C. Cookie Cards (Per Cookie)
- **Component**: `<CookieCard />`
- **Props**:
  - `name` - Cookie name (e.g., "_ga")
  - `category` - Display category (e.g., "Analytics")
  - `categoryKind` - CSS class variant (analytics/marketing/functional)
  - `allowed` - Whether cookie is currently allowed
  - `onToggle` - Function to block/unblock cookie
  - `onDelete` - Function to delete cookie

**Interactive Elements per Card**:

1. **Block/Unblock Button**
   - **Function**: `onToggle={() => toggleCookieAllowed(row.name)}`
   - **Effect**: Toggles `cookieAllowedByName[name]` state
   - **Label**: Shows "Block" if allowed, "Unblock" if blocked
   - **Backend Action Needed**: Should scramble/unscramble cookie

2. **Delete Button**
   - **Function**: `onDelete={() => requestDeleteCookie(row.name)}`
   - **Effect**: 
     1. Adds cookie to `exitingNames` set (triggers fade animation)
     2. After animation completes, removes from `cookieRows`
   - **Backend Action Needed**: Should delete cookie from browser

#### D. Recrumble Cookies Button
- **Element**: `<button className="btn-restart">`
- **Function**: `onClick={handleRestart}`
- **Effect**: Resets all state to defaults
- **Backend Action Needed**: Should refresh cookie list from browser

---

## State Management

### Current State Variables
```javascript
const [screen, setScreen] = useState('main');                    // 'main' or 'details'
const [protectionOn, setProtectionOn] = useState(true);          // Master toggle
const [blockHarmful, setBlockHarmful] = useState(true);          // Block harmful cookies
const [clipboardProtection, setClipboardProtection] = useState(false); // Clipboard protection
const [cookieRows, setCookieRows] = useState([...COOKIE_ROWS]);  // Cookie list
const [cookieAllowedByName, setCookieAllowedByName] = useState({...}); // Cookie permissions
const [exitingNames, setExitingNames] = useState(new Set());     // Cookies being deleted
```

---

## How to Connect Frontend to Backend

### Method 1: Window PostMessage (Recommended for Extension)

**In popup.js** (bridge between React and extension APIs):
```javascript
// Listen for messages from React
window.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  
  switch(type) {
    case 'GET_COOKIES':
      const cookies = await browser.cookies.getAll({});
      const classified = await classifyCookies(cookies);
      window.postMessage({ type: 'COOKIES_DATA', payload: classified }, '*');
      break;
      
    case 'TOGGLE_PROTECTION':
      await browser.storage.local.set({ protectionOn: payload.enabled });
      break;
      
    case 'DELETE_COOKIE':
      await deleteCookie(payload.cookieName);
      break;
  }
});
```

**In App.jsx** (React component):
```javascript
useEffect(() => {
  // Listen for responses from popup.js
  window.addEventListener('message', (event) => {
    if (event.data.type === 'COOKIES_DATA') {
      setCookieRows(event.data.payload);
    }
  });
  
  // Request initial data
  window.postMessage({ type: 'GET_COOKIES' }, '*');
}, []);

// Send actions to popup.js
const toggleCookieAllowed = (name) => {
  window.postMessage({ 
    type: 'TOGGLE_COOKIE_ALLOWED', 
    payload: { cookieName: name } 
  }, '*');
};
```

### Method 2: Direct Browser API (If popup.js has access)

**In App.jsx**:
```javascript
// Access browser APIs directly (if available in context)
const getCookies = async () => {
  const cookies = await browser.cookies.getAll({});
  setCookieRows(cookies);
};
```

---

## Backend Integration Points

### 1. **Cookie Classification** (Backend ML Model)
**When**: On popup load, when cookies change
**Frontend Action**: Display cookies in list
**Backend Endpoint**: `POST /classify`
**Request**:
```json
{
  "name": "_ga",
  "domain": ".example.com",
  "path": "/",
  "value_length": 32,
  "secure": true,
  "http_only": false,
  "has_expiration": true
}
```
**Response**:
```json
{
  "category": "analytics",
  "confidence": 0.95
}
```

### 2. **Cookie Statistics** (Summary Card)
**When**: On popup load, after any cookie action
**Frontend Element**: `<SummaryCard total={24} harmful={18} safe={6} />`
**Data Source**: Count cookies by classification
**Update**: Replace hardcoded values with real counts

### 3. **Cookie Scrambling** (Block Harmful Toggle)
**When**: User enables "Block harmful cookies"
**Frontend Action**: `setBlockHarmful(true)`
**Backend Action**: Call `scanAndProcessCookies()` from cookieManager.js
**Effect**: Scramble all tracking cookies

### 4. **Individual Cookie Actions**
**Block/Unblock**: 
- Frontend: `toggleCookieAllowed(name)`
- Backend: Call `scrambleCookie(cookie)` or restore original value

**Delete**:
- Frontend: `requestDeleteCookie(name)`
- Backend: Call `browser.cookies.remove()`

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    React Component (App.jsx)                 │
│  - Handles UI state                                          │
│  - Renders components                                        │
│  - Sends messages via window.postMessage()                   │
└────────────────────────────┬────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    popup.js (Bridge Layer)                   │
│  - Receives messages from React                              │
│  - Calls browser.cookies API                                 │
│  - Calls backend ML API (fetch)                              │
│  - Sends responses back to React                             │
└────────────────────────────┬────────────────────────────────┘
                             ↓
                    ┌────────┴────────┐
                    ↓                 ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   Browser Cookie API     │  │   Backend ML Server      │
│   (browser.cookies)      │  │   (Flask API)            │
│  - getAll()              │  │  - POST /classify        │
│  - set()                 │  │  - Returns category      │
│  - remove()              │  │                          │
└──────────────────────────┘  └──────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Connect Cookie Data
- [ ] Add `useEffect` in App.jsx to request cookies on load
- [ ] Implement message listener in popup.js
- [ ] Fetch cookies using `browser.cookies.getAll()`
- [ ] Send cookie data to React via postMessage
- [ ] Update `cookieRows` state with real data

### Phase 2: Connect Backend Classification
- [ ] Create Flask endpoint `POST /classify`
- [ ] Call backend from popup.js for each cookie
- [ ] Map backend categories to frontend categories
- [ ] Update SummaryCard with real statistics

### Phase 3: Connect Actions
- [ ] Wire up protection toggle to background.js
- [ ] Connect "Block harmful" to `scanAndProcessCookies()`
- [ ] Implement cookie block/unblock functionality
- [ ] Implement cookie deletion
- [ ] Add refresh functionality to "Recrumble cookies"

### Phase 4: Real-time Updates
- [ ] Listen for cookie changes in background.js
- [ ] Push updates to popup when cookies change
- [ ] Update UI in real-time

---

## Key Files to Modify

1. **src/App.jsx** - Add message passing logic
2. **extension/popup.js** - Implement bridge layer
3. **backend/main.py** - Create classification endpoint
4. **extension/cookieManager.js** - Already has scrambling logic
5. **extension/background.js** - Already monitors cookies

---

## Example: Complete Integration for "Block Harmful" Toggle

**1. User clicks toggle in UI**
```javascript
// App.jsx
<Toggle
  checked={blockHarmful}
  onChange={(value) => {
    setBlockHarmful(value);
    window.postMessage({ 
      type: 'TOGGLE_BLOCK_HARMFUL', 
      payload: { enabled: value } 
    }, '*');
  }}
/>
```

**2. popup.js receives message**
```javascript
// popup.js
window.addEventListener('message', async (event) => {
  if (event.data.type === 'TOGGLE_BLOCK_HARMFUL') {
    const { enabled } = event.data.payload;
    
    if (enabled) {
      // Call existing function from cookieManager.js
      const results = await scanAndProcessCookies();
      
      // Send results back to React
      window.postMessage({
        type: 'SCRAMBLE_COMPLETE',
        payload: results
      }, '*');
    }
  }
});
```

**3. React updates UI**
```javascript
// App.jsx
useEffect(() => {
  window.addEventListener('message', (event) => {
    if (event.data.type === 'SCRAMBLE_COMPLETE') {
      console.log('Scrambled:', event.data.payload.scrambled);
      // Refresh cookie list
      window.postMessage({ type: 'GET_COOKIES' }, '*');
    }
  });
}, []);
```

---

## Notes

- The React app is already built and compiled into `extension/assets/`
- To rebuild after changes: `npm run build` (check package.json for exact command)
- popup.js is the bridge between React UI and browser extension APIs
- cookieManager.js already has all the cookie manipulation logic
- You just need to connect the UI events to the existing backend functions
