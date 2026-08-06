import {
  capabilityFailure,
  type BrowserCapability,
  type CapabilityFailure,
} from "../../browser-capabilities/capability-result";

const UNSUPPORTED_PAGE_PATTERNS = [
  /cannot access a chrome:\/\/ url/i,
  /the extensions gallery cannot be scripted/i,
];

const PERMISSION_DENIED_PATTERNS = [
  /missing host permission/i,
  /cannot access contents of url/i,
  /cannot access contents of the page/i,
  /user denied/i,
];

const TARGET_UNAVAILABLE_PATTERNS = [
  /no tab with id/i,
  /the tab was closed/i,
];

const DEBUGGER_CONFLICT_PATTERNS = [
  /another debugger is already attached/i,
  /cannot attach to this target/i,
];

export function debuggerOwnershipUnknown(
  capability: BrowserCapability,
): CapabilityFailure {
  return capabilityFailure({
    code: "debugger_ownership_unknown",
    recoverability: "user_action",
    capability,
    lifecycleCode: "debugger_ownership_unknown",
  });
}

export function normalizeChromiumError(
  error: unknown,
  capability: BrowserCapability,
): CapabilityFailure {
  const message = readErrorMessage(error);

  if (matchesAny(message, UNSUPPORTED_PAGE_PATTERNS)) {
    return capabilityFailure({
      code: "unsupported_page",
      recoverability: "unsupported",
      capability,
      lifecycleCode: "chromium_target_unsupported",
    });
  }

  if (matchesAny(message, PERMISSION_DENIED_PATTERNS)) {
    return capabilityFailure({
      code: "permission_denied",
      recoverability: "user_action",
      capability,
      lifecycleCode: "chromium_permission_denied",
    });
  }

  if (matchesAny(message, TARGET_UNAVAILABLE_PATTERNS)) {
    return capabilityFailure({
      code: "active_target_unavailable",
      recoverability: "retry",
      capability,
      lifecycleCode: "chromium_target_unavailable",
    });
  }

  if (matchesAny(message, DEBUGGER_CONFLICT_PATTERNS)) {
    return capabilityFailure({
      code: "debugger_conflict",
      recoverability: "user_action",
      capability,
      lifecycleCode: "chromium_debugger_conflict",
    });
  }

  return capabilityFailure({
    code: "browser_operation_failed",
    recoverability: "retry",
    capability,
    lifecycleCode: "chromium_operation_failed",
  });
}

function matchesAny(message: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

function readErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return error.message;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
  } catch {
    return "";
  }

  return "";
}
