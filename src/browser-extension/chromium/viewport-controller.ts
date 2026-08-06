import { createBrowserTarget } from "../../browser-capabilities/browser-target";
import {
  capabilityFailure,
  capabilitySuccess,
  type CapabilityFailure,
  type CapabilityResult,
} from "../../browser-capabilities/capability-result";
import type {
  AppliedViewport,
  DebuggerSessionRecord,
  DebuggerSessionRepository,
  ViewportController,
} from "../../browser-capabilities/ports";
import {
  createViewportDimensions,
  type ViewportDimensions,
} from "../../browser-capabilities/viewport";
import type { ChromiumDebuggerApi } from "./chromium-api";
import {
  debuggerOwnershipUnknown,
  normalizeChromiumError,
} from "./normalize-browser-error";

export const CHROMIUM_DEBUGGER_PROTOCOL_VERSION = "1.3";

const APPLY_VIEWPORT_COMMAND = "Emulation.setDeviceMetricsOverride";
const CLEAR_VIEWPORT_COMMAND = "Emulation.clearDeviceMetricsOverride";

export class ChromiumViewportController implements ViewportController {
  readonly #debuggerApi: ChromiumDebuggerApi;
  readonly #sessions: DebuggerSessionRepository;
  readonly #now: () => number;

  constructor(
    debuggerApi: ChromiumDebuggerApi,
    sessions: DebuggerSessionRepository,
    now: () => number = Date.now,
  ) {
    this.#debuggerApi = debuggerApi;
    this.#sessions = sessions;
    this.#now = now;
  }

  async apply(
    targetInput: { readonly id: number },
    viewportInput: ViewportDimensions,
  ): Promise<CapabilityResult<AppliedViewport>> {
    const target = validateTarget(targetInput);
    if (!target.ok) {
      return target;
    }

    const viewport = createViewportDimensions(viewportInput);
    if (!viewport.ok) {
      return viewport;
    }

    const state = await this.#sessions.reconcile(target.value);
    if (!state.ok) {
      return state;
    }
    if (state.value.ownership === "external_or_unknown") {
      return debuggerOwnershipUnknown("viewport");
    }

    const record = createRecord(target.value, viewport.value, this.#now);
    if (!record.ok) {
      return record;
    }

    const debuggee = { tabId: target.value.id };
    if (state.value.ownership === "detached") {
      try {
        await this.#debuggerApi.attach(
          debuggee,
          CHROMIUM_DEBUGGER_PROTOCOL_VERSION,
        );
      } catch (error) {
        return normalizeChromiumError(error, "viewport");
      }

      const written = await this.#sessions.writeOwned(record.value);
      if (!written.ok) {
        const cleanup = await this.#cleanupOwned(target.value);
        return cleanup.ok ? written : cleanup;
      }
    }

    try {
      await this.#debuggerApi.sendCommand(
        debuggee,
        APPLY_VIEWPORT_COMMAND,
        viewportCommandParameters(viewport.value),
      );
    } catch (error) {
      const failure = normalizeChromiumError(error, "viewport");
      const cleanup = await this.#cleanupOwned(target.value);
      return cleanup.ok ? failure : cleanup;
    }

    if (state.value.ownership === "owned") {
      const written = await this.#sessions.writeOwned(record.value);
      if (!written.ok) {
        const cleanup = await this.#cleanupOwned(target.value);
        return cleanup.ok ? written : cleanup;
      }
    }

    return capabilitySuccess(
      Object.freeze({
        target: target.value,
        requested: viewport.value,
        actual: viewport.value,
      }),
    );
  }

  async reset(
    targetInput: { readonly id: number },
  ): Promise<CapabilityResult<void>> {
    const target = validateTarget(targetInput);
    if (!target.ok) {
      return target;
    }

    const state = await this.#sessions.reconcile(target.value);
    if (!state.ok) {
      return state;
    }
    if (state.value.ownership === "external_or_unknown") {
      return debuggerOwnershipUnknown("viewport");
    }
    if (state.value.ownership === "detached") {
      return capabilitySuccess(undefined);
    }

    return this.#cleanupOwned(target.value);
  }

  async #cleanupOwned(
    target: { readonly id: number },
  ): Promise<CapabilityResult<void>> {
    const debuggee = { tabId: target.id };

    try {
      await this.#debuggerApi.sendCommand(debuggee, CLEAR_VIEWPORT_COMMAND);
    } catch {
      // Detach remains the authoritative cleanup path for an owned session.
    }

    try {
      await this.#debuggerApi.detach(debuggee);
    } catch {
      return cleanupFailure();
    }

    return this.#sessions.removeOwned(target);
  }
}

function validateTarget(
  target: { readonly id: number },
): CapabilityResult<{ readonly id: number }> {
  let targetId: unknown;
  try {
    targetId = target.id;
  } catch {
    return invalidViewportState("viewport_target_invalid");
  }

  const validated = createBrowserTarget(targetId, "viewport");
  return validated.ok
    ? validated
    : invalidViewportState("viewport_target_invalid");
}

function createRecord(
  target: { readonly id: number },
  viewport: ViewportDimensions,
  now: () => number,
): CapabilityResult<DebuggerSessionRecord> {
  let recordedAtEpochMs: unknown;
  try {
    recordedAtEpochMs = now();
  } catch {
    return invalidViewportState("viewport_clock_invalid");
  }

  if (
    typeof recordedAtEpochMs !== "number" ||
    !Number.isSafeInteger(recordedAtEpochMs) ||
    recordedAtEpochMs < 0
  ) {
    return invalidViewportState("viewport_clock_invalid");
  }

  return capabilitySuccess(
    Object.freeze({
      schemaVersion: 1,
      target,
      viewport,
      recordedAtEpochMs,
    }),
  );
}

function viewportCommandParameters(
  viewport: ViewportDimensions,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
    positionX: 0,
    positionY: 0,
    dontSetVisibleSize: false,
  });
}

function cleanupFailure(): CapabilityFailure {
  return capabilityFailure({
    code: "browser_operation_failed",
    recoverability: "user_action",
    capability: "viewport",
    lifecycleCode: "viewport_cleanup_failed",
  });
}

function invalidViewportState(lifecycleCode: string): CapabilityFailure {
  return capabilityFailure({
    code: "invalid_state",
    recoverability: "none",
    capability: "viewport",
    lifecycleCode,
  });
}
