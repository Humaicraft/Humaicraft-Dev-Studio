import {
  DefaultViewportActionMessageHandler,
  type ViewportActionMessageHandler,
} from "../../application/viewport-action";
import { capabilityFailure } from "../../browser-capabilities/capability-result";
import { ChromiumDebuggerSessionRepository } from "./debugger-session-repository";
import type {
  ChromiumBackgroundExtensionApi,
  ChromiumRuntimeListenerApi,
} from "./chromium-extension-api";
import { ChromiumViewportController } from "./viewport-controller";

declare const chrome: ChromiumBackgroundExtensionApi;

export function startChromiumBackground(
  api: ChromiumBackgroundExtensionApi = chrome,
): void {
  const sessions = new ChromiumDebuggerSessionRepository(
    api.debugger,
    api.storage.session,
  );
  const controller = new ChromiumViewportController(api.debugger, sessions);
  registerViewportActionMessages(
    api.runtime,
    new DefaultViewportActionMessageHandler(controller),
  );
}

export function registerViewportActionMessages(
  runtime: ChromiumRuntimeListenerApi,
  handler: ViewportActionMessageHandler,
): void {
  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handler
      .handle(message)
      .catch(() =>
        capabilityFailure({
          code: "browser_operation_failed",
          recoverability: "retry",
          capability: "viewport",
          lifecycleCode: "viewport_message_handler_failed",
        }),
      )
      .then((response) => {
        try {
          sendResponse(response);
        } catch {
          // The caller may close the message channel before the result is ready.
        }
      });

    return true;
  });
}
