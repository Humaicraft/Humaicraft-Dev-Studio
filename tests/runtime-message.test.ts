import { describe, expect, it } from "vitest";
import {
  createViewportDimensions,
  validateRuntimeMessage,
} from "../src/browser-capabilities/index.ts";

const viewportApply = {
  type: "viewport.apply",
  validatePayload: createViewportDimensions,
} as const;

describe("runtime message validation", () => {
  it("accepts a supported version, type, correlation ID, and payload", () => {
    expect(
      validateRuntimeMessage(
        {
          version: 1,
          type: "viewport.apply",
          correlationId: "viewport_apply-01",
          payload: { width: 1280, height: 800 },
        },
        viewportApply,
      ),
    ).toEqual({
      ok: true,
      value: {
        version: 1,
        type: "viewport.apply",
        correlationId: "viewport_apply-01",
        payload: { width: 1280, height: 800 },
      },
    });
  });

  it.each([
    ["shape", null, "message_shape_invalid"],
    [
      "version",
      {
        version: 2,
        type: "viewport.apply",
        correlationId: "request-1",
        payload: { width: 1280, height: 800 },
      },
      "message_version_unsupported",
    ],
    [
      "type",
      {
        version: 1,
        type: "viewport.reset",
        correlationId: "request-1",
        payload: { width: 1280, height: 800 },
      },
      "message_type_unsupported",
    ],
    [
      "correlation ID",
      {
        version: 1,
        type: "viewport.apply",
        correlationId: "private/url?token=secret",
        payload: { width: 1280, height: 800 },
      },
      "correlation_id_invalid",
    ],
    [
      "missing payload",
      {
        version: 1,
        type: "viewport.apply",
        correlationId: "request-1",
      },
      "message_payload_missing",
    ],
    [
      "payload",
      {
        version: 1,
        type: "viewport.apply",
        correlationId: "request-1",
        payload: { width: 1, height: 1 },
      },
      "message_payload_invalid",
    ],
    [
      "unexpected envelope field",
      {
        version: 1,
        type: "viewport.apply",
        correlationId: "request-1",
        payload: { width: 1280, height: 800 },
        url: "https://private.example/account",
      },
      "message_shape_invalid",
    ],
  ])("rejects an invalid %s", (_label, input, lifecycleCode) => {
    expect(validateRuntimeMessage(input, viewportApply)).toEqual({
      ok: false,
      error: {
        code: "invalid_message",
        recoverability: "none",
        safeContext: {
          capability: "runtime_message",
          lifecycleCode,
        },
      },
    });
  });

  it("fails closed when an untrusted envelope throws during access", () => {
    const hostileInput = new Proxy(
      {},
      {
        get() {
          throw new Error("private message data");
        },
      },
    );

    expect(validateRuntimeMessage(hostileInput, viewportApply)).toMatchObject({
      ok: false,
      error: {
        code: "invalid_message",
        safeContext: { lifecycleCode: "message_shape_invalid" },
      },
    });
  });

  it("fails closed for a revoked message proxy", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(validateRuntimeMessage(proxy, viewportApply)).toMatchObject({
      ok: false,
      error: { code: "invalid_message" },
    });
  });

  it("normalizes a payload validator exception", () => {
    expect(
      validateRuntimeMessage(
        {
          version: 1,
          type: "test.throw",
          correlationId: "request-1",
          payload: {},
        },
        {
          type: "test.throw",
          validatePayload() {
            throw new Error("private payload data");
          },
        },
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "invalid_message",
        safeContext: { lifecycleCode: "message_payload_invalid" },
      },
    });
  });
});
