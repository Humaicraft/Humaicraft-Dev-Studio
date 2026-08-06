import { createBrowserTarget } from "../../browser-capabilities/browser-target";
import {
  capabilityFailure,
  capabilitySuccess,
  type CapabilityResult,
} from "../../browser-capabilities/capability-result";
import type {
  DebuggerSessionRecord,
  DebuggerSessionRepository,
  DebuggerSessionState,
} from "../../browser-capabilities/ports";
import { createViewportDimensions } from "../../browser-capabilities/viewport";
import type {
  ChromiumDebuggerApi,
  ChromiumSessionStorage,
} from "./chromium-api";
import { normalizeChromiumError } from "./normalize-browser-error";

const SESSION_KEY_PREFIX = "humaicraft.debugger-session.v1.";
const RECORD_KEYS = [
  "schemaVersion",
  "target",
  "viewport",
  "recordedAtEpochMs",
] as const;

export class ChromiumDebuggerSessionRepository
  implements DebuggerSessionRepository
{
  readonly #debuggerApi: ChromiumDebuggerApi;
  readonly #storage: ChromiumSessionStorage;
  readonly #ownedTargets = new Set<number>();

  constructor(
    debuggerApi: ChromiumDebuggerApi,
    storage: ChromiumSessionStorage,
  ) {
    this.#debuggerApi = debuggerApi;
    this.#storage = storage;
  }

  async read(
    target: { readonly id: number },
  ): Promise<CapabilityResult<DebuggerSessionRecord | null>> {
    const validatedTarget = validateTarget(target);
    if (!validatedTarget.ok) {
      return validatedTarget;
    }

    const key = sessionKey(validatedTarget.value.id);
    let stored: Record<string, unknown>;
    try {
      stored = await this.#storage.get(key);
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    let rawRecord: unknown;
    try {
      rawRecord = stored[key];
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    if (rawRecord === undefined) {
      return capabilitySuccess(null);
    }

    const record = validateDebuggerSessionRecord(
      rawRecord,
      validatedTarget.value.id,
    );
    if (record.ok) {
      return record;
    }

    this.#ownedTargets.delete(validatedTarget.value.id);
    try {
      await this.#storage.remove(key);
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    return record;
  }

  async reconcile(
    target: { readonly id: number },
  ): Promise<CapabilityResult<DebuggerSessionState>> {
    const validatedTarget = validateTarget(target);
    if (!validatedTarget.ok) {
      return validatedTarget;
    }

    const evidence = await this.read(validatedTarget.value);
    if (!evidence.ok) {
      return evidence;
    }

    let targets: readonly unknown[];
    try {
      targets = await this.#debuggerApi.getTargets();
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    if (!Array.isArray(targets)) {
      return invalidRepositoryState("debugger_targets_invalid");
    }

    const attached = findAttachedTarget(targets, validatedTarget.value.id);
    if (!attached.ok) {
      return attached;
    }

    if (!attached.value) {
      this.#ownedTargets.delete(validatedTarget.value.id);
      if (evidence.value !== null) {
        try {
          await this.#storage.remove(sessionKey(validatedTarget.value.id));
        } catch (error) {
          return normalizeChromiumError(error, "debugger_session");
        }
      }

      return capabilitySuccess(
        Object.freeze({ ownership: "detached", evidence: null }),
      );
    }

    return capabilitySuccess(
      Object.freeze({
        ownership: this.#ownedTargets.has(validatedTarget.value.id)
          ? "owned"
          : "external_or_unknown",
        evidence: evidence.value,
      }),
    );
  }

  async writeOwned(
    evidence: DebuggerSessionRecord,
  ): Promise<CapabilityResult<void>> {
    const record = validateDebuggerSessionRecord(evidence);
    if (!record.ok) {
      return record;
    }

    const targetId = record.value.target.id;
    this.#ownedTargets.add(targetId);

    try {
      await this.#storage.set({
        [sessionKey(targetId)]: record.value,
      });
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    return capabilitySuccess(undefined);
  }

  async removeOwned(
    target: { readonly id: number },
  ): Promise<CapabilityResult<void>> {
    const validatedTarget = validateTarget(target);
    if (!validatedTarget.ok) {
      return validatedTarget;
    }

    this.#ownedTargets.delete(validatedTarget.value.id);
    try {
      await this.#storage.remove(sessionKey(validatedTarget.value.id));
    } catch (error) {
      return normalizeChromiumError(error, "debugger_session");
    }

    return capabilitySuccess(undefined);
  }
}

export function validateDebuggerSessionRecord(
  input: unknown,
  expectedTargetId?: number,
): CapabilityResult<DebuggerSessionRecord> {
  if (!isPlainRecord(input) || !hasOnlyKeys(input, RECORD_KEYS)) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  let schemaVersion: unknown;
  let rawTarget: unknown;
  let rawViewport: unknown;
  let recordedAtEpochMs: unknown;
  try {
    schemaVersion = input.schemaVersion;
    rawTarget = input.target;
    rawViewport = input.viewport;
    recordedAtEpochMs = input.recordedAtEpochMs;
  } catch {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  if (schemaVersion !== 1 || !isPlainRecord(rawTarget)) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  let rawTargetId: unknown;
  try {
    if (!hasOnlyKeys(rawTarget, ["id"])) {
      return invalidRepositoryState("debugger_session_record_invalid");
    }
    rawTargetId = rawTarget.id;
  } catch {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  const target = createBrowserTarget(rawTargetId, "debugger_session");
  if (
    !target.ok ||
    (expectedTargetId !== undefined && target.value.id !== expectedTargetId)
  ) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  if (
    rawViewport !== undefined &&
    (!isPlainRecord(rawViewport) ||
      !hasOnlyKeys(rawViewport, ["width", "height"]))
  ) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  const viewport =
    rawViewport === undefined
      ? capabilitySuccess(undefined)
      : createViewportDimensions(rawViewport);
  if (!viewport.ok) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  if (
    typeof recordedAtEpochMs !== "number" ||
    !Number.isSafeInteger(recordedAtEpochMs) ||
    recordedAtEpochMs < 0
  ) {
    return invalidRepositoryState("debugger_session_record_invalid");
  }

  return capabilitySuccess(
    Object.freeze({
      schemaVersion: 1,
      target: target.value,
      ...(viewport.value === undefined ? {} : { viewport: viewport.value }),
      recordedAtEpochMs,
    }),
  );
}

function validateTarget(
  target: { readonly id: number },
): CapabilityResult<{ readonly id: number }> {
  let targetId: unknown;
  try {
    targetId = target.id;
  } catch {
    return invalidRepositoryState("debugger_target_invalid");
  }

  const validated = createBrowserTarget(targetId, "debugger_session");
  return validated.ok
    ? validated
    : invalidRepositoryState("debugger_target_invalid");
}

function findAttachedTarget(
  targets: readonly unknown[],
  expectedTargetId: number,
): CapabilityResult<boolean> {
  for (const target of targets) {
    if (!isPlainRecord(target)) {
      continue;
    }

    let tabId: unknown;
    let attached: unknown;
    try {
      tabId = target.tabId;
      attached = target.attached;
    } catch {
      return invalidRepositoryState("debugger_targets_invalid");
    }

    if (tabId === expectedTargetId) {
      return typeof attached === "boolean"
        ? capabilitySuccess(attached)
        : invalidRepositoryState("debugger_targets_invalid");
    }
  }

  return capabilitySuccess(false);
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  try {
    return typeof input === "object" && input !== null && !Array.isArray(input);
  } catch {
    return false;
  }
}

function hasOnlyKeys(
  input: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  try {
    const allowed = new Set(allowedKeys);
    return Reflect.ownKeys(input).every(
      (key) => typeof key === "string" && allowed.has(key),
    );
  } catch {
    return false;
  }
}

function sessionKey(targetId: number): string {
  return `${SESSION_KEY_PREFIX}${targetId}`;
}

function invalidRepositoryState(
  lifecycleCode: string,
): CapabilityResult<never> {
  return capabilityFailure({
    code: "invalid_state",
    recoverability: "none",
    capability: "debugger_session",
    lifecycleCode,
  });
}
