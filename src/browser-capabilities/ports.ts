import type { BrowserTarget } from "./browser-target";
import type {
  BrowserCapability,
  CapabilityAvailability,
  CapabilityResult,
} from "./capability-result";
import type { ViewportDimensions } from "./viewport";

export interface AppliedViewport {
  readonly target: BrowserTarget;
  readonly requested: ViewportDimensions;
  readonly actual: ViewportDimensions;
}

export interface ViewportController {
  apply(
    target: BrowserTarget,
    viewport: ViewportDimensions,
  ): Promise<CapabilityResult<AppliedViewport>>;
  reset(target: BrowserTarget): Promise<CapabilityResult<void>>;
}

export type DebuggerOwnership = "owned" | "external_or_unknown" | "detached";

export interface DebuggerSessionRecord {
  readonly schemaVersion: 1;
  readonly target: BrowserTarget;
  readonly viewport?: ViewportDimensions;
  readonly recordedAtEpochMs: number;
}

export interface DebuggerSessionState {
  readonly ownership: DebuggerOwnership;
  readonly evidence: DebuggerSessionRecord | null;
}

export interface DebuggerSessionRepository {
  read(
    target: BrowserTarget,
  ): Promise<CapabilityResult<DebuggerSessionRecord | null>>;
  reconcile(
    target: BrowserTarget,
  ): Promise<CapabilityResult<DebuggerSessionState>>;
  writeOwned(
    evidence: DebuggerSessionRecord,
  ): Promise<CapabilityResult<void>>;
  removeOwned(target: BrowserTarget): Promise<CapabilityResult<void>>;
}

export interface PageAccessRequest {
  readonly target: BrowserTarget;
  readonly capability: BrowserCapability;
}

export interface ExplicitPageAccessRequest extends PageAccessRequest {
  readonly userInitiated: true;
}

export interface PageAccessController {
  check(
    request: PageAccessRequest,
  ): Promise<CapabilityResult<CapabilityAvailability>>;
  request(
    request: ExplicitPageAccessRequest,
  ): Promise<CapabilityResult<CapabilityAvailability>>;
}

export interface LocalScreenshotReceipt {
  readonly captureId: string;
  readonly safeFileName: string;
  readonly mediaType: "image/png";
  readonly width: number;
  readonly height: number;
}

export interface ScreenshotCapture {
  captureVisibleArea(
    target: BrowserTarget,
  ): Promise<CapabilityResult<LocalScreenshotReceipt>>;
}

export interface HorizontalOverflowEvidence {
  readonly viewportWidth: number;
  readonly documentWidth: number;
  readonly overflowPixels: number;
  readonly markerRemoved: boolean;
}

export interface PageInspector {
  inspectHorizontalOverflow(
    target: BrowserTarget,
  ): Promise<CapabilityResult<HorizontalOverflowEvidence>>;
  clear(target: BrowserTarget): Promise<CapabilityResult<void>>;
}
