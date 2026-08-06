import { describe, expect, it } from "vitest";
import {
  DefaultViewportActionMessageHandler,
  createViewportApplyMessage,
  createViewportResetMessage,
  validateViewportActionResult,
} from "../src/application/viewport-action.ts";
import {
  capabilityFailure,
  capabilitySuccess,
  type ViewportController,
} from "../src/browser-capabilities/index.ts";

function createController(): {
  readonly controller: ViewportController;
  readonly calls: Array<readonly [string, unknown, unknown?]>;
} {
  const calls: Array<readonly [string, unknown, unknown?]> = [];
  return {
    calls,
    controller: {
      async apply(target, viewport) {
        calls.push(["apply", target, viewport]);
        return capabilitySuccess({
          target,
          requested: viewport,
          actual: viewport,
        });
      },
      async reset(target) {
        calls.push(["reset", target]);
        return capabilitySuccess(undefined);
      },
    },
  };
}

describe("viewport action message handler", () => {
  it("validates and applies an exact viewport", async () => {
    const { controller, calls } = createController();
    const handler = new DefaultViewportActionMessageHandler(controller);

    await expect(
      handler.handle(
        createViewportApplyMessage(
          42,
          { width: 1280, height: 800 },
          "request-1",
        ),
      ),
    ).resolves.toEqual({
      ok: true,
      value: {
        action: "apply",
        requested: { width: 1280, height: 800 },
        actual: { width: 1280, height: 800 },
      },
    });
    expect(calls).toEqual([
      ["apply", { id: 42 }, { width: 1280, height: 800 }],
    ]);
  });

  it("validates and resets the selected target", async () => {
    const { controller, calls } = createController();
    const handler = new DefaultViewportActionMessageHandler(controller);

    await expect(
      handler.handle(createViewportResetMessage(42, "request-2")),
    ).resolves.toEqual({ ok: true, value: { action: "reset" } });
    expect(calls).toEqual([["reset", { id: 42 }]]);
  });

  it.each([
    {
      version: 1,
      type: "viewport.unknown",
      correlationId: "request-1",
      payload: { targetId: 42 },
    },
    {
      version: 1,
      type: "viewport.apply",
      correlationId: "request-1",
      payload: { targetId: 42, width: 1280, height: 800, url: "private" },
    },
    {
      version: 1,
      type: "viewport.reset",
      correlationId: "request-1",
      payload: { targetId: -1 },
    },
  ])("rejects untrusted messages before browser orchestration", async (input) => {
    const { controller, calls } = createController();
    const handler = new DefaultViewportActionMessageHandler(controller);

    await expect(handler.handle(input)).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_message" },
    });
    expect(calls).toEqual([]);
  });

  it("normalizes an unexpected controller exception", async () => {
    const handler = new DefaultViewportActionMessageHandler({
      async apply() {
        throw new Error("private browser data");
      },
      async reset() {
        throw new Error("private browser data");
      },
    });

    await expect(
      handler.handle(
        createViewportApplyMessage(
          42,
          { width: 1280, height: 800 },
          "request-1",
        ),
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "browser_operation_failed",
        recoverability: "retry",
        safeContext: {
          capability: "viewport",
          lifecycleCode: "viewport_apply_failed",
        },
      },
    });
  });
});

describe("viewport action response validation", () => {
  it("accepts normalized success and failure responses", () => {
    expect(
      validateViewportActionResult({
        ok: true,
        value: {
          action: "apply",
          requested: { width: 1280, height: 800 },
          actual: { width: 1280, height: 800 },
        },
      }),
    ).toMatchObject({ ok: true, value: { action: "apply" } });

    expect(
      validateViewportActionResult(
        capabilityFailure({
          code: "debugger_conflict",
          recoverability: "user_action",
          capability: "viewport",
          lifecycleCode: "chromium_debugger_conflict",
        }),
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "debugger_conflict",
        recoverability: "user_action",
        safeContext: {
          capability: "viewport",
          lifecycleCode: "chromium_debugger_conflict",
        },
      },
    });
  });

  it.each([
    null,
    { ok: true, value: { action: "reset", rawError: "private" } },
    {
      ok: false,
      error: {
        code: "browser_operation_failed",
        recoverability: "retry",
        safeContext: { capability: "viewport", url: "private" },
      },
    },
  ])("fails closed for an invalid response", (input) => {
    expect(validateViewportActionResult(input)).toEqual({
      ok: false,
      error: {
        code: "invalid_state",
        recoverability: "none",
        safeContext: {
          capability: "viewport",
          lifecycleCode: "viewport_response_invalid",
        },
      },
    });
  });
});
