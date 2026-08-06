# Development and Packaging

## Requirements

- Node.js 24.15.0
- pnpm 10.34.5
- `zip` for release packaging
- Google Chrome for manual extension verification

`.nvmrc` pins the Node.js runtime for nvm. The `volta` entry in `package.json` pins Node.js and pnpm for Volta. The `packageManager` and engine declarations reject a mismatched pnpm instead of silently rewriting dependency state.

## Install

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

When using Volta, entering the repository selects both approved versions automatically. Before installation, confirm `node --version` reports `v24.15.0` and `pnpm --version` reports `10.34.5`.

Do not regenerate the lockfile with another pnpm version. A package-manager mismatch must stop rather than silently rewriting dependency state.

## Verification commands

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm verify:extension
pnpm verify
```

`verify` runs type checking, unit tests, the production build, and built-extension validation. Coverage remains a separate command so a normal verification run does not duplicate the test suite.

Vitest verifies TypeScript, packaging rules, browser-capability contracts, boundary validation, Chromium error normalization, debugger-session reconciliation, and viewport cleanup policy. Adapter contract tests use browser-free Chromium API doubles; they do not prove that service-worker lifecycle, browser permissions, debugger ownership, restricted pages, or cleanup work in Chrome.

## Build output

The production build writes to `dist/` and clears the previous build first.

The initial allow-list contains only:

```text
manifest.json
assets/background.js
```

The manifest declares no permissions. A later capability must update the manifest, package allow-list, tests, security documentation, and browser verification together.

## Manual Chrome verification

1. Run `pnpm build`.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the repository `dist/` directory.
5. Confirm that Humaicraft Dev Studio loads without an unexpected manifest warning.
6. Inspect the extension details and confirm that it requests no permissions.
7. Remove the unpacked extension when verification is complete.

Record the Chrome version, result, and any warning in the Pull Request. Do not report this step as passed until it is performed.

## Release package

```sh
pnpm package
```

The command rebuilds the extension, validates every included path and manifest reference, normalizes file modes and timestamps, writes files in sorted order, and creates:

```text
release/humaicraft-dev-studio-0.0.0.zip
release/humaicraft-dev-studio-0.0.0.zip.sha256
release/humaicraft-dev-studio-0.0.0.files.txt
```

The package rejects traversal paths, secrets, source maps, private keys, nested archives, and unexpected output roots. `dist/`, `coverage/`, and `release/` are generated locally and are not committed.

## Rollback

No user data or browser session is created by the toolchain shell. Rollback removes the generated extension build and development configuration. It does not touch spike evidence, external debugger clients, target pages, or user data.
