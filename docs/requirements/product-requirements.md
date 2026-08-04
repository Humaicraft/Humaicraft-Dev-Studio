# Product Requirements

## 1. Scope classification

### MVP

- Viewport preset management
- Versioned JSON import and export
- One-click viewport switching
- Multi-viewport screenshots
- Horizontal overflow detection
- Tap-target inspection
- Focus-order inspection
- Breakpoint comparison
- Design-image overlay for PNG, JPEG, and WebP

### Later

- Review comments and annotations
- Visual regression workflows
- Typography and spacing inspection
- Performance and asset inspection
- NeutrA11y integration
- npm-guardian integration
- CLI, VS Code, and GitHub Actions integrations
- Public plugin SDK
- AI-assisted explanations

### Out of scope for MVP

- Automatic source-code changes
- Automatic publishing or deployment
- Cloud synchronization
- Team accounts and remote collaboration
- PDF design overlay
- Full browser replacement

## 2. Functional requirements

### 2.1 Viewport presets

The user can create, edit, delete, reorder, duplicate, and select viewport presets.

Each preset contains at minimum:

- Stable identifier
- Display name
- Width in CSS pixels
- Height in CSS pixels
- Device pixel ratio
- Device category
- Optional notes

Validation must reject unsupported types, missing required fields, duplicate identifiers, unsafe numeric ranges, and unsupported schema versions.

Deletion and destructive replacement require explicit confirmation or an immediately available undo path.

### 2.2 Viewport switching

Selecting a preset applies its viewport values through the browser adapter.

The UI must show:

- Requested viewport
- Actual applied viewport when available
- Failure or restriction reason
- A reset action

The application must not report success when the browser did not apply the requested state.

### 2.3 JSON sharing

The user can export presets to a versioned JSON document and import a supported document.

Import must:

- Parse locally
- Validate before writing
- Show additions, replacements, skipped entries, and errors
- Avoid partial silent success
- Preserve the previous stored configuration until the user confirms the valid result

Unknown future fields may be retained when safe, but unknown schema versions must fail closed with a clear message.

### 2.4 Multi-viewport screenshots

The user can capture the current page at selected or all configured viewport presets.

The workflow must show progress and per-size results.

A failed capture must not mark the entire job as successful. Successfully created captures may remain available with clear partial-failure status.

File names must be deterministic and safe for common filesystems. Existing files must not be overwritten without explicit user action.

### 2.5 Horizontal overflow detection

The Studio identifies elements that contribute to horizontal page overflow.

Each finding should include:

- Element reference or readable selector
- Bounding information
- Overflow amount when measurable
- Relevant viewport preset
- Detection limitations

The tool may suggest likely causes, but must distinguish measured evidence from inference.

### 2.6 Tap-target inspection

The Studio identifies interactive targets below the configured minimum target size.

The default policy should align with WCAG 2.2 AA considerations while allowing project-specific configuration.

Results must identify the element, measured dimensions, configured threshold, and applicable exception notes where known.

### 2.7 Focus-order inspection

The Studio visualizes keyboard focus order without removing native focus behavior.

The user can start, pause, reset, and clear the visualization.

The tool must not claim that an order is correct solely because every focusable element was discovered.

### 2.8 Breakpoint comparison

The user can compare selected viewport states side by side or through a controlled switching workflow.

The comparison must preserve a clear relationship between each rendered state and its preset.

The MVP does not require automated visual-difference scoring.

### 2.9 Design overlay

The user can load a local PNG, JPEG, or WebP design image and place it over or behind the rendered page.

Controls include:

- Visibility
- Opacity
- Scale
- Horizontal and vertical position
- Alignment origin
- Front or back placement
- Reset and remove

The overlay must be isolated from the target page, must not be included unintentionally in page actions, and must be removable without leaving page mutations.

## 3. Non-functional requirements

### 3.1 Privacy

Operation is local-first. Page contents, screenshots, URLs, preset files, and design assets are not transmitted externally by default.

