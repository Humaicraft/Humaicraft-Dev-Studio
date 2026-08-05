# Chromium Extension Delivery-Surface Spike

Status: In progress

Related: Issue #3

## Purpose

Validate Chromium Manifest V3 as the first delivery surface without treating disposable spike code as production architecture.

## Included proof of concept

The extension under `spikes/chromium-extension/` provides:

- Exact viewport override experiment through `chrome.debugger`
- Viewport reset and debugger detach experiment
- Visible-area screenshot capture through `chrome.tabs.captureVisibleTab`
- Isolated content-script page-width measurement
- Temporary marker injection with automatic cleanup
- Recovery-state diagnostics using `chrome.storage.session`
- Explicit errors for unsupported pages and invalid dimensions

The extension has no build step and no runtime dependencies.

## Load instructions

1. Open the browser extension-management page.
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select `spikes/chromium-extension/`.
5. Open a non-sensitive HTTP or HTTPS test page.
6. Open the extension popup and execute one action at a time.

Do not use production administration screens, authenticated customer data, payment pages, or other sensitive pages during the spike.

## Current permissions

| Permission | Experiment | Justification | Production decision |
| --- | --- | --- | --- |
| `activeTab` | Current-page actions | Grants temporary access after explicit extension interaction | May not cover asynchronous popup-to-worker execution reliably by itself |
| `debugger` | Exact viewport override | Required to test CDP emulation feasibility | High-risk; pending recovery evidence |
| `scripting` | Width inspection and marker | Runs isolated, explicit page measurement | Viable in Chrome with explicit current-origin permission |
| `storage` | Recovery diagnostics | Stores only tab ID, dimensions, timestamps, and debugger detach reason in session storage | Spike-only evidence; production persistence still undecided |
| `tabs` | Active-tab metadata and capture orchestration | Needed by the current proof of concept | Review whether reducible |
| Optional `http://*/*`, `https://*/*` | Current-origin access | Requested only for the active page origin immediately before screenshot or inspection | Preferred over permanent broad host access for the spike |

The Permissions API does not require a manifest permission named `permissions`. Chrome reported that entry as unknown, so it was removed in spike version `0.0.3`.

No telemetry, remote requests, or persistent page-content storage are included.

## Verification matrix

Record evidence; do not mark a result from assumption.

| Scenario | Chrome | Edge | Arc | Brave | Notes |
| --- | --- | --- | --- | --- | --- |
| Extension loads | Pass | Not tested | Not tested | Not tested | Chrome unpacked extension loaded successfully |
| Apply 1280 × 800 | Pass | Not tested | Not tested | Not tested | Popup reported `Viewport applied: 1280 × 800.` |
| Reset viewport | Pass | Not tested | Not tested | Not tested | Current worker ownership was confirmed before apply and cleared after reset |
| Navigate while active | Not tested | Not tested | Not tested | Not tested | Recovery diagnostics added in `0.0.4` |
| Close tab while active | Not tested | Not tested | Not tested | Not tested | Recovery diagnostics added in `0.0.4` |
| Reload extension while active | Not tested | Not tested | Not tested | Not tested | Session storage and ownership reconciliation must be observed |
| Open DevTools conflict | Partial pass | Not tested | Not tested | Not tested | Ownership can now be distinguished from an unknown debugger client |
| Capture visible area | Pass | Not tested | Not tested | Not tested | Optional current-origin permission allowed local visible-area PNG capture |
| Inspect width and remove marker | Pass | Not tested | Not tested | Not tested | Width and overflow measurement succeeded; marker cleanup confirmed |
| Restricted page error | Not tested | Not tested | Not tested | Not tested | |
| Permission-denied behavior | Pass | Not tested | Not tested | Not tested | Browser surfaced missing host permission without leaking page content |
| Manifest validation | Fixed | Not tested | Not tested | Not tested | Removed unknown `permissions` manifest entry |

## Evidence from Chrome runs

### Core path

Chrome successfully demonstrated:

- Exact viewport apply at `1280 × 800`
- Current-worker debugger ownership while active
- Viewport reset and ownership release
- Local visible-area screenshot capture
- Horizontal-overflow inspection
- Temporary marker cleanup

### Debugger ownership sequence

After spike version `0.0.3`, the expected sequence was confirmed:

1. No debugger client attached before apply
2. Current extension worker owns the session after apply
3. No debugger client attached after reset

