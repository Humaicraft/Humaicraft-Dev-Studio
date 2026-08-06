import type {
  ChromiumDebuggerApi,
  ChromiumSessionStorage,
} from "./chromium-api";

export type ChromiumRuntimeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => true | void;

export interface ChromiumRuntimeListenerApi {
  readonly onMessage: {
    addListener(listener: ChromiumRuntimeMessageListener): void;
  };
}

export interface ChromiumRuntimeClientApi {
  sendMessage(message: unknown): Promise<unknown>;
}

export interface ChromiumTabsApi {
  query(queryInfo: {
    readonly active: true;
    readonly currentWindow: true;
  }): Promise<readonly unknown[]>;
}

export interface ChromiumBackgroundExtensionApi {
  readonly debugger: ChromiumDebuggerApi;
  readonly storage: { readonly session: ChromiumSessionStorage };
  readonly runtime: ChromiumRuntimeListenerApi;
}

export interface ChromiumPopupExtensionApi {
  readonly tabs: ChromiumTabsApi;
  readonly runtime: ChromiumRuntimeClientApi;
}
