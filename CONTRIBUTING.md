# Contributing

## Working agreement

Humaicraft Dev Studio is developed through small, reviewable changes recorded in GitHub Issues and Pull Requests.

Important decisions are not finalized implicitly in code. The related Issue or ADR must explain the reason, constraints, alternatives, and expected impact.

## Before implementation

Confirm and record:

1. Purpose
2. Target user
3. Current requirement
4. Constraints
5. Impacted areas
6. Security risks
7. Accessibility considerations
8. Test method
9. Completion criteria
10. Relationship to future expansion

Small implementation details may use existing conventions and safe defaults without unnecessary approval requests.

## Issue titles

Use a prefix that communicates the purpose of the Issue:

- `proposal:` for a product, requirement, or design proposal
- `decision:` for a decision requiring an explicit record
- `spike:` for evidence-gathering technical investigation
- `epic:` for a coordinated group of related outcomes
- `feat:` for a user-facing capability
- `fix:` for a defect correction
- `docs:` for documentation-only work
- `test:` for test coverage or testing infrastructure
- `refactor:` for behavior-preserving structural work
- `chore:` for repository or maintenance work

A prefix does not replace a clear title or complete Issue body.

## Branches

Use a dedicated branch for one clear purpose.

Recommended prefixes:

- `proposal/`
- `decision/`
- `spike/`
- `docs/`
- `feat/`
- `fix/`
- `test/`
- `refactor/`
- `chore/`

Do not combine unrelated refactoring with a feature or fix.

## Commits

A commit should represent one understandable purpose. Commit messages should explain the intent of the change.

Examples:

- `docs: define initial architecture`
- `feat: validate viewport preset dimensions`
- `fix: restore viewport after capture failure`

Do not commit secrets, local environment files, generated artifacts, or debug output.

## Pull Requests

Every Pull Request should include:

- Purpose
- Changes
- Verification performed
- Security impact
- Accessibility impact
- Compatibility and migration impact
- Rollback approach
- Known limitations or remaining work

Do not state that a test or verification was completed unless it was actually run.

## Architecture expectations

- Separate presentation, application, domain, ports, and adapters where responsibilities justify it.
- Keep browser APIs and page DOM access out of domain logic.
- Prefer explicit behavior over hidden conventions.
- Introduce abstractions when a real replacement or test boundary exists.
- Avoid speculative packages, generic plugin infrastructure, and premature framework commitments.
- Preserve the ability to recover from failed imports, writes, captures, and injected page operations.

## Security expectations

- Treat target pages, imported files, extension messages, and persisted data as untrusted.
- Validate input at the receiving boundary.
- Do not execute imported or page-provided strings.
- Use minimum browser permissions.
- Do not log credentials, cookies, tokens, personal information, page contents, screenshots, or design assets.
- Define limits and timeouts for file and browser operations.
- Fail closed when behavior is unknown or unsupported.

## Accessibility expectations

The Studio UI targets WCAG 2.2 AA.

Changes should preserve:

- Keyboard operation
- Visible focus
- Semantic controls
- Accessible names and instructions
- Information that does not depend on color alone
- Understandable errors and recovery paths
- Reduced-motion support
- Responsive use at narrow widths where applicable

## Testing expectations

Add tests proportional to risk.

- New domain rules require unit tests.
- Bug fixes should include a regression test when practical.
- Browser adapters require integration or contract tests.
- Critical workflows require end-to-end coverage.
- UI changes require keyboard and focus review.
- Error, boundary, permission-denied, and interrupted-operation paths must be considered.

Tests must not weaken production requirements merely to pass.

## Documentation

Update the relevant documentation when changing:

- Setup
- Environment variables
- Configuration
- APIs or message schemas
- Data structures
- Security behavior
- Test procedures
- Release or rollback procedures
- ROADMAP
- CHANGELOG

Important decisions that cannot be understood from code belong in an ADR, Issue, Pull Request, or design document.

## Completion checklist

Before reporting completion, confirm:

- The approved requirement is satisfied.
- Existing behavior was not unnecessarily broken.
- Security implications were checked.
- Required tests or reproducible verification were completed.
- Error behavior was considered.
- Accessibility impact was checked.
- Logs do not expose secrets or sensitive information.
- Documentation and roadmap status are current.
- Known constraints and unfinished work are explicit.
