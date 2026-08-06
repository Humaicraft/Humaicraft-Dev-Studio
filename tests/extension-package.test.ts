import { describe, expect, it } from "vitest";
import {
  validateManifestReferences,
  validateRelativePath,
  validateVersion,
} from "../scripts/extension-package.ts";

describe("extension package validation", () => {
  it("accepts only reviewed production paths", () => {
    for (const path of [
      "manifest.json",
      "assets/background.js",
      "assets/runtime-abc123.js",
    ]) {
      expect(() => validateRelativePath(path)).not.toThrow();
    }
  });

  it("rejects traversal, secrets, source maps, and unexpected roots", () => {
    for (const path of [
      "../secret.txt",
      ".env",
      "assets/.env.local",
      "assets/.ENV.production",
      "assets/.DS_Store",
      "assets/.git/config",
      "assets/node_modules/package.js",
      "assets/background.js.map",
      "assets/private.pem",
      "assets/PRIVATE.PEM",
      "assets/nested.zip",
      "assets/NESTED.ZIP",
      "src/background.js",
      "README.md",
    ]) {
      expect(() => validateRelativePath(path)).toThrow();
    }
  });

  it("requires package and manifest versions to match Chrome format", () => {
    expect(() => validateVersion("0.0.0", "0.0.0")).not.toThrow();
    expect(() => validateVersion("0.0.0", "0.0.1")).toThrow(
      /Version mismatch/,
    );
    expect(() => validateVersion("1.0.0-beta.1", "1.0.0-beta.1")).toThrow(
      /invalid/,
    );
  });

  it("requires the manifest service worker to exist", () => {
    const manifest = {
      background: { service_worker: "assets/background.js" },
    };
    expect(() =>
      validateManifestReferences(manifest, [
        "manifest.json",
        "assets/background.js",
      ]),
    ).not.toThrow();
    expect(() =>
      validateManifestReferences(manifest, ["manifest.json"]),
    ).toThrow(/missing package file/);
  });
});
