# Browser Capability Boundaries

Status: Approved for production implementation

Related: Issue #5, derived from Issue #3

## 1. Purpose

Define the minimum production boundaries required to use browser APIs without coupling product rules, presentation code, or domain logic to Chromium-specific behavior.

The disposable spike is evidence only. Its files must not be copied into production unchanged.

## 2. Invariants

The following rules are mandatory:

1. Browser globals are available only inside browser adapters.
2. Presentation code invokes application use cases, not browser APIs.
3. Browser and page inputs are untrusted and validated at the boundary.
4. Unknown debugger ownership fails closed.
5. A debugger client is detached only when Dev Studio ownership is attributable.
6. Permission requests are explicit, capability-specific, and triggered by user action.
7. Errors are normalized before reaching presentation or logs.
8. URLs, page HTML, form values, credentials, cookies, tokens, and screenshot bytes are not logged.
9. Cleanup is idempotent and runs after success, failure, cancellation, navigation, and target closure where applicable.
10. Capability availability is explicit; unsupported actions never report success.

## 3. Layer responsibilities

### Presentation

- Render controls, availability, progress, results, and recovery guidance.
- Preserve keyboard operation, visible focus, and semantic live status messaging.
- Never call `chrome.*`, access the target DOM, or interpret raw browser errors.

### Application

- Coordinate one use case at a time.
- Validate use-case input using domain values.
- Invoke capability ports.
- Map normalized outcomes into presentation states.
- Own cancellation and partial-failure policy.

### Domain

- Define viewport dimensions, capability identifiers, lifecycle states, and stable error categories.
- Remain independent from extension runtimes, storage, frameworks, and browser APIs.

### Browser adapters

- Implement narrow ports with Chromium APIs.
- Validate tab metadata and page-derived values.
- Translate raw errors into normalized failures.
- Perform bounded cleanup without touching unknown external sessions.

## 4. Initial ports

Ports are introduced only when a demonstrated use case consumes them.

### `ViewportController`

Responsibilities:

- Apply validated viewport dimensions to a target.
- Clear an applied viewport override.
- Report whether the operation succeeded, is unsupported, or needs recovery.

Must not:

- Persist user presets.
- Own UI state.
- Detach sessions whose ownership is unknown.

### `DebuggerSessionRepository`

Responsibilities:

- Record minimum Dev Studio-owned session metadata.
- Reconcile stored evidence with current browser targets.
- Remove stale Dev Studio records.
- Distinguish owned, external-or-unknown, and detached states.

Stored records must be schema-versioned and must not include URLs or page content.

Stored records contain evidence only and never carry an ownership claim. `owned`, `external_or_unknown`, and `detached` exist only on the result of live reconciliation. Code must not authorize debugger detach from a stored record returned by `read`.

### `PageAccessController`

Responsibilities:

- Classify whether an action needs host access.
- Check current permission state.
- Request only the active origin when required and explicitly initiated.
- Return granted, denied, unsupported, or unavailable outcomes.

### `ScreenshotCapture`

Responsibilities:

- Capture the supported scope described by the capability result.
- Keep screenshot bytes local by default.
- Return safe file metadata without page titles, URLs, or account identifiers.
- Release temporary data after handoff.

### `PageInspector`

Responsibilities:

- Execute isolated, bounded inspection.
- Return serializable evidence only.
- Track and remove injected markers, styles, observers, and listeners.
- Stop on cancellation or target invalidation.

## 5. Stable result model

Every capability returns a discriminated result rather than throwing raw browser errors across layers.

```text
CapabilityResult<T>
├── success
│   └── value: T
└── failure
    ├── code
    ├── recoverability
    └── safeContext
```

Initial error categories:

- `active_target_unavailable`
- `unsupported_page`
- `permission_denied`
- `permission_unavailable`
- `debugger_conflict`
- `debugger_ownership_unknown`
- `target_closed`
- `target_changed`
- `operation_cancelled`
- `operation_timed_out`
- `browser_operation_failed`
- `invalid_message`
- `invalid_state`

`safeContext` may contain bounded technical identifiers such as capability name or lifecycle code. It must not contain sensitive URLs, page content, screenshot bytes, tokens, or form data.

## 6. Runtime messages

Messages crossing popup, service worker, content script, or future extension-page boundaries require:

- Envelope version
- Message type
- Correlation identifier for long-running work
- Validated payload
- Normalized response

Unknown versions and message types fail closed.

The receiving runtime validates every message independently. Extension ownership is not a trust substitute.

## 7. Session ownership and recovery

The spike established these production rules:

- Ordinary navigation in the same tab may preserve a viewport session while ownership remains attributable.
- Tab closure or confirmed detach invalidates the session and removes stale Dev Studio metadata.
- Extension reload, update, disablement, or ownership ambiguity does not trigger automatic restoration.
- The user explicitly reapplies the viewport after an extension lifecycle reset.
- Stored state is evidence for reconciliation, not proof that Dev Studio owns a debugger client.

## 8. Capability availability

Availability is evaluated per action because a target may support viewport control but not script injection, or screenshot capture but not inspection.

