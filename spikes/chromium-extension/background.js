const DEBUGGER_VERSION = '1.3';
const MIN_WIDTH = 320;
const MAX_WIDTH = 7680;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 4320;
const ownedDebuggerTabs = new Set();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({
      ok: false,
      error: {
        code: error.code ?? 'UNEXPECTED_ERROR',
        message: error.message ?? 'Unexpected extension error.'
      }
    }));
  return true;
});

async function handleMessage(message) {
  validateEnvelope(message);
  const tab = await getActiveTab();

  switch (message.type) {
    case 'viewport.apply':
      return applyViewport(tab.id, message.payload);
    case 'viewport.reset':
      return resetViewport(tab.id);
    case 'debugger.status':
      return getDebuggerStatus(tab.id);
    case 'screenshot.captureVisible':
      return captureVisible(tab.windowId);
    case 'page.inspectWidth':
      return inspectPageWidth(tab.id);
    default:
      throw createError('UNSUPPORTED_MESSAGE', 'Unsupported spike action.');
  }
}

function validateEnvelope(message) {
  if (!message || message.version !== 1 || typeof message.type !== 'string') {
    throw createError('INVALID_MESSAGE', 'Invalid or unsupported message format.');
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !Number.isInteger(tab.windowId)) {
    throw createError('ACTIVE_TAB_UNAVAILABLE', 'No active browser tab is available.');
  }
  if (!/^https?:/u.test(tab.url ?? '')) {
    throw createError('UNSUPPORTED_PAGE', 'Use a normal HTTP or HTTPS page for this spike.');
  }
  return tab;
}

async function applyViewport(tabId, payload) {
  const width = validateDimension(payload?.width, MIN_WIDTH, MAX_WIDTH, 'width');
  const height = validateDimension(payload?.height, MIN_HEIGHT, MAX_HEIGHT, 'height');
  await attachDebugger(tabId);
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: width,
      screenHeight: height,
      positionX: 0,
      positionY: 0,
      dontSetVisibleSize: false
    });
    return { width, height };
  } catch (error) {
    await detachDebuggerSafely(tabId);
    throw normalizeChromeError(error, 'VIEWPORT_APPLY_FAILED');
  }
}

async function resetViewport(tabId) {
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride');
  } catch (error) {
    throw normalizeChromeError(error, 'VIEWPORT_RESET_FAILED');
  } finally {
    await detachDebuggerSafely(tabId);
  }
  return { reset: true };
}

async function getDebuggerStatus(tabId) {
  try {
    const targets = await chrome.debugger.getTargets();
    const target = targets.find((candidate) => candidate.tabId === tabId);
    return {
      anyClientAttached: target?.attached === true,
      ownedByCurrentWorker: ownedDebuggerTabs.has(tabId),
      targetType: target?.type ?? null
    };
  } catch (error) {
    throw normalizeChromeError(error, 'DEBUGGER_STATUS_FAILED');
  }
}

async function captureVisible(windowId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    return {
      dataUrl,
      fileName: `humaicraft-dev-studio-visible-${Date.now()}.png`
    };
  } catch (error) {
    throw normalizeChromeError(error, 'SCREENSHOT_FAILED');
  }
}

async function inspectPageWidth(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: async () => {
        const markerId = 'humaicraft-dev-studio-spike-marker';
        document.getElementById(markerId)?.remove();

        const marker = document.createElement('div');
        marker.id = markerId;
        marker.textContent = 'Humaicraft Dev Studio spike marker';
        Object.assign(marker.style, {
          position: 'fixed',
          inset: '8px auto auto 8px',
          zIndex: '2147483647',
          padding: '8px',
          color: '#000',
          background: '#fff',
          border: '3px solid #000',
          font: '14px/1.4 system-ui, sans-serif',
          pointerEvents: 'none'
        });
        document.documentElement.append(marker);

        const root = document.documentElement;
        const result = {
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          hasHorizontalOverflow: root.scrollWidth > root.clientWidth + 1
        };

        await new Promise((resolve) => globalThis.setTimeout(resolve, 1500));
        marker.remove();

        return {
          ...result,
          markerRemoved: document.getElementById(markerId) === null
        };
      }
    });
    return result;
  } catch (error) {
    throw normalizeChromeError(error, 'PAGE_INSPECTION_FAILED');
  }
}

function validateDimension(value, minimum, maximum, name) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw createError('INVALID_DIMENSION', `${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

async function attachDebugger(tabId) {
  try {
    await chrome.debugger.attach({ tabId }, DEBUGGER_VERSION);
    ownedDebuggerTabs.add(tabId);
  } catch (error) {
    throw normalizeChromeError(error, 'DEBUGGER_ATTACH_FAILED');
  }
}

async function detachDebuggerSafely(tabId) {
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // Cleanup is best-effort because the tab may have closed or detached already.
  } finally {
    ownedDebuggerTabs.delete(tabId);
  }
}

function normalizeChromeError(error, code) {
  const message = error instanceof Error ? error.message : String(error);
  return createError(code, message || 'Chromium operation failed.');
}

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
