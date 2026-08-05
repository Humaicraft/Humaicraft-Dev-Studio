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
| `scripting` | Width inspection and marker | Runs isolated, explicit page measurement | Viable in Chrome with explicit current-origin permission |
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
| Reset viewport | Partial pass | Not tested | Not tested | Not tested | Reset reported success, but another or unknown debugger client remained attached |
| Navigate while active | Not tested | Not tested | Not tested | Not tested | |
| Close tab while active | Not tested | Not tested | Not tested | Not tested | |
| Reload extension while active | Not tested | Not tested | Not tested | Not tested | |
| Open DevTools conflict | Evidence found | Not tested | Not tested | Not tested | Debugger target was attached before apply and remained attached after reset; ownership was ambiguous |
| Capture visible area | Pass | Not tested | Not tested | Not tested | Optional current-origin permission allowed local visible-area PNG capture |
| Inspect width and remove marker | Pass | Not tested | Not tested | Not tested | Width and overflow measurement succeeded; marker cleanup confirmed |
| Restricted page error | Not tested | Not tested | Not tested | Not tested | |
| Permission-denied behavior | Pass | Not tested | Not tested | Not tested | Browser surfaced missing host permission without leaking page content |
| Manifest validation | Fixed | Not tested | Not tested | Not tested | Removed unknown `permissions` manifest entry |

## Evidence from Chrome runs

### Viewport apply

```text
Viewport applied: 1280 × 800.
Use Reset viewport when finished.
```

### Viewport reset

```text
Viewport override cleared and debugger detached.
```

The target still appeared as debugger-attached after reset. `chrome.debugger.getTargets()` reports whether any debugger client is attached, but does not identify which client owns the session. The spike therefore no longer describes every attached target as owned by Humaicraft Dev Studio.

### Debugger status sequence

Before apply, after apply, and after reset, the original checker reported:

```text
Debugger is attached to the active tab (page).
```

This is evidence that debugger ownership cannot be inferred from target attachment alone. Possible causes include DevTools, another debugger client, or a debugger session surviving a service-worker lifecycle boundary.

Spike version `0.0.3` now distinguishes:

- A debugger session attached and tracked by the current extension service-worker instance
- A debugger client attached with unknown or external ownership
- No debugger client attached

The in-memory ownership set is intentionally not treated as durable production state because Manifest V3 service workers may suspend.

### Screenshot after optional-origin fix

```text
Visible-area screenshot prepared: humaicraft-dev-studio-visible-1785892206897.png
```

This demonstrates that visible-area capture can remain local and can succeed after explicit current-origin permission is granted.

### Inspection after optional-origin fix

```text
Viewport width: 1280px
Page scroll width: 1310px
Horizontal overflow: detected
Temporary marker cleanup: confirmed
```

The measured page exceeded the CSS viewport by 30 pixels. This demonstrates that isolated scripting can return serializable overflow evidence and can confirm cleanup of its temporary marker.

### Manifest warning

Chrome reported:

```text
Permission 'permissions' is unknown.
```

The invalid entry was removed. Runtime calls to `chrome.permissions.contains()` and `chrome.permissions.request()` continue to rely on `optional_host_permissions`, not a separate API permission.

### Initial permission failures before the fix

```text
Capture failed: Either the '<all_urls>' or 'activeTab' permission is required.
```

The browser also rejected scripting access to the active SharePoint origin because the manifest did not grant access to that host. The full authenticated URL is intentionally not copied into this findings document.

## Finding: activeTab execution boundary

Although the manifest included `activeTab`, screenshot capture and scripting failed when the popup delegated work to the background service worker. This demonstrates that relying on `activeTab` alone is not trustworthy for the selected runtime flow.

The spike now requests optional access only to the current HTTP or HTTPS origin at the moment the user selects screenshot or inspection. The user may deny the request, and denial must leave the page and stored state unchanged.

Retesting demonstrated that this current-origin permission strategy enables both visible screenshot capture and isolated page-width inspection in Chrome.

This is evidence for a production requirement: page-access ownership and permission lifetime must be explicit rather than assumed across extension runtimes.