```text
CapabilityAvailability
├── available
├── requires_permission
├── unsupported_target
├── conflicting_client
└── temporarily_unavailable
```

Presentation must explain unavailable actions before or after invocation with an accurate recovery path. State must not rely on color alone.

## 9. Testing obligations

### Unit tests

- Domain value validation
- Error normalization
- Capability result mapping
- Session state transitions
- Message-envelope validation

### Adapter contract tests

- Permission granted and denied
- Unsupported page
- Missing or changed tab
- External debugger client
- Owned debugger apply and reset
- Target closure and stale-state cleanup
- Bounded timeout and cancellation

### Integration tests

- Popup or extension page → service worker messaging
- Service worker → isolated content script
- Storage schema validation and stale-record cleanup

### Manual browser verification

- Normal HTTPS page
- Navigation while active
- Tab closure while active
- Extension reload while active
- DevTools conflict
- Restricted pages
- No sensitive values in logs

## 10. Accessibility requirements

- Native controls and disabled semantics are preferred.
- All actions are keyboard operable.
- Focus remains visible.
- Status changes use semantic live regions.
- Errors identify both the problem and the available recovery action.
- Capability availability is understandable without color or icons.
- Reduced-motion preferences are respected by visual feedback.

## 11. Security review checklist

- Least privilege is maintained.
- Optional permission lifetime and revocation are visible to the user.
- No raw browser error or untrusted page value is rendered without normalization.
- No unknown debugger client is detached.
- No remote transmission is introduced.
- No sensitive data is logged or stored.
- Cleanup is idempotent and safe after partial failure.

## 12. Migration and rollback

This document introduces no persisted user data or runtime behavior.

Future implementations must version persisted session records and discard unknown versions safely. A rollback removes the production adapter and Dev Studio-owned metadata without changing external debugger clients or user page data.

## 13. Deferred decisions

The following remain separate decisions:

- Package manager and exact version
- TypeScript and build configuration
- UI framework
- Browser-extension framework
- Monorepo tooling
- Full-page screenshot strategy
- Firefox and Safari support

## 14. Production implementation map

The first executable slice implements only the stable contracts and boundary validation:

| Responsibility | Production location |
| --- | --- |
| Capability results, availability, recoverability, and safe context | `src/browser-capabilities/capability-result.ts` |
| Browser target validation | `src/browser-capabilities/browser-target.ts` |
| Viewport dimensions and recorded spike limits | `src/browser-capabilities/viewport.ts` |
| Five initial capability ports | `src/browser-capabilities/ports.ts` |
| Versioned runtime message-envelope validation | `src/browser-capabilities/runtime-message.ts` |
| Chromium error normalization | `src/browser-extension/chromium/normalize-browser-error.ts` |
| Narrow Chromium debugger and session-storage API surface | `src/browser-extension/chromium/chromium-api.ts` |
| Debugger-session evidence storage and live reconciliation | `src/browser-extension/chromium/debugger-session-repository.ts` |
| Viewport apply, reset, and owned-session cleanup | `src/browser-extension/chromium/viewport-controller.ts` |

The production viewport limits begin at `320 × 240` and end at `7680 × 4320`, matching the range exercised by the disposable Chromium spike. Changing these limits requires boundary evidence and tests.

This slice deliberately adds no browser permission, browser-global call, presentation component, persistence, or user-facing behavior. Concrete Chromium adapters will implement these contracts in subsequent Issue #5 changes. Manual Chrome verification remains required when the first adapter is connected to a production use case.

Contract tests run without browser globals and cover invalid targets, invalid viewport values, hostile objects, unsupported message versions and types, invalid payloads, permission denial, unsupported pages, missing tabs, debugger conflicts, unknown ownership, and raw-error redaction.

The Chromium adapter core follows these ownership rules:

- Only the current repository instance's in-memory ownership set can turn an attached target into `owned`.
- A replacement repository instance treats an attached target as `external_or_unknown`, even when stored evidence exists.
- A detached target clears stale evidence and returns `detached`.
- Viewport apply records current-worker ownership before issuing the emulation command.
- Apply failure clears the override when possible, detaches the attributable session, and removes its record.
- Reset does nothing to `external_or_unknown` sessions.
- Reset preserves attributable evidence when detach fails so the user can retry safely.
- Successful detach removes stored evidence; detach is the authoritative cleanup path when clearing the emulation command fails.

The adapter core depends only on injected Chromium API contracts. It does not bind `globalThis.chrome`, change the manifest, request a permission, register a runtime message, or expose a user action. Browser-runtime composition and manual Chrome verification remain a separate review step.

Rolling back only the adapter core removes the Chromium API contract, session repository, viewport controller, and their adapter tests. The browser-independent capability contracts remain available for a replacement adapter design. No browser or user-data cleanup is required because the adapter core is not connected to the production runtime.

Rollback removes `src/browser-capabilities/`, the Chromium normalizer, and their tests. Because this slice changes no manifest permission, browser session, page state, or persisted data, rollback requires no user-data migration or browser cleanup.
