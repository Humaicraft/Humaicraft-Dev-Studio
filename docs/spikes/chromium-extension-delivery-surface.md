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
| `activeTab` | Current-page actions | Limits page access to explicit user interaction | Pending |
| `debugger` | Exact viewport override | Required to test CDP emulation feasibility | High-risk; pending evidence |
| `scripting` | Width inspection and marker | Runs isolated, explicit page measurement | Pending |
| `tabs` | Active-tab metadata and capture orchestration | Needed by the current proof of concept | Review whether reducible |

No host permissions, telemetry, remote requests, or persistent storage are included.

## Verification matrix

Record evidence; do not mark a result from assumption.

| Scenario | Chrome | Edge | Arc | Brave | Notes |
| --- | --- | --- | --- | --- | --- |
| Extension loads | Not tested | Not tested | Not tested | Not tested | |
| Apply 1280 × 800 | Not tested | Not tested | Not tested | Not tested | |
| Reset viewport | Not tested | Not tested | Not tested | Not tested | |
| Navigate while active | Not tested | Not tested | Not tested | Not tested | |
| Close tab while active | Not tested | Not tested | Not tested | Not tested | |
| Reload extension while active | Not tested | Not tested | Not tested | Not tested | |
| Open DevTools conflict | Not tested | Not tested | Not tested | Not tested | |
| Capture visible area | Not tested | Not tested | Not tested | Not tested | |
| Inspect width and remove marker | Not tested | Not tested | Not tested | Not tested | |
| Restricted page error | Not tested | Not tested | Not tested | Not tested | |
| Permission-denied behavior | Not tested | Not tested | Not tested | Not tested | |

## Manual verification procedure

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
2. Confirm only the visible area is captured.
3. Confirm the file remains local.
4. Record behavior with a large viewport, high DPR display, fixed elements, and browser zoom.

### Inspection and cleanup

1. Select **Inspect page width**.
2. Confirm a temporary marker appears.
3. Confirm the marker disappears automatically.
4. Inspect the DOM and confirm no marker remains.
5. Test a page with intentional horizontal overflow.

### Failure paths

Test:

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

The popup must not become the domain or application layer. Browser errors must be normalized before presentation.

## Recommendation

Not decided. Complete the matrix with reproducible evidence, then choose:

- Proceed
- Proceed with constraints
- Reject extension-first delivery

## Completion record

- [ ] Verification matrix completed where browsers are available
- [ ] Exact viewport feasibility decided
- [ ] Debugger conflict and recovery risks decided
- [ ] Minimum permission set decided
- [ ] Screenshot limitations decided
- [ ] Restricted-page behavior decided
- [ ] Security and accessibility observations recorded
- [ ] Final recommendation approved in Issue #3
