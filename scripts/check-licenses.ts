import { spawnSync } from "node:child_process";

interface LicensePackage {
  name: string;
  versions: string[];
}

type LicenseReport = Record<string, LicensePackage[]>;

const allowedLicenses = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MIT and ISC",
  "(BSD-2-Clause OR MIT OR Apache-2.0)",
  "(MIT OR WTFPL)",
]);

const reviewedExceptions = new Map<string, Set<string>>([
  [
    "BlueOak-1.0.0",
    new Set([
      "jackspeak@3.4.3",
      "minimatch@10.2.6",
      "minipass@7.1.3",
      "package-json-from-dist@1.0.1",
      "path-scurry@1.11.1",
    ]),
  ],
  ["CC-BY-4.0", new Set(["caniuse-lite@1.0.30001814"])],
  ["0BSD", new Set(["tslib@1.14.1", "tslib@2.8.1"])],
  ["EPL-2.0", new Set(["elkjs@0.11.1"])],
  ["Unlicense", new Set(["postgres@3.4.7", "robust-predicates@3.0.3"])],
]);

const pnpmCli = process.env.npm_execpath;

if (pnpmCli === undefined) {
  throw new Error("npm_execpath is unavailable; run this check through pnpm.");
}

const isJavaScriptCli = /\.(?:c|m)?js$/i.test(pnpmCli);
const command = isJavaScriptCli ? process.execPath : pnpmCli;
const arguments_ = isJavaScriptCli
  ? [pnpmCli, "licenses", "list", "--json"]
  : ["licenses", "list", "--json"];

const result = spawnSync(command, arguments_, {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(
    `Unable to read the installed dependency licenses (status ${String(result.status)}): ${result.stderr}\n`,
  );
  process.exitCode = 1;
} else {
  const report = JSON.parse(result.stdout) as LicenseReport;
  const blocked: string[] = [];

  for (const [license, packages] of Object.entries(report)) {
    if (allowedLicenses.has(license)) {
      continue;
    }

    const exceptions = reviewedExceptions.get(license) ?? new Set<string>();

    for (const dependency of packages) {
      for (const version of dependency.versions) {
        const packageVersion = `${dependency.name}@${version}`;

        if (!exceptions.has(packageVersion)) {
          blocked.push(`${packageVersion} (${license})`);
        }
      }
    }
  }

  if (blocked.length > 0) {
    process.stderr.write(`Blocked dependency licenses:\n${blocked.sort().join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Dependency licenses match the allowlist and reviewed exceptions.\n");
  }
}
