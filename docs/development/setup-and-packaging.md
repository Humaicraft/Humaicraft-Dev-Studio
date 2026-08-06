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

Vitest verifies TypeScript, packaging rules, browser-capability contracts, boundary validation, Chromium error normalization, debugger-session reconciliation, viewport cleanup policy, strict runtime-message routing, Chromium popup target selection, normalized response validation, and accessible recovery copy. Adapter contract tests use browser-free Chromium API doubles; they do not prove that service-worker lifecycle, browser permissions, debugger ownership, restricted pages, or cleanup work in Chrome.

## Build output

The production build writes to `dist/` and clears the previous build first.

The viewport vertical-slice allow-list contains only the reviewed manifest, popup, and generated assets:

```text
manifest.json
popup.html
assets/background.js
assets/popup.js
assets/popup-<hash>.css
assets/normalize-browser-error-<hash>.js
```

The manifest declares only `debugger` and `storage`. `debugger` is required for exact CDP viewport emulation; `storage` keeps minimum schema-versioned ownership evidence in `chrome.storage.session`. The popup reads only the active tab's numeric ID, so it does not request `tabs`, `activeTab`, a host permission, or access to the page DOM. A later capability must update the manifest, package allow-list, tests, security documentation, and browser verification together.

## Manual Chrome verification

1. Run `pnpm build`.
2. Open `chrome://extensions/`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select the repository `dist/` directory.
5. Record the Chrome version and the exact install-time warning caused by the `debugger` permission. Confirm there are no unexpected host, tab-metadata, or remote-access permissions.
6. Open a normal HTTP or HTTPS test page whose CSS viewport dimensions can be observed without sensitive data.
7. Open the Humaicraft popup and confirm the width, height, Apply viewport, Reset, and live status are keyboard operable with visible focus at 320 CSS pixels.
8. Apply `1280 × 800` and confirm both the live status and the target page report `1280 × 800` CSS pixels.
9. Select Reset and confirm the success status, original viewport restoration, debugger detach, and session-record cleanup.
10. Exercise an invalid dimension and a restricted Chrome page. Confirm both fail with understandable recovery guidance and leave no owned debugger session.
11. Reset any active viewport before reloading, disabling, or removing the unpacked extension.

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

No user data or browser session is created by the toolchain shell. Before rolling back a connected extension build, reset any active Humaicraft viewport while ownership is attributable. Rollback removes the popup, runtime composition, manifest permissions, and generated build. It must never detach an unknown external debugger client. If ownership is ambiguous, close or reload the affected test tab instead. No page content, URL, title, credential, cookie, token, or screenshot data requires migration.
