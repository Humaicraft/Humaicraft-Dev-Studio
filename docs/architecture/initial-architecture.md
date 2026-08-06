# Initial Architecture

## 1. Architectural goals

The initial architecture must support a Chromium extension MVP without coupling product rules to Chrome APIs, page DOM mutation, or storage implementation details.

Priorities:

1. User and data safety
2. Correctness and honest failure handling
3. Maintainability and understandability
4. Accessibility
5. Reproducibility and operability
6. Performance
7. Development speed

## 2. Recommended delivery surface

A Chromium extension is the recommended first surface because the MVP requires direct interaction with browser tabs, page dimensions, screenshots, and injected inspection overlays.

This must be confirmed through an early technical spike covering:

- Manifest V3 constraints
- Viewport emulation feasibility
- Screenshot APIs and full-page limitations
- Restricted browser pages
- Permission prompts and optional permissions
- Interactions with open DevTools sessions
- Arc, Chrome, Edge, and Brave compatibility expectations

The spike may change the adapter strategy without changing the domain model.

## 3. Layered structure

```text
apps/
  browser-extension/

packages/
  core/
  viewport/
  presets/
  inspection/
  design-overlay/
  screenshot/
  ui/
  browser-adapter/

shared/
  schemas/
  types/
```

This is a direction, not a requirement to create every directory immediately. Packages are introduced only when they contain a real responsibility and independent tests.

### 3.1 Presentation

Responsibilities:

- Render Studio controls and results
- Manage user interaction state
- Provide accessible labels, focus behavior, and errors
- Invoke application use cases

Must not:

- Call Chrome APIs directly
- Contain inspection algorithms
- Parse unvalidated imported configuration

### 3.2 Application

Responsibilities:

- Coordinate use cases
- Manage progress, cancellation, and partial failures
- Compose domain services and ports
- Convert domain outcomes into presentation-ready states

Example use cases:

- ApplyViewportPreset
- ImportViewportPresets
- CaptureViewportSet
- RunOverflowInspection
- ShowDesignOverlay

### 3.3 Domain

Responsibilities:

- Preset validation and conflict rules
- Import planning
- Inspection result models
- Screenshot job state
- Overlay configuration rules
- Error categories

The domain must be independent from browser globals, framework APIs, and storage implementations.

### 3.4 Ports

Ports define capabilities required by the application.

Initial candidates:

- ViewportController
- PresetRepository
- PageInspector
- ScreenshotCapture
- DesignAssetReader
- OverlayRenderer
- Clock
- Logger

Interfaces should be introduced with the use case that needs them, not as speculative abstractions.

### 3.5 Adapters

Adapters implement ports for the browser environment.

Examples:

- ChromiumViewportAdapter
- ChromeStoragePresetRepository
- ContentScriptPageInspector
- BrowserScreenshotAdapter
- LocalDesignAssetReader
- IsolatedOverlayRenderer

All browser-specific failures must be translated into stable application error types.

## 4. Runtime boundaries

A browser extension may include multiple isolated runtimes:

- Extension UI
- Background service worker
- Content script
- Target page

Messages crossing these boundaries must use validated, versioned payloads. The receiver must not trust the sender merely because both belong to the extension.

Each message should include:

- Message type
- Payload schema version
- Correlation identifier for long-running work
- Validated payload

Unknown message types and unsupported versions fail closed.

## 5. Storage

MVP data is local-first.

Persisted data includes:

- Viewport presets
- User preferences
- Optional recent configuration metadata

Design images and screenshots should not be stored persistently unless the user explicitly requests it.

Storage records require:

- Explicit schema version
- Validation on read and write
- Migration strategy before incompatible changes
- Recovery from invalid state

The last valid configuration should be preserved during import or migration failures.

## 6. JSON preset format

A shared preset document should contain:

```json
{
  "schemaVersion": 1,
  "kind": "humaicraft.dev-studio.viewport-presets",
  "presets": []
}
```

Rules:

