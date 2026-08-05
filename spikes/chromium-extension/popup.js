const status = document.querySelector('#status');
const form = document.querySelector('#viewport-form');
const resetButton = document.querySelector('#reset');
const debuggerStatusButton = document.querySelector('#debugger-status');
const recoveryStatusButton = document.querySelector('#recovery-status');
const captureButton = document.querySelector('#capture');
const inspectButton = document.querySelector('#inspect');

class ExtensionResponseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExtensionResponseError';
    this.code = code;
  }
}

function setBusy(isBusy) {
  for (const element of document.querySelectorAll('button, input')) {
    element.disabled = isBusy;
  }
}

function setStatus(message) {
  status.textContent = message;
}

function userFacingError(error) {
  if (error instanceof ExtensionResponseError && error.code === 'UNSUPPORTED_MESSAGE') {
    return 'The popup and background worker are different versions. Reload the unpacked extension, then reopen this popup.';
  }

  return error instanceof Error ? error.message : String(error);
}

async function getActiveHttpOriginPattern() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    throw new Error('No active browser tab is available.');
  }

  const url = new URL(tab.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Use a normal HTTP or HTTPS page for this spike.');
  }

  return `${url.origin}/*`;
}

async function ensureCurrentOriginAccess() {
  const origin = await getActiveHttpOriginPattern();
  const hasAccess = await chrome.permissions.contains({ origins: [origin] });
  if (hasAccess) {
    return;
  }

  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) {
    throw new Error('Access to the current site was not granted.');
  }
}

async function send(type, payload = {}) {
  setBusy(true);
  setStatus('Running…');
  try {
    const response = await chrome.runtime.sendMessage({ version: 1, type, payload });
    if (!response?.ok) {
      throw new ExtensionResponseError(
        response?.error?.code ?? 'UNKNOWN_EXTENSION_ERROR',
        response?.error?.message ?? 'Unknown extension error.'
      );
    }
    return response.data;
  } finally {
    setBusy(false);
  }
}

function debuggerOwnershipMessage(result) {
  const type = result.targetType ? ` (${result.targetType})` : '';

  if (result.ownedByCurrentWorker) {
    return `This extension worker owns a debugger session for the active tab${type}.`;
  }

  if (result.anyClientAttached) {
    return `A debugger client is attached to the active tab${type}, but ownership cannot be attributed to this extension worker.`;
  }

  return 'No debugger client is attached to the active tab.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const width = Number(form.elements.width.value);
  const height = Number(form.elements.height.value);
  try {
    const result = await send('viewport.apply', { width, height });
    setStatus(`Viewport applied: ${result.width} × ${result.height}.\nUse Reset viewport when finished.`);
  } catch (error) {
    setStatus(`Viewport failed: ${userFacingError(error)}`);
  }
});

resetButton.addEventListener('click', async () => {
  try {
    await send('viewport.reset');
    setStatus('Viewport override cleared and this worker released its debugger session.');
  } catch (error) {
    setStatus(`Reset failed: ${userFacingError(error)}`);
  }
});

debuggerStatusButton.addEventListener('click', async () => {
  try {
    const result = await send('debugger.status');
    setStatus(debuggerOwnershipMessage(result));
  } catch (error) {
    setStatus(`Debugger status failed: ${userFacingError(error)}`);
  }
});

recoveryStatusButton.addEventListener('click', async () => {
  try {
    const result = await send('recovery.status');
    const lines = [debuggerOwnershipMessage(result)];

    if (result.sessionMatchesActiveTab && result.session) {
      lines.push(`Stored viewport session: ${result.session.width} × ${result.session.height}.`);
    } else if (result.session) {
      lines.push('A stored viewport session exists for another tab.');
    } else {
      lines.push('No stored viewport session is available in this extension session.');
    }

    if (result.lastDetach) {
      lines.push(`Last debugger detach reason: ${result.lastDetach.reason}.`);
    } else {
      lines.push('No debugger detach event has been recorded in this extension session.');
    }

    setStatus(lines.join('\n'));
  } catch (error) {
    setStatus(`Recovery status failed: ${userFacingError(error)}`);
  }
});

captureButton.addEventListener('click', async () => {
  try {
    await ensureCurrentOriginAccess();
    const result = await send('screenshot.captureVisible');
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = result.fileName;
    link.click();
    setStatus(`Visible-area screenshot prepared: ${result.fileName}`);
  } catch (error) {
    setStatus(`Capture failed: ${userFacingError(error)}`);
  }
});

inspectButton.addEventListener('click', async () => {
  try {
    await ensureCurrentOriginAccess();
    const result = await send('page.inspectWidth');
    setStatus([
      `Viewport width: ${result.clientWidth}px`,
      `Page scroll width: ${result.scrollWidth}px`,
      `Horizontal overflow: ${result.hasHorizontalOverflow ? 'detected' : 'not detected'}`,
      `Temporary marker cleanup: ${result.markerRemoved ? 'confirmed' : 'failed'}`
    ].join('\n'));
  } catch (error) {
    setStatus(`Inspection failed: ${userFacingError(error)}`);
  }
});
