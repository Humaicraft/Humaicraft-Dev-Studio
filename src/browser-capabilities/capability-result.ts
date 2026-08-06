export const BROWSER_CAPABILITIES = [
  "viewport",
  "debugger_session",
  "page_access",
  "screenshot",
  "inspection",
] as const;

export type BrowserCapability = (typeof BROWSER_CAPABILITIES)[number];

export type CapabilityBoundary = BrowserCapability | "runtime_message";

export const CAPABILITY_AVAILABILITY = [
  "available",
  "requires_permission",
  "unsupported_target",
  "conflicting_client",
  "temporarily_unavailable",
] as const;

export type CapabilityAvailability =
  (typeof CAPABILITY_AVAILABILITY)[number];

export const CAPABILITY_ERROR_CODES = [
  "active_target_unavailable",
  "unsupported_page",
  "permission_denied",
  "permission_unavailable",
  "debugger_conflict",
  "debugger_ownership_unknown",
  "target_closed",
  "target_changed",
  "operation_cancelled",
  "operation_timed_out",
  "browser_operation_failed",
  "invalid_message",
  "invalid_state",
] as const;

export type CapabilityErrorCode = (typeof CAPABILITY_ERROR_CODES)[number];

export type Recoverability =
  | "retry"
  | "user_action"
  | "unsupported"
  | "none";

export interface CapabilitySafeContext {
  readonly capability: CapabilityBoundary;
  readonly lifecycleCode?: string;
}

export interface CapabilityFailure {
  readonly ok: false;
  readonly error: {
    readonly code: CapabilityErrorCode;
    readonly recoverability: Recoverability;
    readonly safeContext: CapabilitySafeContext;
  };
}

export interface CapabilitySuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export type CapabilityResult<T> = CapabilitySuccess<T> | CapabilityFailure;

const LIFECYCLE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export function capabilitySuccess<T>(value: T): CapabilitySuccess<T> {
  return Object.freeze({ ok: true, value });
}

export function capabilityFailure(input: {
  readonly code: CapabilityErrorCode;
  readonly recoverability: Recoverability;
  readonly capability: CapabilityBoundary;
  readonly lifecycleCode?: string;
}): CapabilityFailure {
  const lifecycleCode =
    input.lifecycleCode !== undefined &&
    LIFECYCLE_CODE_PATTERN.test(input.lifecycleCode)
      ? input.lifecycleCode
      : undefined;

  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: input.code,
      recoverability: input.recoverability,
      safeContext: Object.freeze({
        capability: input.capability,
        ...(lifecycleCode === undefined ? {} : { lifecycleCode }),
      }),
    }),
  });
}
