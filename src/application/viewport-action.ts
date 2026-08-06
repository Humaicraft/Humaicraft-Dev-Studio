import { createBrowserTarget } from "../browser-capabilities/browser-target";
import {
  BROWSER_CAPABILITIES,
  CAPABILITY_ERROR_CODES,
  capabilityFailure,
  capabilitySuccess,
  type CapabilityBoundary,
  type CapabilityErrorCode,
  type CapabilityFailure,
  type CapabilityResult,
  type Recoverability,
} from "../browser-capabilities/capability-result";
import type {
  AppliedViewport,
  ViewportController,
} from "../browser-capabilities/ports";
import {
  RUNTIME_MESSAGE_VERSION,
  validateRuntimeMessage,
  type RuntimeMessage,
  type RuntimeMessageDefinition,
} from "../browser-capabilities/runtime-message";
import {
  createViewportDimensions,
  type ViewportDimensions,
} from "../browser-capabilities/viewport";

export const VIEWPORT_APPLY_MESSAGE_TYPE = "viewport.apply" as const;
export const VIEWPORT_RESET_MESSAGE_TYPE = "viewport.reset" as const;

interface ViewportApplyPayload {
  readonly target: { readonly id: number };
  readonly viewport: ViewportDimensions;
}

interface ViewportResetPayload {
  readonly target: { readonly id: number };
}

interface ViewportApplyWirePayload {
  readonly targetId: number;
  readonly width: number;
  readonly height: number;
}

interface ViewportResetWirePayload {
  readonly targetId: number;
}

export type ViewportActionReceipt =
  | {
      readonly action: "apply";
      readonly requested: ViewportDimensions;
      readonly actual: ViewportDimensions;
    }
  | { readonly action: "reset" };

export interface ViewportActionClient {
  apply(
    viewport: ViewportDimensions,
  ): Promise<CapabilityResult<ViewportActionReceipt>>;
  reset(): Promise<CapabilityResult<ViewportActionReceipt>>;
}

export interface ViewportActionMessageHandler {
  handle(input: unknown): Promise<CapabilityResult<ViewportActionReceipt>>;
}

const APPLY_MESSAGE_DEFINITION: RuntimeMessageDefinition<
  typeof VIEWPORT_APPLY_MESSAGE_TYPE,
  ViewportApplyPayload
> = Object.freeze({
  type: VIEWPORT_APPLY_MESSAGE_TYPE,
  validatePayload: validateApplyPayload,
});

const RESET_MESSAGE_DEFINITION: RuntimeMessageDefinition<
  typeof VIEWPORT_RESET_MESSAGE_TYPE,
  ViewportResetPayload
> = Object.freeze({
  type: VIEWPORT_RESET_MESSAGE_TYPE,
  validatePayload: validateResetPayload,
});

export class DefaultViewportActionMessageHandler
  implements ViewportActionMessageHandler
{
  readonly #controller: ViewportController;

  constructor(controller: ViewportController) {
    this.#controller = controller;
  }

  async handle(
    input: unknown,
  ): Promise<CapabilityResult<ViewportActionReceipt>> {
    return readMessageType(input) === VIEWPORT_RESET_MESSAGE_TYPE
      ? this.#handleReset(input)
      : this.#handleApply(input);
  }

  async #handleApply(
    input: unknown,
  ): Promise<CapabilityResult<ViewportActionReceipt>> {
    const message = validateRuntimeMessage(input, APPLY_MESSAGE_DEFINITION);
    if (!message.ok) {
      return message;
    }

    let result: CapabilityResult<AppliedViewport>;
    try {
      result = await this.#controller.apply(
        message.value.payload.target,
        message.value.payload.viewport,
      );
    } catch {
      return actionFailure("viewport_apply_failed");
    }
    if (!result.ok) {
      return result;
    }

    return capabilitySuccess(
      Object.freeze({
        action: "apply" as const,
        requested: result.value.requested,
        actual: result.value.actual,
      }),
    );
  }

  async #handleReset(
    input: unknown,
  ): Promise<CapabilityResult<ViewportActionReceipt>> {
    const message = validateRuntimeMessage(input, RESET_MESSAGE_DEFINITION);
    if (!message.ok) {
      return message;
    }

    let result: CapabilityResult<void>;
    try {
      result = await this.#controller.reset(message.value.payload.target);
    } catch {
      return actionFailure("viewport_reset_failed");
    }
    if (!result.ok) {
      return result;
    }

    return capabilitySuccess(Object.freeze({ action: "reset" as const }));
  }
}