- `schemaVersion` is an integer.
- `kind` prevents accidental import of unrelated JSON.
- Stable preset identifiers are required.
- Numeric values use defined minimum and maximum ranges.
- Import validation completes before persistence.
- Unsupported versions fail without modifying stored data.

A formal JSON Schema should be added with the first preset implementation.

## 7. Page inspection

Inspection code runs in a constrained page context through a content-script adapter.

Requirements:

- Treat target DOM and page scripts as untrusted.
- Avoid evaluating page-provided strings.
- Use deterministic markers for injected nodes.
- Keep injected styles scoped.
- Track and remove every listener, observer, style, and node.
- Stop work on navigation, cancellation, or feature disablement.
- Return serializable evidence rather than live DOM references.

Selectors are hints for identification, not trusted persistent identifiers.

## 8. Design overlay

The overlay renderer must be isolated from page styles and events as much as the platform allows.

Recommended properties:

- Dedicated top-level host with a unique marker
- Shadow DOM where compatible with required behavior
- Explicit z-index strategy
- Pointer-events disabled by default
- No mutation of author elements
- Complete cleanup and idempotent reset
- Object URLs revoked after use

Imported files require type, size, and dimension validation before rendering.

## 9. Screenshot orchestration

Screenshot capture is modeled as a job with independent steps per viewport.

States:

- Pending
- Running
- Succeeded
- Failed
- Cancelled

A job may complete with partial failure. Each result records the requested viewport, actual viewport if known, file metadata, and error category.

Capture adapters must define timeout and cleanup behavior. Viewport state must be restored after success, failure, or cancellation.

## 10. Accessibility engine boundary

The MVP includes focused built-in checks for target size and focus order. It does not depend on NeutrA11y.

Future accessibility engines may integrate through an inspection boundary that accepts a normalized page context and returns normalized findings.

No NeutrA11y package, protocol, or schema is committed until NeutrA11y itself has an approved implementation contract.

## 11. Security model

### Trust boundaries

- Imported files
- Target page DOM and scripts
- Extension runtime messages
- Browser APIs and permission state
- Persisted local data

### Controls

- Least-privilege permissions
- Validation at every boundary
- No dynamic code execution
- No external transmission by default
- No sensitive logging
- Size and timeout limits
- Explicit user action for file access and destructive changes
- Safe cleanup after injected functionality

A browser-permission inventory must be reviewed before implementation is considered complete.

## 12. Testing strategy

### Domain tests

Run without a browser and cover validation, state transitions, import plans, and error mapping.

### Adapter contract tests

Use fakes or controlled browser fixtures to verify each port implementation.

### Extension integration tests

Verify runtime messaging, storage, injection lifecycle, and permission handling.

### End-to-end tests

Use a controlled test site with fixtures for overflow, focus order, target sizes, responsive layouts, and hostile page styles.

### Accessibility tests

Test the Studio UI with keyboard operation, automated checks, manual focus review, reduced motion, and narrow layouts.

## 13. Initial vertical slice

The first production slice should implement only:

1. A built-in viewport preset list
2. Preset selection
3. Local persistence of a user-created preset
4. Validation and clear failure states
5. Reset to a known viewport state
6. Unit and integration tests for the slice

JSON import/export, screenshots, and inspection follow as separate issues and PRs.

## 14. Migration and rollback

- Every persisted schema change requires a migration plan.
- Failed migrations preserve the previous data.
- Feature work remains isolated in small PRs.
- Releases must support returning to the previous extension package.
- Browser-injected state must be removable independently of stored configuration.

## 15. Deferred decisions

The following require future Issues or ADRs:

- TypeScript 7 migration
- UI framework introduction, if a demonstrated requirement justifies one
- Browser-extension framework introduction, if measured maintenance cost justifies one
- State-management library
- Screenshot implementation strategy
- Monorepo tooling introduction, if independently versioned responsibilities require it
- License
- Public package naming
- Plugin SDK
- AI provider architecture

The initial production toolchain and the decision to begin without UI, extension, or monorepo frameworks are recorded in [ADR 0001](../decisions/0001-production-toolchain.md).
