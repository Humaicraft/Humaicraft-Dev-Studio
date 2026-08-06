import { describe, expect, it } from "vitest";
import { capabilityFailure, capabilitySuccess } from "../src/browser-capabilities/index.ts";
import { formatViewportActionStatus } from "../src/browser-extension/popup-status.ts";

describe("popup viewport status", () => {
  it("reports the actual applied dimensions", () => {
    expect(
      formatViewportActionStatus(
        capabilitySuccess({
          action: "apply",
          requested: { width: 1280, height: 800 },
          actual: { width: 1279, height: 800 },
        }),
      ),
    ).toEqual({
      state: "success",
      message: "Applied 1279 × 800 CSS pixels to the active tab.",
    });
  });

  it("gives an actionable debugger-conflict recovery message", () => {
    expect(
      formatViewportActionStatus(
        capabilityFailure({
          code: "debugger_conflict",
          recoverability: "user_action",
          capability: "viewport",
        }),
      ),
    ).toEqual({
      state: "error",
      message:
        "Another debugger is already connected. Close DevTools or the other debugger, then try again.",
    });
  });
});
