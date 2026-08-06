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

export interface DebuggerSessionEvidence {
  readonly schemaVersion: 1;
  readonly target: BrowserTarget;
  readonly ownership: DebuggerOwnership;
  readonly viewport?: ViewportDimensions;
  readonly recordedAtEpochMs: number;
}

export interface DebuggerSessionRepository {
  read(
    target: BrowserTarget,
  ): Promise<CapabilityResult<DebuggerSessionEvidence | null>>;
  reconcile(
    target: BrowserTarget,
  ): Promise<CapabilityResult<DebuggerSessionEvidence>>;
  writeOwned(
    evidence: DebuggerSessionEvidence & { readonly ownership: "owned" },
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
