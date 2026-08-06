import { createViewportDimensions } from "../browser-capabilities/viewport";
import { createChromiumViewportActionClient } from "./chromium/viewport-action-client";
import "./popup.css";
import { formatViewportActionStatus } from "./popup-status";

const form = requireElement("viewport-form", HTMLFormElement);
const widthInput = requireElement("viewport-width", HTMLInputElement);
const heightInput = requireElement("viewport-height", HTMLInputElement);
const resetButton = requireElement("viewport-reset", HTMLButtonElement);
const status = requireElement("viewport-status", HTMLParagraphElement);
const client = createChromiumViewportActionClient();
let pending = false;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pending) {
    return;
  }

  const viewport = createViewportDimensions({
    width: widthInput.valueAsNumber,
    height: heightInput.valueAsNumber,
  });
  if (!viewport.ok) {
    updateStatus(
      "error",
      "Enter whole-number dimensions from 320–7680 wide and 240–4320 high.",
    );
    return;
  }

  void runAction(() => client.apply(viewport.value));
});

resetButton.addEventListener("click", () => {
  if (!pending) {
    void runAction(() => client.reset());
  }
});

async function runAction(
  action: () => ReturnType<typeof client.apply>,
): Promise<void> {
  pending = true;
  form.setAttribute("aria-busy", "true");
  updateStatus("working", "Working with the active tab…");

  try {
    const result = await action();
    const nextStatus = formatViewportActionStatus(result);
    updateStatus(nextStatus.state, nextStatus.message);
  } catch {
    updateStatus(
      "error",
      "Chrome could not complete viewport control. Try again or reload the extension.",
    );
  } finally {
    pending = false;
    form.removeAttribute("aria-busy");
  }
}

function updateStatus(
  state: "idle" | "working" | "success" | "error",
  message: string,
): void {
  status.dataset.state = state;
  status.textContent = message;
}

function requireElement<T extends Element>(
  id: string,
  constructor: { new (): T },
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Required popup element is missing: ${id}`);
  }
  return element;
}
