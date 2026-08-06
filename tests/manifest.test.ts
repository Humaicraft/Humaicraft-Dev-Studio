import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), "utf8"));
}

describe("production extension manifest", () => {
  it("declares only the approved foundation entry point", () => {
    expect(readJson("public/manifest.json")).toEqual({
      manifest_version: 3,
      name: "Humaicraft Dev Studio",
      version: "0.0.0",
      description:
        "Local-first browser tooling for evidence-based frontend development.",
      permissions: ["debugger", "storage"],
      background: {
        service_worker: "assets/background.js",
        type: "module",
      },
      action: {
        default_title: "Humaicraft Dev Studio",
        default_popup: "popup.html",
      },
      content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'self'",
      },
    });
  });

  it("keeps package and manifest versions aligned", () => {
    expect(readJson("package.json")).toMatchObject({
      version: "0.0.0",
    });
  });
});