export function createViewportApplyMessage(
  targetId: number,
  viewport: ViewportDimensions,
  correlationId: string,
): RuntimeMessage<typeof VIEWPORT_APPLY_MESSAGE_TYPE, ViewportApplyWirePayload> {
  return Object.freeze({
    version: RUNTIME_MESSAGE_VERSION,
    type: VIEWPORT_APPLY_MESSAGE_TYPE,
    correlationId,
    payload: Object.freeze({
      targetId,
      width: viewport.width,
      height: viewport.height,
    }),
  });
}

export function createViewportResetMessage(
  targetId: number,
  correlationId: string,
): RuntimeMessage<typeof VIEWPORT_RESET_MESSAGE_TYPE, ViewportResetWirePayload> {
  return Object.freeze({
    version: RUNTIME_MESSAGE_VERSION,
    type: VIEWPORT_RESET_MESSAGE_TYPE,
    correlationId,
    payload: Object.freeze({ targetId }),
  });
}

export function validateViewportActionResult(
  input: unknown,
): CapabilityResult<ViewportActionReceipt> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ["ok", "value"], ["ok", "error"])
  ) {
    return invalidResponse();
  }

  let ok: unknown;
  try {
    ok = input.ok;
  } catch {
    return invalidResponse();
  }

  if (ok === true) {
    return validateSuccessResult(input);
  }
  if (ok === false) {
    return validateFailureResult(input);
  }
  return invalidResponse();
}

function validateApplyPayload(
  input: unknown,
): CapabilityResult<ViewportApplyPayload> {
  if (!isRecord(input) || !hasExactKeys(input, ["targetId", "width", "height"])) {
    return invalidPayload();
  }

  let targetId: unknown;
  let width: unknown;
  let height: unknown;
  try {
    targetId = input.targetId;
    width = input.width;
    height = input.height;
  } catch {
    return invalidPayload();
  }

  const target = createBrowserTarget(targetId, "viewport");
  const viewport = createViewportDimensions({ width, height });
  if (!target.ok || !viewport.ok) {
    return invalidPayload();
  }

  return capabilitySuccess(
    Object.freeze({ target: target.value, viewport: viewport.value }),
  );
}

function validateResetPayload(
  input: unknown,
): CapabilityResult<ViewportResetPayload> {
  if (!isRecord(input) || !hasExactKeys(input, ["targetId"])) {
    return invalidPayload();
  }

  let targetId: unknown;
  try {
    targetId = input.targetId;
  } catch {
    return invalidPayload();
  }

  const target = createBrowserTarget(targetId, "viewport");
  return target.ok
    ? capabilitySuccess(Object.freeze({ target: target.value }))
    : invalidPayload();
}

function validateSuccessResult(
  input: Record<string, unknown>,
): CapabilityResult<ViewportActionReceipt> {
  let value: unknown;
  try {
    value = input.value;
  } catch {
    return invalidResponse();
  }

  if (!isRecord(value)) {
    return invalidResponse();
  }

  let action: unknown;
  try {
    action = value.action;
  } catch {
    return invalidResponse();
  }

  if (action === "reset" && hasExactKeys(value, ["action"])) {
    return capabilitySuccess(Object.freeze({ action: "reset" }));
  }
  if (
    action !== "apply" ||
    !hasExactKeys(value, ["action", "requested", "actual"])
  ) {
    return invalidResponse();
  }

  let rawRequested: unknown;
  let rawActual: unknown;
  try {
    rawRequested = value.requested;
    rawActual = value.actual;
  } catch {
    return invalidResponse();
  }

  const requested = validateWireViewport(rawRequested);
  const actual = validateWireViewport(rawActual);
  if (!requested.ok || !actual.ok) {
    return invalidResponse();
  }

  return capabilitySuccess(
    Object.freeze({
      action: "apply" as const,
      requested: requested.value,
      actual: actual.value,
    }),
  );
}

