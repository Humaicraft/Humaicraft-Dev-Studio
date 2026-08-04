# Humaicraft Dev Studio

Humaicraft Dev Studio is a local-first frontend development workspace for responsive implementation, visual comparison, inspection, screenshots, and review workflows.

The project is currently validating Chromium Manifest V3 as the first delivery surface before production implementation begins.

## Product principle

> Every feature must reduce at least one repetitive task in a frontend developer's daily workflow.

The Studio supports human judgment. It must not silently publish, overwrite, approve, or modify production code.

## Initial scope

The first delivery surface is expected to be a Chromium browser extension, subject to technical validation.

The MVP focuses on:

- One-click viewport switching
- Local viewport preset management
- Versioned JSON import and export
- Screenshots across configured viewport sizes
- Horizontal overflow detection
- Tap-target and focus-order inspection
- Breakpoint comparison
- Design-image overlay and alignment controls

## Deferred scope

The following are intentionally deferred:

- NeutrA11y integration
- npm-guardian integration
- AI-generated fixes
- VS Code and CLI integrations
- GitHub Actions integration
- Public plugin SDK
- Cloud collaboration

Future integrations must use explicit boundaries and must not become dependencies of the initial MVP.

## Documentation

- [Product proposal](docs/proposal/product-proposal.md)
- [Product requirements](docs/requirements/product-requirements.md)
- [Initial architecture](docs/architecture/initial-architecture.md)
- [Chromium delivery-surface spike](docs/spikes/chromium-extension-delivery-surface.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Project workflow

GitHub Issues and Pull Requests are the authoritative record for requirements, decisions, implementation, review, and completion.

1. Discuss and approve the requirement in an Issue.
2. Implement one focused change on a dedicated branch.
3. Open a Pull Request with purpose, impact, verification, risks, and rollback notes.
4. Review before merge.
5. Update documentation, ROADMAP, and CHANGELOG when required.

## Development environment

Repository tooling uses **Node.js 24**. The current disposable Chromium spike has no build step or runtime dependencies.

## Status

**M1 — Viewport Foundation: Chromium delivery-surface spike in progress**

No production feature implementation has started yet.

## License

Humaicraft Dev Studio is licensed under the [MIT License](LICENSE).
