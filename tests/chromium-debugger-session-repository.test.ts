import { describe, expect, it } from "vitest";
import {
  createBrowserTarget,
  createViewportDimensions,
  type DebuggerSessionRecord,
} from "../src/browser-capabilities/index.ts";
import {
  ChromiumDebuggerSessionRepository,
  validateDebuggerSessionRecord,
} from "../src/browser-extension/chromium/debugger-session-repository.ts";
import {
  FakeChromiumDebuggerApi,
  FakeChromiumSessionStorage,
} from "./helpers/chromium-fakes.ts";

function createRecord(targetId = 42): DebuggerSessionRecord {
  const target = createBrowserTarget(targetId, "debugger_session");
  const viewport = createViewportDimensions({ width: 1280, height: 800 });
  if (!target.ok || !viewport.ok) {
    throw new Error("Invalid test fixture");
  }

  return {
    schemaVersion: 1,
    target: target.value,
    viewport: viewport.value,
    recordedAtEpochMs: 1_786_000_000_000,
  };
}

describe("ChromiumDebuggerSessionRepository", () => {
  it("stores schema-versioned evidence without an ownership claim", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();

    await expect(repository.writeOwned(record)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(repository.read(record.target)).resolves.toEqual({
      ok: true,
      value: record,
    });

    const stored = [...storage.values.values()][0];
    expect(stored).not.toHaveProperty("ownership");
    expect(stored).not.toHaveProperty("url");
  });

  it("returns no evidence when storage has no target record", async () => {
    const repository = new ChromiumDebuggerSessionRepository(
      new FakeChromiumDebuggerApi(),
      new FakeChromiumSessionStorage(),
    );

    await expect(repository.read(createRecord().target)).resolves.toEqual({
      ok: true,
      value: null,
    });
  });

  it("reports ownership only when the current repository owns an attached target", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();

    await repository.writeOwned(record);
    debuggerApi.targets = [{ tabId: record.target.id, attached: true }];

    await expect(repository.reconcile(record.target)).resolves.toMatchObject({
      ok: true,
      value: { ownership: "owned", evidence: record },
    });
  });

  it("treats an attached target as external or unknown after repository replacement", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const original = new ChromiumDebuggerSessionRepository(debuggerApi, storage);
    const record = createRecord();
    await original.writeOwned(record);
    debuggerApi.targets = [{ tabId: record.target.id, attached: true }];

    const replacement = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    await expect(replacement.reconcile(record.target)).resolves.toMatchObject({
      ok: true,
      value: { ownership: "external_or_unknown", evidence: record },
    });
  });

  it("removes stale evidence when the target is detached", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();
    await repository.writeOwned(record);
    debuggerApi.targets = [{ tabId: record.target.id, attached: false }];

    await expect(repository.reconcile(record.target)).resolves.toEqual({
      ok: true,
      value: { ownership: "detached", evidence: null },
    });
    expect(storage.values.size).toBe(0);
  });

  it("discards records with unknown or sensitive fields", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();
    await repository.writeOwned(record);
    const key = [...storage.values.keys()][0];
    if (key === undefined) {
      throw new Error("Missing test storage key");
    }
    storage.values.set(key, {
      ...record,
      url: "https://private.example/account?token=secret",
    });

    const result = await repository.read(record.target);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "debugger_session_record_invalid" },
      },
    });
    expect(JSON.stringify(result)).not.toContain("private.example");
    expect(storage.values.size).toBe(0);
  });

  it("rejects mismatched target evidence", () => {
    expect(validateDebuggerSessionRecord(createRecord(7), 42)).toMatchObject({
      ok: false,
      error: { code: "invalid_state" },
    });
  });

  it.each([
    { ...createRecord(), schemaVersion: 2 },
    { ...createRecord(), recordedAtEpochMs: -1 },
    { ...createRecord(), viewport: { width: 1, height: 1 } },
    {
      ...createRecord(),
      viewport: {
        width: 1280,
        height: 800,
        url: "https://private.example/",
      },
    },
    { ...createRecord(), target: { id: "42" } },
  ])("rejects an invalid record shape", (record) => {
    expect(validateDebuggerSessionRecord(record)).toMatchObject({
      ok: false,
      error: { code: "invalid_state" },
    });
  });

  it("fails closed for hostile records and debugger target entries", async () => {
    const hostileRecord = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("Private storage data");
        },
      },
    );
    expect(validateDebuggerSessionRecord(hostileRecord)).toMatchObject({
      ok: false,
      error: { code: "invalid_state" },
    });

    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();
    debuggerApi.targets = [
      new Proxy(
        { tabId: record.target.id, attached: true },
        {
          get() {
            throw new Error("Private debugger target data");
          },
        },
      ),
    ];

    await expect(repository.reconcile(record.target)).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_state",
        safeContext: { lifecycleCode: "debugger_targets_invalid" },
      },
    });
  });

  it("reports cleanup failure when an invalid stored record cannot be removed", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();
    await repository.writeOwned(record);
    const key = [...storage.values.keys()][0];
    if (key === undefined) {
      throw new Error("Missing test storage key");
    }
    storage.values.set(key, { ...record, token: "private" });
    storage.removeError = new Error("Storage remove failed privately");

    const result = await repository.read(record.target);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "browser_operation_failed" },
    });
    expect(JSON.stringify(result)).not.toContain("privately");
  });

  it("normalizes storage and debugger failures without raw details", async () => {
    const debuggerApi = new FakeChromiumDebuggerApi();
    const storage = new FakeChromiumSessionStorage();
    const repository = new ChromiumDebuggerSessionRepository(
      debuggerApi,
      storage,
    );
    const record = createRecord();

    storage.getError = new Error(
      "Storage failed for https://private.example/?token=secret",
    );
    const storageFailure = await repository.read(record.target);
    expect(storageFailure).toMatchObject({
      error: { code: "browser_operation_failed" },
    });
    expect(JSON.stringify(storageFailure)).not.toContain("private.example");

    storage.getError = undefined;
    debuggerApi.getTargetsError = new Error("Private debugger details");
    const debuggerFailure = await repository.reconcile(record.target);
    expect(debuggerFailure).toMatchObject({
      error: { code: "browser_operation_failed" },
    });
    expect(JSON.stringify(debuggerFailure)).not.toContain("Private debugger");
  });
});
