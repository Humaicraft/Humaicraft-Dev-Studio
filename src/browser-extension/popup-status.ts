import type { ViewportActionReceipt } from "../application/viewport-action";
import type { CapabilityResult } from "../browser-capabilities/capability-result";

export type PopupStatus =
  | { readonly state: "success"; readonly message: string }
  | { readonly state: "error"; readonly message: string };

export function formatViewportActionStatus(
  result: CapabilityResult<ViewportActionReceipt>,
): PopupStatus {
  if (result.ok) {
    if (result.value.action === "reset") {
      return {
        state: "success",
        message: "Viewport reset. The Humaicraft debugger session was detached.",
      };
    }

    return {
      state: "success",
      message: `Applied ${result.value.actual.width} × ${result.value.actual.height} CSS pixels to the active tab.`,
    };
  }

  const messages = {
    active_target_unavailable:
      "No active tab is available. Return to a normal page and try again.",
    unsupported_page:
      "Chrome protects this page from viewport control. Open a normal HTTP or HTTPS page and try again.",
    permission_denied:
      "Chrome did not allow viewport control. Review the extension permission and try again.",
    permission_unavailable:
      "The required Chrome permission is unavailable for this page.",
    debugger_conflict:
      "Another debugger is already connected. Close DevTools or the other debugger, then try again.",
    debugger_ownership_unknown:
      "Humaicraft cannot safely confirm debugger ownership. Close the other debugger or reload the tab before reapplying.",
    target_closed: "The target tab closed before the action finished.",
    target_changed:
      "The active tab changed before the action finished. Return to the intended tab and try again.",
    operation_cancelled: "Viewport control was cancelled. The page was left unchanged.",
    operation_timed_out:
      "Viewport control timed out. Confirm the tab is responsive and try again.",
    browser_operation_failed:
      "Chrome could not complete viewport control. Try again or reload the extension.",
    invalid_message:
      "The viewport request was rejected safely. Reload the extension and try again.",
    invalid_state:
      "The viewport request contained invalid state. Check the dimensions and try again.",
  } as const;

  return { state: "error", message: messages[result.error.code] };
}