### 3.2 Security

- Treat imported JSON and design files as untrusted.
- Validate schema, MIME type, extension, size, dimensions, and numeric ranges.
- Do not execute imported content.
- Use least-privilege browser permissions.
- Do not log cookies, tokens, credentials, personal data, page contents, or screenshot data.
- Fail safely on restricted browser pages and unsupported schemes.
- Define timeouts and size limits for long-running operations.

### 3.3 Accessibility

The Studio UI targets WCAG 2.2 AA.

At minimum:

- Semantic HTML controls
- Complete keyboard operation
- Visible focus indicators
- Logical focus movement
- Labels and accessible names
- No information conveyed by color alone
- Understandable error and recovery messages
- Reduced-motion support
- Responsive operation at 320 CSS pixels where applicable

### 3.4 Reliability

- Persisted settings use explicit schema versions.
- Writes should be atomic where the platform permits.
- Invalid configuration must not destroy the last valid state.
- Partial failures must be represented honestly.
- Reset operations must restore a known state.

### 3.5 Maintainability

Browser APIs, page DOM access, persistence, and file operations must be accessed through explicit adapters. Domain rules must be testable without launching a browser.

### 3.6 Performance

Inspection overlays and listeners must be removable. Continuous work must stop when the feature is disabled. The tool should avoid unnecessary full-page rescans and document any known impact.

## 4. Primary workflows

### Workflow A: Responsive check

1. Open a target page.
2. Select a viewport preset.
3. Confirm the applied size.
4. Move through configured presets.
5. Reset when complete.

### Workflow B: Shared preset import

1. Select a JSON file.
2. Validate it locally.
3. Review the import summary.
4. Confirm the change.
5. Restore the previous configuration if needed.

### Workflow C: Design comparison

1. Select a local design image.
2. Choose the matching viewport.
3. Align, scale, and position the image.
4. Adjust opacity or layer placement.
5. Remove the overlay cleanly.

### Workflow D: Page inspection

1. Choose overflow, target-size, or focus-order inspection.
2. Run the inspection for the current viewport.
3. Review highlighted elements and evidence.
4. Clear all injected visualization and listeners.

## 5. Error and recovery behavior

The Studio must provide specific handling for:

- Unsupported or restricted pages
- Missing permissions
- Invalid or oversized files
- Unsupported schema versions
- Browser capture failures
- Storage quota failures
- Page navigation during an operation
- DOM changes that invalidate findings
- Partial screenshot-job failures

Every user-facing error should explain what failed, what remains unchanged, and what the user can do next.

## 6. Testing requirements

### Unit tests

- Domain validation
- Preset ordering and conflict handling
- Import planning
- Safe file-name generation
- Inspection result normalization

### Integration tests

- Storage adapter
- Browser viewport adapter
- File import and export adapter
- Page injection lifecycle
- Screenshot orchestration

### End-to-end tests

- Core extension startup
- Preset selection and reset
- Valid and invalid JSON import
- Design overlay add, adjust, and remove
- Overflow finding and cleanup
- Focus-order visualization
- Permission-denied and restricted-page states

### Accessibility tests

- Keyboard-only operation
- Focus visibility and movement
- Accessible names
- 320-pixel responsive UI
- Reduced motion

### Boundary tests

- Minimum and maximum viewport dimensions
- Large preset collections
- Oversized images
- Unexpected MIME and extension combinations
- Storage quota exhaustion
- Navigation during capture

## 7. MVP completion criteria

- All approved MVP workflows are implemented or explicitly re-scoped through an Issue decision.
- Critical domain rules have automated tests.
- Restricted and failed operations do not report success.
- The Studio UI passes the agreed accessibility checks.
- Browser permissions and their purposes are documented.
- No sensitive values are written to logs.
- README, setup instructions, architecture, ROADMAP, and CHANGELOG are current.
- Known constraints and unsupported cases are documented.
- A reproducible release and rollback procedure exists before external distribution.
