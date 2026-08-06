import { describe, expect, it } from "vitest";
import { capabilitySuccess } from "../src/browser-capabilities/index.ts";
import {
  registerViewportActionMessages,
  startChromiumBackground,
} from "../src/browser-extension/chromium/background-runtime.ts";
import type {
  ChromiumPopupExtensionApi,
  ChromiumRuntimeMessageListener,
} from "../src/browser-extension/chromium/chromium-extension-api.ts";
import { ChromiumViewportActionClient } from "../src/browser-extension/chromium/viewport-action-client.ts";
import {
  FakeChromiumDebuggerApi,
  FakeChromiumSessionStorage,
} from "./helpers/chromium-fakes.ts";

describe("Chromium viewport action client", () => {
  it("reads only the active tab ID and sends a versioned message", async () => {
    const messages: unknown[] = [];
    const guardedTab = new Proxy(
      { id: 42 },
      {
        get(target, key, receiver) {
          if (key !== "id") {
            throw new Error("tab metadata must not be read");
          }
          return Reflect.get(target, key, receiver);
        },
      },
    );
    const api: ChromiumPopupExtensionApi = {
      tabs: {
        async query() {
          return [guardedTab];
        },
      },
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return {
            ok: true,
            value: {
              action: "apply",
              requested: { width: 1280, height: 800 },
              actual: { width: 1280, height: 800 },
            },
          };
        },
      },
    };
    const client = new ChromiumViewportActionClient(api, () => "request-1");

    await expect(
      client.apply({ width: 1280, height: 800 }),
    ).resolves.toMatchObject({ ok: true, value: { action: "apply" } });
    expect(messages).toEqual([
      {
        version: 1,
        type: "viewport.apply",
        correlationId: "request-1",
        payload: { targetId: 42, width: 1280, height: 800 },
      },
    ]);
  });

  it("fails without sending when no active target is available", async () => {
    let sends = 0;
    const client = new ChromiumViewportActionClient(
      {
        tabs: { async query() { return []; } },
        runtime: {
          async sendMessage() {
            sends += 1;
            return undefined;
          },
        },
      },
      () => "request-1",
    );

    await expect(client.reset()).resolves.toMatchObject({
      ok: false,
      error: { code: "active_target_unavailable" },
    });
    expect(sends).toBe(0);
  });

  it("fails closed for a hostile tab collection", async () => {
    const hostileTabs = new Proxy([], {
      get(target, key, receiver) {
        if (key === "then") {
          return undefined;
        }
        if (key === "length") {
          throw new Error("private tab metadata");
        }
        return Reflect.get(target, key, receiver);
      },
    });
    const client = new ChromiumViewportActionClient(
      {
        tabs: {
          async query() {
            return hostileTabs;
          },
        },
        runtime: {
          async sendMessage() {
            return undefined;
          },
        },
      },
      () => "request-1",
    );

    await expect(client.reset()).resolves.toMatchObject({
      ok: false,
      error: { code: "active_target_unavailable" },
    });
  });

  it("fails closed when the service worker response is invalid", async () => {
    const client = new ChromiumViewportActionClient(
      {
        tabs: { async query() { return [{ id: 42 }]; } },
        runtime: {
          async sendMessage() {
            return { ok: true, value: { action: "reset", url: "private" } };
          },
        },
      },
      () => "request-1",
    );

    await expect(client.reset()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "viewport_response_invalid" },
      },
    });
  });
});

describe("Chromium background message registration", () => {
  it("keeps the response channel open and returns the normalized result", async () => {
    let listener: ChromiumRuntimeMessageListener | undefined;
    registerViewportActionMessages(
      {
        onMessage: {
          addListener(nextListener) {
            listener = nextListener;
          },
        },
      },
      {
        async handle() {
          return capabilitySuccess({ action: "reset" });
        },
      },
    );

    expect(listener).toBeDefined();
    const response = new Promise<unknown>((resolve) => {
      expect(listener?.({}, {}, resolve)).toBe(true);
    });
    await expect(response).resolves.toEqual({
      ok: true,
      value: { action: "reset" },
    });
  });

  it("composes real adapters for apply and reset without page metadata", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    let listener: ChromiumRuntimeMessageListener | undefined;
    startChromiumBackground({
      debugger: debuggerApi,
      storage: { session: storage },
      runtime: {
        onMessage: {
          addListener(nextListener) {
            listener = nextListener;
          },
        },
      },
    });

    const dispatch = (message: unknown): Promise<unknown> =>
      new Promise((resolve, reject) => {
        if (listener === undefined) {
          reject(new Error("listener was not registered"));
          return;
        }
        expect(listener(message, {}, resolve)).toBe(true);
      });

    await expect(
      dispatch({
        version: 1,
        type: "viewport.apply",
        correlationId: "integration-1",
        payload: { targetId: 42, width: 1280, height: 800 },
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        action: "apply",
        requested: { width: 1280, height: 800 },
        actual: { width: 1280, height: 800 },
      },
    });
    expect(debuggerApi.calls).toEqual([
      { method: "getTargets" },
      { method: "attach", tabId: 42, version: "1.3" },
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
    expect(storage.values.size).toBe(1);

    await expect(
      dispatch({
        version: 1,
        type: "viewport.reset",
        correlationId: "integration-2",
        payload: { targetId: 42 },
      }),
    ).resolves.toEqual({ ok: true, value: { action: "reset" } });
    expect(debuggerApi.calls.slice(-3)).toEqual([
      { method: "getTargets" },
      {
        method: "sendCommand",
        tabId: 42,
        command: "Emulation.clearDeviceMetricsOverride",
      },
      { method: "detach", tabId: 42 },
    ]);
    expect(storage.values.size).toBe(0);
  });
});
