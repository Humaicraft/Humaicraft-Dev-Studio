# ADR 0001: Production Toolchain

- Status: Approved
- Date: 2026-08-05
- Related: Issue #10, Issue #5, PR #9

## Context

Production browser capability code requires a reproducible build and test environment. The disposable Chromium spike intentionally used no production toolchain and must not become the application by copy and paste.

The first toolchain must keep Manifest V3 entry points visible, maintain strict runtime boundaries, and avoid framework ownership before evidence demonstrates a need.

## Decision

Use the following exact initial versions:

| Responsibility | Selection | Version | License |
| --- | --- | --- | --- |
| Runtime | Node.js | 24.15.0 | MIT |
| Package manager | pnpm | 10.34.5 | MIT |
| Language and type checking | TypeScript | 6.0.3 | Apache-2.0 |
| Build | Vite | 8.2.0 | MIT |
| Unit and contract testing | Vitest | 4.1.10 | MIT |
| Coverage | `@vitest/coverage-v8` | 4.1.10 | MIT |
| Node.js declarations | `@types/node` | 24.13.3 | MIT |

The project uses ESM, an exact `packageManager` declaration, and a committed `pnpm-lock.yaml`. TypeScript compiler targets, libraries, and global type sets are explicit for each runtime.

The initial extension uses repository-owned Vite entry points and packaging scripts. It does not adopt an extension framework, UI framework, state library, schema library, formatter, linter suite, or monorepo orchestrator.

## Security and dependency review

The first production manifest declares no browser permissions or host permissions. Capabilities add permissions only through later approved Issues.

On 2026-08-05:

- `pnpm audit --audit-level moderate` reported no known vulnerabilities.
- The locked dependency graph reported MIT, Apache-2.0, BSD-3-Clause, MPL-2.0, and ISC licenses.
- Build output contained only the reviewed manifest and service-worker entry point.
- Source maps, secrets, keys, nested archives, and unexpected top-level files are rejected by package validation.

The lockfile is the authoritative dependency record. Audit results are evidence from a point in time and must be repeated before release.

## Version policy

- Tool versions are exact rather than ranges.
- Node.js remains on the approved 24.x runtime until a separate decision changes it.
- Vite minor upgrades are deliberate because its TypeScript definitions may change incompatibly between minors.
- Vitest and `@vitest/coverage-v8` remain on the same exact version.
- TypeScript 7 requires a dedicated migration Issue and compatibility verification.
- Framework adoption requires evidence of maintenance benefit that outweighs added conventions and lifecycle ownership.

## Consequences

### Positive

- Clean installs and builds are lockfile-controlled.
- Domain and contract tests run without a browser.
- Manifest V3 structure remains visible and reviewable.
- The initial output has no permissions, remote transmission, or hidden framework behavior.
- ZIP contents, file order, modes, timestamps, and checksum are reproducible.

### Costs and constraints

- Repository scripts own extension entry points and ZIP packaging.
- Browser lifecycle behavior still requires explicit Chrome verification; Vitest is not evidence of browser behavior.
- The system `zip` executable is required for release packaging.
- TypeScript configuration is split by runtime to prevent accidental global-type leakage.

## Foundation contribution

The deterministic extension-packaging pattern may benefit other Humaicraft browser products. Dev Studio will validate the rules locally first. Promotion into a shared Foundation asset should occur through a separate reviewable decision rather than coupling repositories prematurely.

## Verification

The foundation must be verified through:

1. A frozen-lockfile install under Node.js 24 and pnpm 10.34.5.
2. Strict TypeScript checks for extension and Node.js tooling runtimes.
3. Vitest unit tests and V8 coverage execution.
4. A Vite production build with explicit Manifest V3 output.
5. Package allow-list, manifest-reference, and version checks.
6. Two ZIP builds producing the same SHA-256 digest.
7. Manual unpacked-extension loading in Chrome.

## Rollback

Remove the production toolchain, manifest shell, generated lockfile, tests, and packaging configuration. Generated `dist/`, `coverage/`, and `release/` directories are ignored and can be discarded. The approved browser capability architecture and Chromium spike evidence remain unchanged.
