import {
  capabilityFailure,
  capabilitySuccess,
  type CapabilityResult,
} from "./capability-result";

export const VIEWPORT_LIMITS = Object.freeze({
  minWidth: 320,
  maxWidth: 7680,
  minHeight: 240,
  maxHeight: 4320,
});

export interface ViewportDimensions {
  readonly width: number;
  readonly height: number;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  try {
    return typeof input === "object" && input !== null && !Array.isArray(input);
  } catch {
    return false;
  }
}

function isDimension(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function createViewportDimensions(
  input: unknown,
): CapabilityResult<ViewportDimensions> {
  if (!isRecord(input)) {
    return invalidViewport("viewport_shape_invalid");
  }

  let width: unknown;
  let height: unknown;

  try {
    width = input.width;
    height = input.height;
  } catch {
    return invalidViewport("viewport_shape_invalid");
  }

  if (
    !isDimension(width, VIEWPORT_LIMITS.minWidth, VIEWPORT_LIMITS.maxWidth) ||
    !isDimension(height, VIEWPORT_LIMITS.minHeight, VIEWPORT_LIMITS.maxHeight)
  ) {
    return invalidViewport("viewport_dimensions_invalid");
  }

  return capabilitySuccess(Object.freeze({ width, height }));
}

function invalidViewport(lifecycleCode: string): CapabilityResult<never> {
  return capabilityFailure({
    code: "invalid_state",
    recoverability: "user_action",
    capability: "viewport",
    lifecycleCode,
  });
}
