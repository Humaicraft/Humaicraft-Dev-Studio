# Changelog

All notable changes to Humaicraft Dev Studio will be documented in this file.

The project follows Semantic Versioning when versioned releases begin.

## [Unreleased]

### Added

- Initial product proposal
- Initial MVP requirements
- Initial architecture
- Foundation roadmap
- Contribution guidelines
- Repository bootstrap configuration
- Browser capability production boundaries
- Exact Node.js, pnpm, TypeScript, Vite, and Vitest production toolchain
- Minimal permission-free Manifest V3 production shell
- Deterministic repository-owned extension ZIP packaging
- Browser capability contracts, boundary validators, versioned message validation, and Chromium error normalization
- Chromium debugger-session reconciliation and viewport apply/reset adapter core
- Validated popup-to-service-worker viewport apply/reset vertical slice
- Minimal semantic viewport popup with keyboard controls and live status recovery guidance

### Decisions

- Humaicraft Dev Studio is defined as a local-first frontend development workspace.
- Chromium extension is the recommended first delivery surface, pending technical validation.
- NeutrA11y integration is deferred and is not an MVP dependency.
- The MVP prioritizes viewport, preset sharing, design comparison, inspection, screenshots, and breakpoint comparison.
- GitHub Issues and Pull Requests are the authoritative development record.
- Browser APIs remain isolated behind narrow production adapters.
- Unknown debugger ownership fails closed and never authorizes detach.
- Stored debugger-session records are evidence only; live reconciliation determines ownership.
- Detach is the authoritative owned-session cleanup path when clearing viewport emulation fails.
- The first viewport slice requests only `debugger` and `storage`; tab URLs, titles, and page contents are not read.
- pnpm 10.34.5, TypeScript 6.0.3, Vite 8.2.0, and Vitest 4.1.10 are pinned exactly.
- No extension, UI, or monorepo framework is adopted initially.
