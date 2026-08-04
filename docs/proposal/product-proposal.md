# Product Proposal

## 1. Purpose

Humaicraft Dev Studio reduces repetitive frontend implementation and review work by bringing responsive preview, design comparison, inspection, screenshots, and review support into one coherent workspace.

It is not intended to replace browser developer tools, designers, reviewers, or engineers. It complements them by making common verification workflows faster, repeatable, and shareable.

## 2. Target users

### Primary users

- Frontend developers implementing responsive websites
- Web engineers reviewing HTML, CSS, JavaScript, and CMS-generated pages

### Secondary users

- Designers comparing implementation against supplied design assets
- Technical directors and reviewers performing visual and quality checks

## 3. Problem statement

Frontend developers repeatedly switch between browser developer tools, design tools, screenshot utilities, accessibility tools, and written review notes.

This creates several problems:

- Viewport sizes are entered and managed inconsistently.
- Multi-size screenshots require repeated manual work.
- Horizontal overflow and breakpoint-specific defects are easy to miss.
- Design comparison requires switching tools or manually aligning images.
- Focus order and target-size checks are time-consuming.
- Review conditions are difficult to reproduce across team members.
- Existing tools expose useful data but do not provide one continuous production workflow.

## 4. Product vision

Humaicraft Dev Studio will become a frontend development workspace where developers can inspect, compare, capture, and review a page without losing context.

The product should feel like a trusted teammate: it surfaces evidence, explains detected conditions, preserves developer control, and avoids hidden or destructive behavior.

## 5. Product principle

> Every feature must reduce at least one repetitive task in a frontend developer's daily workflow.

Features that do not improve a concrete workflow should not enter the product merely because they are technically possible.

## 6. Proposed value

The Studio should provide:

- Fast switching between agreed viewport presets
- Reproducible checks through versioned local configuration
- One action to capture multiple responsive states
- Visual evidence for overflow, focus order, and target-size concerns
- Accurate alignment between an implementation and a supplied design image
- Clear boundaries between detection, recommendation, and human decisions

## 7. Differentiation

The product is not positioned as another isolated testing tool. Its differentiation is the integration of implementation and review activities into a local-first workflow.

Key characteristics:

- Designed around daily frontend work rather than one-time audits
- Local-first and privacy-preserving by default
- Human-controlled decisions and explicit actions
- Reusable engines separated from browser-specific adapters
- Accessibility of the Studio itself treated as a product requirement
- Incremental growth without requiring a plugin ecosystem in the MVP

## 8. MVP boundary

The MVP includes:

- One-click viewport switching
- Viewport preset creation, editing, deletion, ordering, and local persistence
- Versioned JSON import and export
- Screenshots for all configured viewport sizes
- Horizontal overflow detection
- Tap-target inspection
- Focus-order inspection
- Breakpoint comparison
- PNG, JPEG, and WebP design-image overlay
- Overlay opacity, scale, position, visibility, and reset controls

The MVP does not include:

- NeutrA11y integration
- npm-guardian integration
- AI-generated fixes
- Automatic source-code modification
- VS Code, CLI, or GitHub Actions integrations
- Public plugin SDK
- Cloud synchronization or collaboration
- PDF design overlay

## 9. Delivery direction

A Chromium browser extension is the recommended first delivery surface because the initial workflows depend on direct page interaction and browser APIs.

This is a proposal rather than an irreversible commitment. A technical spike must confirm permissions, capture limitations, restricted-page behavior, and compatibility before the delivery surface is finalized.

## 10. Risks and mitigations

### Excessive browser permissions

Use least privilege, request optional permissions only when needed, and document why each permission exists.

### Page interference

Inspection and overlay layers must be isolated, removable, and restored without permanently mutating the target page.

### Sensitive content exposure

Page contents, screenshots, URLs, and design assets remain local unless a future feature obtains explicit user approval.

### Over-expansion

Deferred capabilities must not block the first vertical slice. New modules are introduced only when a confirmed use case requires them.

### False confidence

Detection results are evidence, not automatic approval. The UI must explain limitations and preserve human review.

## 11. Success indicators

Initial qualitative indicators:

- Developers can reproduce the same viewport checks from a shared preset file.
- Multi-size capture requires fewer repeated actions than manual DevTools operation.
- Overflow, focus-order, and target-size findings identify the affected elements.
- A design image can be aligned and compared without leaving the browser workflow.
- Restricted or failed operations produce understandable and recoverable states.

Quantitative targets will be defined after the first working vertical slice establishes realistic baselines.

## 12. Future direction

Future capabilities may include review comments, visual regression, performance inspection, asset analysis, NeutrA11y integration, security engines, CLI usage, editor integrations, CI execution, and AI-assisted explanations.

These remain separate decisions. The MVP architecture should preserve sensible extension boundaries without building unused infrastructure in advance.
