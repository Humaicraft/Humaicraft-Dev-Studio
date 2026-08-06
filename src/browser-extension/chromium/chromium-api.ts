export interface ChromiumDebuggee {
  readonly tabId: number;
}

export interface ChromiumDebuggerTarget {
  readonly attached: boolean;
  readonly tabId?: number;
}

export interface ChromiumDebuggerApi {
  attach(target: ChromiumDebuggee, requiredVersion: string): Promise<void>;
  detach(target: ChromiumDebuggee): Promise<void>;
  getTargets(): Promise<readonly ChromiumDebuggerTarget[]>;
  sendCommand(
    target: ChromiumDebuggee,
    method: string,
    commandParams?: Readonly<Record<string, unknown>>,
  ): Promise<unknown>;
}

export interface ChromiumSessionStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Readonly<Record<string, unknown>>): Promise<void>;
  remove(key: string): Promise<void>;
}
