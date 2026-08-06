import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const popupMarkup = readFileSync(resolve(repositoryRoot, "popup.html"), "utf8");
const popupStyles = readFileSync(
  resolve(repositoryRoot, "src/browser-extension/popup.css"),
  "utf8",
);

describe("viewport popup accessibility foundation", () => {
  it("uses native labeled controls and a semantic live status", () => {
    expect(popupMarkup).toContain("<main>");
    expect(popupMarkup).toContain("<h1>Viewport</h1>");
    expect(popupMarkup).toContain('for="viewport-width"');
    expect(popupMarkup).toContain('for="viewport-height"');
    expect(popupMarkup).toContain('<button type="submit">');
    expect(popupMarkup).toContain('role="status"');
    expect(popupMarkup).toContain('aria-live="polite"');
    expect(popupMarkup).toContain('aria-atomic="true"');
  });

  it("keeps behavior in external modules with visible focus and reduced motion", () => {
    expect(popupMarkup).not.toMatch(/\son[a-z]+\s*=/i);
    expect(popupMarkup).toContain(
      '<script type="module" src="/src/browser-extension/popup.ts"></script>',
    );
    expect(popupStyles).toContain(":focus-visible");
    expect(popupStyles).toContain("prefers-reduced-motion: reduce");
  });
});
