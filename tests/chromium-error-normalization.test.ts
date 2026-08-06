import { describe, expect, it } from "vitest";
import {
  debuggerOwnershipUnknown,
  normalizeChromiumError,
} from "../src/browser-extension/chromium/normalize-browser-error.ts";

describe("Chromium error normalization", () => {
  it.each([
    [
      "Cannot access a chrome:// URL",
      "unsupported_page",
      "unsupported",
    ],
    ["Missing host permission for the tab", "permission_denied", "user_action"],
    [
      "Cannot access contents of url https://private.example/",
      "permission_denied",
      "user_action",
    ],
    ["No tab with id: 42", "active_target_unavailable", "retry"],
    [
      "Another debugger is already attached to the tab",
      "debugger_conflict",
      "user_action",
    ],
  ] as const)("normalizes %s", (message, code, recoverability) => {
    expect(normalizeChromiumError(new Error(message), "viewport")).toMatchObject({
      ok: false,
      error: {
        code,
        recoverability,
        safeContext: { capability: "viewport" },
      },
    });
  });

  it("fails closed for unknown debugger ownership", () => {
    expect(debuggerOwnershipUnknown("viewport")).toEqual({
      ok: false,
      error: {
        code: "debugger_ownership_unknown",
        recoverability: "user_action",
        safeContext: {
          capability: "viewport",
          lifecycleCode: "debugger_ownership_unknown",
        },
      },
    });
  });

  it("does not expose raw errors or sensitive values", () => {
    const privateMessage =
      "Unexpected failure at https://private.example/account?token=secret";
    const normalized = normalizeChromiumError(
      { message: privateMessage, html: "<form>private</form>" },
      "inspection",
    );

    expect(JSON.stringify(normalized)).not.toContain("private.example");
    expect(JSON.stringify(normalized)).not.toContain("token");
    expect(JSON.stringify(normalized)).not.toContain("<form>");
    expect(normalized).toMatchObject({
      error: {
        code: "browser_operation_failed",
        safeContext: {
          capability: "inspection",
          lifecycleCode: "chromium_operation_failed",
        },
      },
    });
  });

  it("does not trust hostile error objects", () => {
    const hostileError = new Proxy(
      {},
      {
        has() {
          throw new Error("private error data");
        },
      },
    );

    expect(normalizeChromiumError(hostileError, "screenshot")).toMatchObject({
      error: { code: "browser_operation_failed" },
    });
  });

  it("normalizes non-error values without retaining them", () => {
    expect(normalizeChromiumError("private raw error", "page_access")).toEqual({
      ok: false,
      error: {
        code: "browser_operation_failed",
        recoverability: "retry",
        safeContext: {
          capability: "page_access",
          lifecycleCode: "chromium_operation_failed",
        },
      },
    });
  });
});
