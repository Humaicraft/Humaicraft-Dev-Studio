import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = join(repositoryRoot, "dist");
const releaseDirectory = join(repositoryRoot, "release");
const normalizedTimestamp = new Date("2000-01-01T00:00:00.000Z");
const allowedTopLevelFiles = new Set(["manifest.json"]);
const allowedDirectories = new Set(["assets"]);
const forbiddenNames = new Set([
  ".env",
  ".git",
  ".DS_Store",
  "node_modules",
]);
const forbiddenExtensions = [".crx", ".key", ".map", ".pem", ".zip"];

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readRequiredString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected a non-empty string at ${key}.`);
  }
  return value;
}

export function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolutePath));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    } else {
      throw new Error(`Unsupported package entry: ${absolutePath}`);
    }
  }
  return files;
}

export function validateRelativePath(filePath: string): void {
  if (
    filePath.length === 0 ||
    filePath.startsWith("/") ||
    filePath.includes("..")
  ) {
    throw new Error(`Unsafe package path: ${filePath}`);
  }

  const parts = filePath.split("/");
  if (parts.some((part) => forbiddenNames.has(part))) {
    throw new Error(`Forbidden package path: ${filePath}`);
  }
  if (forbiddenExtensions.some((extension) => filePath.endsWith(extension))) {
    throw new Error(`Forbidden package file: ${filePath}`);
  }

  const topLevel = parts[0];
  if (topLevel === undefined) {
    throw new Error(`Unsafe package path: ${filePath}`);
  }
  if (parts.length === 1 && !allowedTopLevelFiles.has(topLevel)) {
    throw new Error(`Unexpected top-level package file: ${filePath}`);
  }
  if (parts.length > 1 && !allowedDirectories.has(topLevel)) {
    throw new Error(`Unexpected package directory: ${filePath}`);
  }
}

export function validateVersion(
  packageVersion: string,
  manifestVersion: string,
): void {
  if (packageVersion !== manifestVersion) {
    throw new Error(
      `Version mismatch: package.json=${packageVersion}, manifest.json=${manifestVersion}`,
    );
  }
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifestVersion)) {
    throw new Error(`Chrome manifest version is invalid: ${manifestVersion}`);
  }
}

export function validateManifestReferences(
  manifest: unknown,
  files: readonly string[],
): void {
  if (!isJsonRecord(manifest)) {
    throw new Error("Built manifest must be a JSON object.");
  }
  const background = manifest.background;
  if (!isJsonRecord(background)) {
    throw new Error("Built manifest must define a background entry point.");
  }
  const serviceWorker = readRequiredString(background, "service_worker");
  if (!files.includes(serviceWorker)) {
    throw new Error(
      `Manifest references missing package file: ${serviceWorker}`,
    );
  }
}

function packageVersion(packageJson: unknown): string {
  if (!isJsonRecord(packageJson)) {
    throw new Error("package.json must be a JSON object.");
  }
  return readRequiredString(packageJson, "version");
}

function manifestVersion(manifest: unknown): string {
  if (!isJsonRecord(manifest)) {
    throw new Error("manifest.json must be a JSON object.");
  }
  return readRequiredString(manifest, "version");
}

function packageFiles(): string[] {
  if (!existsSync(distDirectory) || !statSync(distDirectory).isDirectory()) {
    throw new Error("dist/ does not exist. Run the production build first.");
  }

  const absoluteFiles = listFiles(distDirectory);
  const relativeFiles = absoluteFiles
    .map((path) => relative(distDirectory, path).split(sep).join("/"))
    .sort();
  if (relativeFiles.length === 0) {
    throw new Error("dist/ is empty.");
  }
  for (const file of relativeFiles) {
    validateRelativePath(file);
  }
  return relativeFiles;
}

export function verifyBuiltExtension(): string[] {
  const packageJson = readJson(join(repositoryRoot, "package.json"));
  const sourceManifestPath = join(repositoryRoot, "public", "manifest.json");
  const builtManifestPath = join(distDirectory, "manifest.json");
  const sourceManifestContent = readFileSync(sourceManifestPath, "utf8");
  const builtManifestContent = readFileSync(builtManifestPath, "utf8");
  if (sourceManifestContent !== builtManifestContent) {
    throw new Error("Built manifest does not match the reviewed source manifest.");
  }
  const sourceManifest: unknown = JSON.parse(sourceManifestContent);
  const builtManifest: unknown = JSON.parse(builtManifestContent);
  const version = packageVersion(packageJson);

  validateVersion(version, manifestVersion(sourceManifest));
  validateVersion(version, manifestVersion(builtManifest));

  const files = packageFiles();
  validateManifestReferences(builtManifest, files);
  return files;
}

function normalizeFiles(files: readonly string[]): void {
  for (const file of files) {
    const absolutePath = join(distDirectory, file);
    chmodSync(absolutePath, 0o644);
    utimesSync(absolutePath, normalizedTimestamp, normalizedTimestamp);
  }
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function buildExtensionPackage(): string {
  const files = verifyBuiltExtension();
  normalizeFiles(files);

  const version = packageVersion(readJson(join(repositoryRoot, "package.json")));
  const baseName = `humaicraft-dev-studio-${version}`;
  const zipPath = join(releaseDirectory, `${baseName}.zip`);
  const checksumPath = `${zipPath}.sha256`;
  const fileListPath = join(releaseDirectory, `${baseName}.files.txt`);

  mkdirSync(releaseDirectory, { recursive: true });
  rmSync(zipPath, { force: true });
  rmSync(checksumPath, { force: true });
  rmSync(fileListPath, { force: true });
  writeFileSync(fileListPath, `${files.join("\n")}\n`, "utf8");

  execFileSync("zip", ["-X", "-q", zipPath, ...files], {
    cwd: distDirectory,
    env: { ...process.env, TZ: "UTC" },
    stdio: "inherit",
  });

  const digest = sha256(zipPath);
  writeFileSync(checksumPath, `${digest}  ${basename(zipPath)}\n`, "utf8");
  return digest;
}

function main(): void {
  const command = process.argv[2];
  if (command === "verify") {
    const files = verifyBuiltExtension();
    console.log(`Verified ${files.length} extension files.`);
    return;
  }
  if (command === "package") {
    const digest = buildExtensionPackage();
    console.log(`Created release package with SHA-256 ${digest}.`);
    return;
  }
  throw new Error("Usage: node scripts/extension-package.ts <verify|package>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
