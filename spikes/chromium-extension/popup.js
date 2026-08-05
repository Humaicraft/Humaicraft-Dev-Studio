const status = document.querySelector('#status');
const form = document.querySelector('#viewport-form');
const resetButton = document.querySelector('#reset');
const captureButton = document.querySelector('#capture');
const inspectButton = document.querySelector('#inspect');

function setBusy(isBusy) {
  for (const element of document.querySelectorAll('button, input')) {
    element.disabled = isBusy;
  }
}

function setStatus(message) {
  status.textContent = message;
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
      throw new Error(response?.error?.message ?? 'Unknown extension error.');
    }
    return response.data;
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const width = Number(form.elements.width.value);
  const height = Number(form.elements.height.value);
  try {
    const result = await send('viewport.apply', { width, height });
    setStatus(`Viewport applied: ${result.width} × ${result.height}.\nUse Reset viewport when finished.`);
  } catch (error) {
    setStatus(`Viewport failed: ${error.message}`);
  }
});

resetButton.addEventListener('click', async () => {
  try {
    await send('viewport.reset');
    setStatus('Viewport override cleared and debugger detached.');
  } catch (error) {
    setStatus(`Reset failed: ${error.message}`);
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
    setStatus(`Capture failed: ${error.message}`);
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
      'A temporary marker should remove itself automatically.'
    ].join('\n'));
  } catch (error) {
    setStatus(`Inspection failed: ${error.message}`);
  }
});
