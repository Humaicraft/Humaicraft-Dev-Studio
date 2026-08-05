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
| `permissions` | Site-specific permission request | Allows explicit runtime permission prompts | Keep only if optional-host strategy is approved |
| `scripting` | Width inspection and marker | Runs isolated, explicit page measurement | Pending |
| `tabs` | Active-tab metadata and capture orchestration | Needed by the current proof of concept | Review whether reducible |
| Optional `http://*/*`, `https://*/*` | Current-origin access | Requested only for the active page origin immediately before screenshot or inspection | Preferred over permanent broad host access for the spike |

No telemetry, remote requests, or persistent page-content storage are included.

## Verification matrix

Record evidence; do not mark a result from assumption.

| Scenario | Chrome | Edge | Arc | Brave | Notes |
| --- | --- | --- | --- | --- | --- |
| Extension loads | Pass | Not tested | Not tested | Not tested | Chrome unpacked extension loaded successfully |
| Apply 1280 × 800 | Pass | Not tested | Not tested | Not tested | Popup reported `Viewport applied: 1280 × 800.` |
| Reset viewport | Pass | Not tested | Not tested | Not tested | Popup reported override cleared and debugger detached |
| Navigate while active | Not tested | Not tested | Not tested | Not tested | |
| Close tab while active | Not tested | Not tested | Not tested | Not tested | |
| Reload extension while active | Not tested | Not tested | Not tested | Not tested | |
| Open DevTools conflict | Not tested | Not tested | Not tested | Not tested | |
| Capture visible area | Blocked before fix | Not tested | Not tested | Not tested | `activeTab` was insufficient in the tested execution path; optional current-origin request added |
| Inspect width and remove marker | Blocked before fix | Not tested | Not tested | Not tested | SharePoint origin access was denied; optional current-origin request added |
| Restricted page error | Not tested | Not tested | Not tested | Not tested | |
| Permission-denied behavior | Pass | Not tested | Not tested | Not tested | Browser surfaced missing host permission without leaking page content |

## Evidence from first Chrome run

### Viewport apply

```text
Viewport applied: 1280 × 800.
Use Reset viewport when finished.
```

### Viewport reset

```text
Viewport override cleared and debugger detached.
```

### Screenshot before optional-origin fix

```text
Capture failed: Either the '<all_urls>' or 'activeTab' permission is required.
```

### Inspection before optional-origin fix

The browser rejected scripting access to the active SharePoint origin because the manifest did not grant access to that host.

The full authenticated URL is intentionally not copied into this findings document.

## Finding: activeTab execution boundary

Although the manifest included `activeTab`, screenshot capture and scripting failed when the popup delegated work to the background service worker. This demonstrates that relying on `activeTab` alone is not yet trustworthy for the selected runtime flow.

The spike now requests optional access only to the current HTTP or HTTPS origin at the moment the user selects screenshot or inspection. The user may deny the request, and denial must leave the page and stored state unchanged.

This is evidence for a production requirement: page-access ownership and permission lifetime must be explicit rather than assumed across extension runtimes.

## Manual verification procedure

After pulling the latest spike branch, reload the unpacked extension before retesting.

### Viewport

1. Record the original page state.
2. Apply `1280 × 800`.
3. Confirm the reported CSS viewport with page-side developer tools.
4. Confirm the browser's debugger warning and user experience.
5. Navigate once and record whether the override persists.
6. Select **Reset viewport**.
7. Confirm the override is cleared and the debugger is detached.

### Screenshot

1. Select **Capture visible area**.
2. Approve current-site access when prompted.
3. Confirm only the visible area is captured.
4. Confirm the file remains local.
5. Record behavior with a large viewport, high DPR display, fixed elements, and browser zoom.

### Inspection and cleanup

1. Select **Inspect page width**.
2. Approve current-site access when prompted.
3. Confirm a temporary marker appears.
4. Confirm the marker disappears automatically.
5. Inspect the DOM and confirm no marker remains.
6. Test a page with intentional horizontal overflow.

### Failure paths

Test:

- Deny the current-site permission request
- `chrome://extensions/`
- Chrome Web Store
- PDF viewer
- A closed or navigated tab
- DevTools already attached
- Extension reload while viewport override is active

Record the exact visible message and whether manual recovery is required.

## Known design risks before verification

### Debugger ownership

`chrome.debugger` may conflict with DevTools or another debugger client. The current spike does not claim reliable ownership recovery after service-worker suspension, extension reload, or browser restart.

### State restoration

The proof of concept keeps the debugger attached after applying a viewport so reset can clear the override. Reliable production restoration requires explicit persisted job/session state and recovery rules.

### Permission lifetime

Runtime permission grants may outlive one popup interaction depending on browser behavior and user choice. Production design must provide visibility and a way to revoke no-longer-needed site access.

### Screenshots

The proof of concept captures only the visible tab area. Full-page capture, scrolling, stitching, fixed-element duplication, lazy loading, animation, and memory limits remain unresolved.

### Browser differences

Chrome, Edge, Arc, and Brave are targets for evidence gathering. Compatibility has not yet been demonstrated.

### Page mutation

The marker uses one uniquely identified node and removes itself. Production overlays require stronger lifecycle tracking, cancellation, idempotent cleanup, and navigation handling.

## Preliminary architecture boundary

If the spike proceeds, browser capabilities should remain behind ports such as:

- `ViewportController`
- `ScreenshotCapture`
- `PageInspector`
- `PageAccessController`

The popup must not become the domain or application layer. Browser errors must be normalized before presentation.

## Recommendation

Not decided. Current evidence supports exact viewport apply/reset in Chrome, but screenshot and inspection must be retested after the optional current-origin permission fix. Recovery, DevTools conflict, and browser compatibility remain open.

Choose after evidence is complete:

- Proceed
- Proceed with constraints
- Reject extension-first delivery

## Completion record

- [ ] Verification matrix completed where browsers are available
- [x] Exact viewport feasibility demonstrated in Chrome
- [ ] Debugger conflict and recovery risks decided
- [ ] Minimum permission set decided
- [ ] Screenshot limitations decided
- [ ] Restricted-page behavior decided
- [x] Initial permission-denied behavior recorded
- [ ] Security and accessibility observations completed
- [ ] Final recommendation approved in Issue #3
