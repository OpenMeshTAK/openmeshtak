import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Generates the Prisma client, the OpenAPI document and the tsoa routes. `pnpm check` reaches this
 * once per step, so a run whose inputs and generated files are byte-identical to the last
 * generation is skipped: both generators are deterministic and would write the same files again.
 * The record lives in node_modules, so a clean install always generates; `--force` regenerates.
 */
const recordFile = "node_modules/.cache/openmeshtak/generate.json";
// tsoa reads the controllers and every type they reach, package.json and the TypeScript settings;
// the lockfile pins both generators.
const inputs = ["package.json", "pnpm-lock.yaml", "tsconfig.json", "tsoa.json", "prisma7.config.ts", "prisma", "src", "scripts/generate.ts"];
const outputs = ["openapi/openapi.json", "src/generated"];

const require = createRequire(import.meta.url);

function listFiles(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }
  if (!statSync(path).isDirectory()) {
    return [path];
  }
  return readdirSync(path, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function fingerprint(paths: string[], skip: (file: string) => boolean = () => false): string {
  const hash = createHash("sha256");
  const files = paths.flatMap(listFiles).map((file) => file.replaceAll("\\", "/")).filter((file) => !skip(file)).sort();
  for (const file of files) {
    hash.update(file).update("\0").update(readFileSync(file)).update("\0");
  }
  return hash.digest("hex");
}

function readRecord(): { inputs?: unknown; outputs?: unknown } | undefined {
  try {
    return JSON.parse(readFileSync(recordFile, "utf8")) as { inputs?: unknown; outputs?: unknown };
  } catch {
    return undefined;
  }
}

function runCli(packageName: string, cli: string, args: string[]): void {
  const entry = join(dirname(require.resolve(`${packageName}/package.json`)), cli);
  const result = spawnSync(process.execPath, [entry, ...args], { stdio: "inherit" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${packageName} ${args.join(" ")} exited with status ${String(result.status)}.`);
  }
}

const inputHash = fingerprint(inputs, (file) => file.startsWith("src/generated/"));
const record = readRecord();

if (!process.argv.includes("--force") && record?.inputs === inputHash && record.outputs === fingerprint(outputs)) {
  process.stdout.write("Prisma client, OpenAPI document and routes are current.\n");
} else {
  rmSync(recordFile, { force: true });
  runCli("prisma", "build/index.js", ["generate", "--no-hints"]);
  runCli("tsoa", "dist/cli.js", ["spec-and-routes"]);
  mkdirSync(dirname(recordFile), { recursive: true });
  writeFileSync(recordFile, `${JSON.stringify({ inputs: inputHash, outputs: fingerprint(outputs) })}\n`);
}
