# Roadmap

## M0 — Foundation

Status: Complete

Goals:

- Approve product proposal
- Approve MVP requirements
- Approve initial architecture
- Establish repository documentation
- Record initial design decisions
- Define contribution and review workflow

Completion conditions:

- Foundation documents are merged
- Initial ADR backlog is agreed
- First implementation vertical slice can be created without undocumented assumptions

## M1 — Viewport Foundation

Status: In progress

Goals:

- Validate Chromium extension feasibility
- Establish minimal build and test environment
- Establish stable production browser capability contracts
- Implement safe Chromium viewport ownership and cleanup adapters
- Provide built-in viewport presets
- Support preset selection and reset
- Persist user-created presets locally
- Provide clear error states

Not included:

- JSON sharing
- Screenshots
- Design overlay
- Inspection features

## M2 — Preset Sharing

Goals:

- Define versioned JSON Schema
- Import with validation and preview
- Export deterministic preset documents
- Preserve last valid data on failure
- Document migration rules

## M3 — Design Compare

Goals:

- Load local PNG, JPEG, and WebP assets
- Control opacity, scale, position, and layer placement
- Reset and remove without leaving page mutations
- Handle oversized and unsupported files safely

## M4 — Inspection

Goals:

- Horizontal overflow detection
- Tap-target inspection
- Focus-order visualization
- Evidence-based findings and complete cleanup

NeutrA11y integration remains deferred. Built-in MVP checks must not establish an incompatible NeutrA11y contract prematurely.

## M5 — Screenshot Workflow

Goals:

- Capture selected and all viewport presets
- Report per-size progress and partial failures
- Restore viewport state after completion or cancellation
- Produce deterministic, collision-safe file names

## M6 — Breakpoint Comparison

Goals:

- Compare selected responsive states
- Preserve viewport identity and navigation context
- Support efficient manual design review

## Future candidates

The following are candidates, not committed milestones:

- Review annotations and export
- Visual regression
- Typography, spacing, grid, and asset inspection
- Performance analysis
- NeutrA11y integration
- npm-guardian integration
- CLI and editor integrations
- GitHub Actions
- Public plugin SDK
- AI-assisted explanations and recommendations

Each candidate requires a separate proposal, impact review, security review, and roadmap decision.