function validateFailureResult(
  input: Record<string, unknown>,
): CapabilityResult<ViewportActionReceipt> {
  let rawError: unknown;
  try {
    rawError = input.error;
  } catch {
    return invalidResponse();
  }
  if (
    !isRecord(rawError) ||
    !hasExactKeys(rawError, ["code", "recoverability", "safeContext"])
  ) {
    return invalidResponse();
  }

  let code: unknown;
  let recoverability: unknown;
  let rawSafeContext: unknown;
  try {
    code = rawError.code;
    recoverability = rawError.recoverability;
    rawSafeContext = rawError.safeContext;
  } catch {
    return invalidResponse();
  }

  if (
    !isCapabilityErrorCode(code) ||
    !isRecoverability(recoverability) ||
    !isRecord(rawSafeContext) ||
    !hasExactKeys(
      rawSafeContext,
      ["capability"],
      ["capability", "lifecycleCode"],
    )
  ) {
    return invalidResponse();
  }

  let capability: unknown;
  let lifecycleCode: unknown;
  try {
    capability = rawSafeContext.capability;
    lifecycleCode = rawSafeContext.lifecycleCode;
  } catch {
    return invalidResponse();
  }
  if (
    !isCapabilityBoundary(capability) ||
    (lifecycleCode !== undefined &&
      (typeof lifecycleCode !== "string" ||
        !/^[a-z][a-z0-9_]{0,63}$/.test(lifecycleCode)))
  ) {
    return invalidResponse();
  }

  return capabilityFailure({
    code,
    recoverability,
    capability,
    ...(lifecycleCode === undefined ? {} : { lifecycleCode }),
  });
}

function validateWireViewport(
  input: unknown,
): CapabilityResult<ViewportDimensions> {
  return isRecord(input) && hasExactKeys(input, ["width", "height"])
    ? createViewportDimensions(input)
    : invalidResponse();
}

function readMessageType(input: unknown): unknown {
  if (!isRecord(input)) {
    return undefined;
  }
  try {
    return input.type;
  } catch {
    return undefined;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  try {
    return typeof input === "object" && input !== null && !Array.isArray(input);
  } catch {
    return false;
  }
}

function hasExactKeys(
  input: Record<string, unknown>,
  ...allowedShapes: readonly (readonly string[])[]
): boolean {
  try {
    const keys = Reflect.ownKeys(input);
    return allowedShapes.some(
      (shape) =>
        keys.length === shape.length &&
        keys.every(
          (key) => typeof key === "string" && shape.includes(key),
        ),
    );
  } catch {
    return false;
  }
}

function isCapabilityErrorCode(input: unknown): input is CapabilityErrorCode {
  return (
    typeof input === "string" &&
    (CAPABILITY_ERROR_CODES as readonly string[]).includes(input)
  );
}

function isRecoverability(input: unknown): input is Recoverability {
  return (
    input === "retry" ||
    input === "user_action" ||
    input === "unsupported" ||
    input === "none"
  );
}

function isCapabilityBoundary(input: unknown): input is CapabilityBoundary {
  return (
    input === "runtime_message" ||
    (typeof input === "string" &&
      (BROWSER_CAPABILITIES as readonly string[]).includes(input))
  );
}

function invalidPayload(): CapabilityFailure {
  return capabilityFailure({
    code: "invalid_state",
    recoverability: "none",
    capability: "viewport",
    lifecycleCode: "viewport_message_payload_invalid",
  });
}

function invalidResponse(): CapabilityFailure {
  return capabilityFailure({
    code: "invalid_state",
    recoverability: "none",
    capability: "viewport",
    lifecycleCode: "viewport_response_invalid",
  });
}

function actionFailure(lifecycleCode: string): CapabilityFailure {
  return capabilityFailure({
    code: "browser_operation_failed",
    recoverability: "retry",
    capability: "viewport",
    lifecycleCode,
  });
}
