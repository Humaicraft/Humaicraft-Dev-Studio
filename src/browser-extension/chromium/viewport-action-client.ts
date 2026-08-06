import {
  createViewportApplyMessage,
  createViewportResetMessage,
  validateViewportActionResult,
  type ViewportActionClient,
  type ViewportActionReceipt,
} from "../../application/viewport-action";
import { createBrowserTarget } from "../../browser-capabilities/browser-target";
import {
  capabilityFailure,
  type CapabilityResult,
} from "../../browser-capabilities/capability-result";
import {
  createViewportDimensions,
  type ViewportDimensions,
} from "../../browser-capabilities/viewport";
import type { ChromiumPopupExtensionApi } from "./chromium-extension-api";
import { normalizeChromiumError } from "./normalize-browser-error";

declare const chrome: ChromiumPopupExtensionApi;

type CorrelationIdFactory = () => string;

export class ChromiumViewportActionClient implements ViewportActionClient {
  readonly #api: ChromiumPopupExtensionApi;
  readonly #createCorrelationId: CorrelationIdFactory;

  constructor(
    api: ChromiumPopupExtensionApi,
    createCorrelationId: CorrelationIdFactory = () => crypto.randomUUID(),
  ) {
    this.#api = api;
    this.#createCorrelationId = createCorrelationId;
  }

  async apply(
    viewportInput: ViewportDimensions,
  ): Promise<CapabilityResult<ViewportActionReceipt>> {
    const viewport = createViewportDimensions(viewportInput);
    if (!viewport.ok) {
      return viewport;
    }

    const target = await this.#getActiveTarget();
    if (!target.ok) {
      return target;
    }

    let correlationId: string;
    try {
      correlationId = this.#createCorrelationId();
    } catch {
      return clientFailure("viewport_correlation_failed");
    }

    return this.#send(
      createViewportApplyMessage(
        target.value.id,
        viewport.value,
        correlationId,
      ),
    );
  }

  async reset(): Promise<CapabilityResult<ViewportActionReceipt>> {
    const target = await this.#getActiveTarget();
    if (!target.ok) {
      return target;
    }

    let correlationId: string;
    try {
      correlationId = this.#createCorrelationId();
    } catch {
      return clientFailure("viewport_correlation_failed");
    }

    return this.#send(
      createViewportResetMessage(target.value.id, correlationId),
    );
  }

  async #getActiveTarget(): Promise<CapabilityResult<{ readonly id: number }>> {
    let tabs: readonly unknown[];
    try {
      tabs = await this.#api.tabs.query({ active: true, currentWindow: true });
    } catch (error) {
      return normalizeChromiumError(error, "viewport");
    }

    let firstTab: unknown;
    try {
      if (!Array.isArray(tabs) || tabs.length !== 1) {
        return activeTargetUnavailable();
      }
      firstTab = tabs[0];
    } catch {
      return activeTargetUnavailable();
    }
    if (!isRecord(firstTab)) {
      return activeTargetUnavailable();
    }

    let targetId: unknown;
    try {
      targetId = firstTab.id;
    } catch {
      return activeTargetUnavailable();
    }
    return createBrowserTarget(targetId, "viewport");
  }

  async #send(
    message: unknown,
  ): Promise<CapabilityResult<ViewportActionReceipt>> {
    let response: unknown;
    try {
      response = await this.#api.runtime.sendMessage(message);
    } catch (error) {
      return normalizeChromiumError(error, "viewport");
    }
    return validateViewportActionResult(response);
  }
}

export function createChromiumViewportActionClient(): ViewportActionClient {
  return new ChromiumViewportActionClient(chrome);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  try {
    return typeof input === "object" && input !== null && !Array.isArray(input);
  } catch {
    return false;
  }
}

function activeTargetUnavailable(): CapabilityResult<never> {
  return capabilityFailure({
    code: "active_target_unavailable",
    recoverability: "retry",
    capability: "viewport",
    lifecycleCode: "active_target_unavailable",
  });
}

function clientFailure(lifecycleCode: string): CapabilityResult<never> {
  return capabilityFailure({
    code: "browser_operation_failed",
    recoverability: "retry",
    capability: "viewport",
    lifecycleCode,
  });
}
