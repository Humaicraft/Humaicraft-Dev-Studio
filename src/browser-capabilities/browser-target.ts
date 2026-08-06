import {
  capabilityFailure,
  capabilitySuccess,
  type BrowserCapability,
  type CapabilityResult,
} from "./capability-result";

export interface BrowserTarget {
  readonly id: number;
}

export function createBrowserTarget(
  input: unknown,
  capability: BrowserCapability = "page_access",
): CapabilityResult<BrowserTarget> {
  if (!Number.isSafeInteger(input) || (input as number) < 0) {
    return capabilityFailure({
      code: "active_target_unavailable",
      recoverability: "retry",
      capability,
      lifecycleCode: "target_id_invalid",
    });
  }

  return capabilitySuccess(Object.freeze({ id: input as number }));
}