## Finding: debugger ownership boundary

`chrome.debugger.getTargets()` can show that a target is attached, but it cannot prove that the current service-worker instance owns that attachment.

Production design must therefore:

- Track extension-owned sessions explicitly
- Treat in-memory ownership as volatile
- Persist only the minimum recovery metadata needed
- Reconcile persisted state with current browser targets after worker restart
- Never detach a debugger client that cannot be attributed safely
- Surface ambiguous ownership honestly to the user

The current spike tracks ownership only for the lifetime of the current worker. This is sufficient for evidence gathering but not production recovery.

## Finding: overflow evidence boundary

The page inspector returned only serializable measurements:

- CSS viewport width
- Document scroll width
- Boolean horizontal-overflow result
- Marker cleanup result

It did not return page HTML, form values, cookies, credentials, or live DOM references. This supports keeping future inspection results evidence-based and independent from page object lifetimes.

## Manual verification procedure

After pulling the latest spike branch, reload the unpacked extension before retesting.

### Viewport and debugger ownership

1. Close DevTools for the test tab.
2. Reload the unpacked extension.
3. Select **Check debugger status**.
4. Record whether there is no client, an unknown client, or a session owned by the current worker.
5. Apply `1280 × 800`.
6. Select **Check debugger status** again.
7. Confirm the current worker reports ownership.
8. Select **Reset viewport**.
9. Select **Check debugger status** again.
10. Confirm the current worker no longer reports ownership.
11. If another client remains attached, open and close DevTools deliberately and compare the result.

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
4. Confirm the final status reports `Temporary marker cleanup: confirmed`.
5. Test a page with intentional horizontal overflow.

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

`chrome.debugger` may conflict with DevTools or another debugger client. Target attachment alone cannot identify ownership. The current spike only tracks sessions attached by the current live service-worker instance.

### State restoration

The proof of concept keeps the debugger attached after applying a viewport so reset can clear the override. Reliable production restoration requires explicit persisted job/session state, reconciliation after worker restart, and safe handling of ambiguous ownership.

### Permission lifetime

Runtime permission grants may outlive one popup interaction depending on browser behavior and user choice. Production design must provide visibility and a way to revoke no-longer-needed site access.

### Screenshots

The proof of concept captures only the visible tab area. Full-page capture, scrolling, stitching, fixed-element duplication, lazy loading, animation, and memory limits remain unresolved.

### Browser differences

Chrome, Edge, Arc, and Brave are targets for evidence gathering. Compatibility has not yet been demonstrated outside Chrome.

### Page mutation

Temporary marker cleanup is confirmed in the tested Chrome path. Production overlays still require stronger lifecycle tracking, cancellation, idempotent cleanup, and navigation handling.

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

Current Chrome evidence demonstrates that the following core capabilities are technically viable:

- Exact viewport apply
- Explicit viewport reset command
- Local visible-area screenshot capture
- Isolated width and overflow inspection
- Verified temporary-marker cleanup
- Optional current-origin permission requests instead of permanent broad host access

The production architecture must not yet be finalized because the following remain unresolved:

- Durable debugger-session ownership and recovery
- Debugger conflict with DevTools
- Recovery after navigation, tab closure, extension reload, or service-worker suspension
- Restricted-page behavior
- Full-page screenshot strategy
- Edge, Arc, and Brave compatibility

## Completion record

- [ ] Verification matrix completed where browsers are available
- [x] Exact viewport feasibility demonstrated in Chrome
- [ ] Debugger conflict and recovery risks decided
- [ ] Minimum permission set finalized
- [x] Visible-area screenshot feasibility demonstrated in Chrome
- [ ] Full screenshot limitations decided
- [ ] Restricted-page behavior decided
- [x] Initial permission-denied behavior recorded
- [x] Isolated overflow evidence demonstrated in Chrome
- [x] Marker cleanup explicitly confirmed
- [x] Invalid manifest permission removed
- [ ] Security and accessibility observations completed
- [ ] Final recommendation approved in Issue #3
