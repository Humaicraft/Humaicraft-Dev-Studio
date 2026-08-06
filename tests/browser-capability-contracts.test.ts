import { describe, expect, it } from "vitest";
import {
  VIEWPORT_LIMITS,
  capabilityFailure,
  capabilitySuccess,
  createBrowserTarget,
  createViewportDimensions,
  type ViewportController,
} from "../src/browser-capabilities/index.ts";

describe("browser capability contracts", () => {
  it("creates bounded safe context without retaining untrusted details", () => {
    const failure = capabilityFailure({
      code: "browser_operation_failed",
      recoverability: "retry",
      capability: "inspection",
      lifecycleCode: "https://private.example/account?token=secret",
    });

    expect(failure).toEqual({
      ok: false,
      error: {
        code: "browser_operation_failed",
        recoverability: "retry",
        safeContext: { capability: "inspection" },
      },
    });
  });

  it("validates browser target identifiers", () => {
    expect(createBrowserTarget(0)).toEqual({ ok: true, value: { id: 0 } });
    expect(createBrowserTarget(-1, "viewport")).toMatchObject({
      error: { safeContext: { capability: "viewport" } },
    });

    for (const input of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "7", null]) {
      expect(createBrowserTarget(input)).toMatchObject({
        ok: false,
        error: { code: "active_target_unavailable" },
      });
    }
  });

  it("validates the viewport limits recorded by the Chromium spike", () => {
    expect(
      createViewportDimensions({
        width: VIEWPORT_LIMITS.minWidth,
        height: VIEWPORT_LIMITS.minHeight,
      }),
    ).toEqual({
      ok: true,
      value: {
        width: VIEWPORT_LIMITS.minWidth,
        height: VIEWPORT_LIMITS.minHeight,
      },
    });

    expect(
      createViewportDimensions({
        width: VIEWPORT_LIMITS.maxWidth,
        height: VIEWPORT_LIMITS.maxHeight,
      }),
    ).toMatchObject({ ok: true });

    for (const input of [
      null,
      [],
      { width: VIEWPORT_LIMITS.minWidth - 1, height: 800 },
      { width: 1280, height: VIEWPORT_LIMITS.maxHeight + 1 },
      { width: 1280.5, height: 800 },
      { width: "1280", height: 800 },
    ]) {
      expect(createViewportDimensions(input)).toMatchObject({
        ok: false,
        error: { code: "invalid_state" },
      });
    }
  });

  it("fails closed when an untrusted viewport object throws during access", () => {
    const hostileInput = new Proxy(
      {},
      {
        get() {
          throw new Error("private page data");
        },
      },
    );

    expect(createViewportDimensions(hostileInput)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "viewport_shape_invalid" },
      },
    });
  });

  it("fails closed for a revoked viewport proxy", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(createViewportDimensions(proxy)).toMatchObject({
      ok: false,
      error: { code: "invalid_state" },
    });
  });

  it("supports browser-free contract doubles", async () => {
    const target = createBrowserTarget(42);
    const viewport = createViewportDimensions({ width: 1280, height: 800 });
    expect(target.ok && viewport.ok).toBe(true);
    if (!target.ok || !viewport.ok) {
      return;
    }

    const controller: ViewportController = {
      async apply(inputTarget, inputViewport) {
        return capabilitySuccess({
          target: inputTarget,
          requested: inputViewport,
          actual: inputViewport,
        });
      },
      async reset() {
        return capabilitySuccess(undefined);
      },
    };

    await expect(
      controller.apply(target.value, viewport.value),
    ).resolves.toEqual({
      ok: true,
      value: {
        target: { id: 42 },
        requested: { width: 1280, height: 800 },
        actual: { width: 1280, height: 800 },
      },
    });
    await expect(controller.reset(target.value)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });
});
