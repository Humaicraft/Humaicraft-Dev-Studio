import {
  capabilityFailure,
  capabilitySuccess,
  type CapabilityResult,
} from "./capability-result";

export const RUNTIME_MESSAGE_VERSION = 1 as const;

export interface RuntimeMessage<TType extends string, TPayload> {
  readonly version: typeof RUNTIME_MESSAGE_VERSION;
  readonly type: TType;
  readonly correlationId: string;
  readonly payload: TPayload;
}

export interface RuntimeMessageDefinition<TType extends string, TPayload> {
  readonly type: TType;
  readonly validatePayload: (payload: unknown) => CapabilityResult<TPayload>;
}

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isRecord(input: unknown): input is Record<string, unknown> {
  try {
    return typeof input === "object" && input !== null && !Array.isArray(input);
  } catch {
    return false;
  }
}

export function validateRuntimeMessage<TType extends string, TPayload>(
  input: unknown,
  definition: RuntimeMessageDefinition<TType, TPayload>,
): CapabilityResult<RuntimeMessage<TType, TPayload>> {
  if (!isRecord(input)) {
    return invalidMessage("message_shape_invalid");
  }

  let version: unknown;
  let type: unknown;
  let correlationId: unknown;
  let payload: unknown;

  try {
    version = input.version;
    type = input.type;
    correlationId = input.correlationId;
    if (!Object.hasOwn(input, "payload")) {
      return invalidMessage("message_payload_missing");
    }
    payload = input.payload;
  } catch {
    return invalidMessage("message_shape_invalid");
  }

  if (version !== RUNTIME_MESSAGE_VERSION) {
    return invalidMessage("message_version_unsupported");
  }

  if (type !== definition.type) {
    return invalidMessage("message_type_unsupported");
  }

  if (
    typeof correlationId !== "string" ||
    !CORRELATION_ID_PATTERN.test(correlationId)
  ) {
    return invalidMessage("correlation_id_invalid");
  }

  let validatedPayload: CapabilityResult<TPayload>;
  try {
    validatedPayload = definition.validatePayload(payload);
  } catch {
    return invalidMessage("message_payload_invalid");
  }
  if (!validatedPayload.ok) {
    return invalidMessage("message_payload_invalid");
  }

  return capabilitySuccess(
    Object.freeze({
      version: RUNTIME_MESSAGE_VERSION,
      type: definition.type,
      correlationId,
      payload: validatedPayload.value,
    }),
  );
}

function invalidMessage(lifecycleCode: string): CapabilityResult<never> {
  return capabilityFailure({
    code: "invalid_message",
    recoverability: "none",
    capability: "runtime_message",
    lifecycleCode,
  });
}
