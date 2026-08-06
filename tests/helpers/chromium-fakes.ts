import type {
  ChromiumDebuggee,
  ChromiumDebuggerApi,
  ChromiumDebuggerTarget,
  ChromiumSessionStorage,
} from "../../src/browser-extension/chromium/chromium-api.ts";

export type DebuggerCall =
  | { readonly method: "attach"; readonly tabId: number; readonly version: string }
  | { readonly method: "detach"; readonly tabId: number }
  | { readonly method: "getTargets" }
  | {
      readonly method: "sendCommand";
      readonly tabId: number;
      readonly command: string;
      readonly parameters?: Readonly<Record<string, unknown>>;
    };

export class FakeChromiumDebuggerApi implements ChromiumDebuggerApi {
  readonly calls: DebuggerCall[] = [];
  targets: ChromiumDebuggerTarget[] = [];
  attachError: unknown;
  detachError: unknown;
  getTargetsError: unknown;
  readonly sendCommandErrors = new Map<string, unknown[]>();

  async attach(target: ChromiumDebuggee, requiredVersion: string): Promise<void> {
    this.calls.push({
      method: "attach",
      tabId: target.tabId,
      version: requiredVersion,
    });
    if (this.attachError !== undefined) {
      throw this.attachError;
    }

    this.targets = [
      ...this.targets.filter((candidate) => candidate.tabId !== target.tabId),
      { tabId: target.tabId, attached: true },
    ];
  }

  async detach(target: ChromiumDebuggee): Promise<void> {
    this.calls.push({ method: "detach", tabId: target.tabId });
    if (this.detachError !== undefined) {
      throw this.detachError;
    }

    this.targets = this.targets.map((candidate) =>
      candidate.tabId === target.tabId
        ? { ...candidate, attached: false }
        : candidate,
    );
  }

  async getTargets(): Promise<readonly ChromiumDebuggerTarget[]> {
    this.calls.push({ method: "getTargets" });
    if (this.getTargetsError !== undefined) {
      throw this.getTargetsError;
    }
    return this.targets;
  }

  async sendCommand(
    target: ChromiumDebuggee,
    method: string,
    commandParams?: Readonly<Record<string, unknown>>,
  ): Promise<unknown> {
    this.calls.push({
      method: "sendCommand",
      tabId: target.tabId,
      command: method,
      ...(commandParams === undefined ? {} : { parameters: commandParams }),
    });

    const errors = this.sendCommandErrors.get(method);
    const error = errors?.shift();
    if (error !== undefined) {
      throw error;
    }

    return undefined;
  }
}

export class FakeChromiumSessionStorage implements ChromiumSessionStorage {
  readonly values = new Map<string, unknown>();
  readonly calls: Array<
    | { readonly method: "get"; readonly key: string }
    | { readonly method: "set"; readonly keys: readonly string[] }
    | { readonly method: "remove"; readonly key: string }
  > = [];
  getError: unknown;
  setError: unknown;
  removeError: unknown;

  async get(key: string): Promise<Record<string, unknown>> {
    this.calls.push({ method: "get", key });
    if (this.getError !== undefined) {
      throw this.getError;
    }

    return this.values.has(key) ? { [key]: this.values.get(key) } : {};
  }

  async set(items: Readonly<Record<string, unknown>>): Promise<void> {
    const keys = Object.keys(items);
    this.calls.push({ method: "set", keys });
    if (this.setError !== undefined) {
      throw this.setError;
    }

    for (const key of keys) {
      this.values.set(key, items[key]);
    }
  }

  async remove(key: string): Promise<void> {
    this.calls.push({ method: "remove", key });
    if (this.removeError !== undefined) {
      throw this.removeError;
    }
    this.values.delete(key);
  }
}