This confirms that current-worker ownership can be tracked during one live service-worker instance. It does not prove durable recovery after extension reload or worker suspension.

### Inspection

```text
Viewport width: 1280px
Page scroll width: 1310px
Horizontal overflow: detected
Temporary marker cleanup: confirmed
```

The measured page exceeded the CSS viewport by 30 pixels. The inspector returned serializable evidence and did not expose page HTML, form values, cookies, credentials, or live DOM references.

## Findings

### Page-access boundary

Relying on `activeTab` alone was not trustworthy for the popup-to-service-worker execution path. The spike now requests optional access only to the current HTTP or HTTPS origin when the user selects screenshot or inspection.

### Debugger ownership boundary

`chrome.debugger.getTargets()` can show that a target is attached, but it cannot prove which client owns it. The spike therefore tracks sessions attached by the current worker and reports unknown ownership honestly.

Production design must:

- Track extension-owned sessions explicitly
- Treat in-memory ownership as volatile
- Persist only the minimum recovery metadata needed
- Reconcile persisted state with current browser targets after worker restart
- Never detach a debugger client that cannot be attributed safely
- Surface ambiguous ownership honestly

### Recovery diagnostics boundary

Spike version `0.0.4` stores only the following in `chrome.storage.session`:

- Active tab ID
- Requested viewport dimensions
- Apply timestamp
- Last debugger detach reason and timestamp

It does not store URLs, page HTML, screenshots, credentials, form values, cookies, or tokens. Session storage is diagnostic evidence, not an approved production repository design.

## Manual verification procedure

After pulling the latest spike branch, reload the unpacked extension before retesting.

### Navigation while active

1. Apply `1280 × 800`.
2. Select **Check recovery state** and confirm a stored session exists for the active tab.
3. Navigate to another normal HTTPS page in the same tab.
4. Select **Check recovery state** again.
5. Record debugger ownership, stored session state, and any detach reason.
6. Select **Reset viewport** when possible.

### Extension reload while active

1. Apply `1280 × 800`.
2. Confirm **Check recovery state** reports current-worker ownership and a stored session.
3. Reload the extension from the extension-management page.
4. Return to the test tab and select **Check recovery state**.
5. Record whether the debugger remains attached, ownership becomes unknown, the stored session survives, and reset remains possible.

### Tab closure while active

1. Apply `1280 × 800` in a disposable test tab.
2. Close that tab.
3. Open another normal HTTPS tab.
4. Select **Check recovery state**.
5. Record whether a stored session remains for another tab and whether a detach reason was recorded.

### Restricted pages

Open each target and invoke an action:

- `chrome://extensions/`
- Chrome Web Store
- A PDF viewer page

Record the exact user-visible error. The extension must fail without modifying the page or claiming success.

## Known design risks

- Durable debugger-session ownership after worker suspension or extension reload
- Safe recovery when a tab navigates, closes, or changes process
- DevTools and other debugger-client conflicts
- Full-page screenshot capture and stitching
- Browser differences across Edge, Arc, and Brave
- Optional-origin permission lifetime and revocation UX

## Preliminary architecture boundary

If the spike proceeds, browser capabilities should remain behind ports such as:

- `ViewportController`
- `DebuggerSessionRepository`
- `ScreenshotCapture`
- `PageInspector`
- `PageAccessController`

The popup must not become the domain or application layer. Browser errors must be normalized before presentation.

## Recommendation

**Preliminary recommendation: Proceed with constraints.**

The Chrome extension delivery surface is viable for exact viewport control, visible screenshots, isolated inspection, explicit cleanup, and current-worker debugger ownership. Production architecture must still resolve durable recovery, restricted pages, full-page screenshots, and browser compatibility.

## Completion record

- [ ] Verification matrix completed where browsers are available
- [x] Exact viewport feasibility demonstrated in Chrome
- [ ] Navigation, tab-close, and extension-reload recovery decided
- [ ] Minimum permission set finalized
- [x] Visible-area screenshot feasibility demonstrated in Chrome
- [ ] Full screenshot limitations decided
- [ ] Restricted-page behavior decided
- [x] Permission-denied behavior recorded
- [x] Isolated overflow evidence demonstrated in Chrome
- [x] Marker cleanup explicitly confirmed
- [x] Invalid manifest permission removed
- [x] Current-worker debugger ownership demonstrated
- [ ] Security and accessibility observations completed
- [ ] Final recommendation approved in Issue #3
