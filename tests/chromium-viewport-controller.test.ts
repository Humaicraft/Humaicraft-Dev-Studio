import { describe, expect, it } from "vitest";
import {
  createBrowserTarget,
  createViewportDimensions,
} from "../src/browser-capabilities/index.ts";
import {
  ChromiumDebuggerSessionRepository,
} from "../src/browser-extension/chromium/debugger-session-repository.ts";
import {
  CHROMIUM_DEBUGGER_PROTOCOL_VERSION,
  ChromiumViewportController,
} from "../src/browser-extension/chromium/viewport-controller.ts";
import {
  FakeChromiumDebuggerApi,
  FakeChromiumSessionStorage,
} from "./helpers/chromium-fakes.ts";

function createFixture() {
  const debuggerApi = new FakeChromiumDebuggerApi();
  const storage = new FakeChromiumSessionStorage();
  const sessions = new ChromiumDebuggerSessionRepository(debuggerApi, storage);
  const controller = new ChromiumViewportController(
    debuggerApi,
    sessions,
    () => 1_786_000_000_000,
  );
  const target = createBrowserTarget(42, "viewport");
  const viewport = createViewportDimensions({ width: 1280, height: 800 });
  if (!target.ok || !viewport.ok) {
    throw new Error("Invalid test fixture");
  }

  return {
    controller,
    debuggerApi,
    sessions,
    storage,
    target: target.value,
    viewport: viewport.value,
  };
}

describe("ChromiumViewportController", () => {
  it("attaches, records ownership evidence, and applies exact viewport metrics", async () => {
    const fixture = createFixture();

    await expect(
      fixture.controller.apply(fixture.target, fixture.viewport),
    ).resolves.toEqual({
      ok: true,
      value: {
        target: { id: 42 },
        requested: { width: 1280, height: 800 },
        actual: { width: 1280, height: 800 },
      },
    });

    expect(fixture.debuggerApi.calls).toEqual([
      { method: "getTargets" },
      {
        method: "attach",
        tabId: 42,
        version: CHROMIUM_DEBUGGER_PROTOCOL_VERSION,
      },
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.setDeviceMetricsOverride",
        parameters: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          mobile: false,
          screenWidth: 1280,
          screenHeight: 800,
          positionX: 0,
          positionY: 0,
          dontSetVisibleSize: false,
        },
      },
    ]);
    expect(fixture.storage.values.size).toBe(1);
  });

  it("reapplies an owned session without attaching a second debugger", async () => {
    const fixture = createFixture();
    await fixture.controller.apply(fixture.target, fixture.viewport);
    fixture.debuggerApi.calls.length = 0;

    const nextViewport = createViewportDimensions({ width: 1440, height: 900 });
    if (!nextViewport.ok) {
      throw new Error("Invalid test fixture");
    }
    await expect(
      fixture.controller.apply(fixture.target, nextViewport.value),
    ).resolves.toMatchObject({ ok: true });

    expect(fixture.debuggerApi.calls).toEqual([
      { method: "getTargets" },
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.setDeviceMetricsOverride",
        parameters: expect.objectContaining({ width: 1440, height: 900 }),
      },
    ]);
  });

  it("fails closed without detaching an external or unknown debugger", async () => {
    const fixture = createFixture();
    fixture.debuggerApi.targets = [{ tabId: 42, attached: true }];

    await expect(
      fixture.controller.apply(fixture.target, fixture.viewport),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "debugger_ownership_unknown" },
    });
    expect(fixture.debuggerApi.calls).toEqual([{ method: "getTargets" }]);
  });

  it("normalizes an attach conflict without attempting cleanup", async () => {
    const fixture = createFixture();
    fixture.debuggerApi.attachError = new Error(
      "Another debugger is already attached to the tab",
    );

    await expect(
      fixture.controller.apply(fixture.target, fixture.viewport),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "debugger_conflict" },
    });
    expect(fixture.debuggerApi.calls).toEqual([
      { method: "getTargets" },
      {
        method: "attach",
        tabId: 42,
        version: CHROMIUM_DEBUGGER_PROTOCOL_VERSION,
      },
    ]);
  });

  it("cleans an owned session after viewport application fails", async () => {
    const fixture = createFixture();
    fixture.debuggerApi.sendCommandErrors.set(
      "Emulation.setDeviceMetricsOverride",
      [new Error("Unexpected private failure")],
    );

    const result = await fixture.controller.apply(
      fixture.target,
      fixture.viewport,
    );
    expect(result).toMatchObject({
      ok: false,
      error: { code: "browser_operation_failed" },
    });
    expect(JSON.stringify(result)).not.toContain("private failure");
    expect(fixture.debuggerApi.targets).toEqual([
      { tabId: 42, attached: false },
    ]);
    expect(fixture.storage.values.size).toBe(0);
    expect(fixture.debuggerApi.calls.slice(-3)).toEqual([
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.setDeviceMetricsOverride",
        parameters: expect.any(Object),
      },
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.clearDeviceMetricsOverride",
      },
      { method: "detach", tabId: 42 },
    ]);
  });

  it("preserves ownership evidence when apply cleanup cannot detach", async () => {
    const fixture = createFixture();
    fixture.debuggerApi.sendCommandErrors.set(
      "Emulation.setDeviceMetricsOverride",
      [new Error("Apply failed privately")],
    );
    fixture.debuggerApi.detachError = new Error("Detach failed privately");

    await expect(
      fixture.controller.apply(fixture.target, fixture.viewport),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "browser_operation_failed",
        safeContext: { lifecycleCode: "viewport_cleanup_failed" },
      },
    });
    expect(fixture.storage.values.size).toBe(1);
    await expect(fixture.sessions.reconcile(fixture.target)).resolves.toMatchObject({
      ok: true,
      value: { ownership: "owned" },
    });
  });

  it("clears, detaches, and removes evidence on reset", async () => {
    const fixture = createFixture();
    await fixture.controller.apply(fixture.target, fixture.viewport);
    fixture.debuggerApi.calls.length = 0;

    await expect(fixture.controller.reset(fixture.target)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.debuggerApi.calls).toEqual([
      { method: "getTargets" },
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.clearDeviceMetricsOverride",
      },
      { method: "detach", tabId: 42 },
    ]);
    expect(fixture.storage.values.size).toBe(0);
  });

  it("preserves attributable evidence when detach fails", async () => {
    const fixture = createFixture();
    await fixture.controller.apply(fixture.target, fixture.viewport);
    fixture.debuggerApi.detachError = new Error("Detach failed privately");

    await expect(fixture.controller.reset(fixture.target)).resolves.toEqual({
      ok: false,
      error: {
        code: "browser_operation_failed",
        recoverability: "user_action",
        safeContext: {
          capability: "viewport",
          lifecycleCode: "viewport_cleanup_failed",
        },
      },
    });
    expect(fixture.storage.values.size).toBe(1);
    await expect(fixture.sessions.reconcile(fixture.target)).resolves.toMatchObject({
      ok: true,
      value: { ownership: "owned" },
    });
  });

  it("fails closed without detaching an unknown debugger during reset", async () => {
    const fixture = createFixture();
    fixture.debuggerApi.targets = [{ tabId: 42, attached: true }];

    await expect(fixture.controller.reset(fixture.target)).resolves.toMatchObject({
      ok: false,
      error: { code: "debugger_ownership_unknown" },
    });
    expect(fixture.debuggerApi.calls).toEqual([{ method: "getTargets" }]);
  });

  it("uses detach as authoritative cleanup when clear fails", async () => {
    const fixture = createFixture();
    await fixture.controller.apply(fixture.target, fixture.viewport);
    fixture.debuggerApi.sendCommandErrors.set(
      "Emulation.clearDeviceMetricsOverride",
      [new Error("Clear failed privately")],
    );

    await expect(fixture.controller.reset(fixture.target)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.debuggerApi.targets).toEqual([
      { tabId: 42, attached: false },
    ]);
    expect(fixture.storage.values.size).toBe(0);
  });

  it("treats reset of a detached target as idempotent", async () => {
    const fixture = createFixture();

    await expect(fixture.controller.reset(fixture.target)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.debuggerApi.calls).toEqual([{ method: "getTargets" }]);
  });

  it("cleans an attached session when evidence persistence fails", async () => {
    const fixture = createFixture();
    fixture.storage.setError = new Error("Storage unavailable");

    await expect(
      fixture.controller.apply(fixture.target, fixture.viewport),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "browser_operation_failed" },
    });
    expect(fixture.debuggerApi.targets).toEqual([
      { tabId: 42, attached: false },
    ]);
    expect(fixture.storage.values.size).toBe(0);
  });

  it("rejects an invalid clock before attaching", async () => {
    const fixture = createFixture();
    const controller = new ChromiumViewportController(
      fixture.debuggerApi,
      fixture.sessions,
      () => Number.NaN,
    );

    await expect(
      controller.apply(fixture.target, fixture.viewport),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "viewport_clock_invalid" },
      },
    });
    expect(fixture.debuggerApi.calls).toEqual([{ method: "getTargets" }]);
  });

  it("rejects hostile target input without calling Chromium", async () => {
    const fixture = createFixture();
    const hostileTarget = new Proxy(
      {},
      {
        get() {
          throw new Error("Private target data");
        },
      },
    );

    await expect(
      fixture.controller.reset(
        hostileTarget as unknown as { readonly id: number },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "viewport_target_invalid" },
      },
    });
    expect(fixture.debuggerApi.calls).toEqual([]);
  });
});
