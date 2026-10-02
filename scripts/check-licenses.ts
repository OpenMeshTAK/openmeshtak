import { readInstalledLicenses } from "./installed-licenses.js";

const allowedLicenses = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MIT and ISC",
  "(BSD-2-Clause OR MIT OR Apache-2.0)",
  "(MIT OR WTFPL)",
  // node-forge: OpenMeshTak relies on the BSD-3-Clause option (TAK truststore PKCS#12 files).
  "(BSD-3-Clause OR GPL-2.0)",
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
  // MIT without the attribution clause; more permissive than MIT. Approved by the owner on 2026-10-06.
  ["MIT-0", new Set(["nodemailer@10.0.15"])],
  ["EPL-2.0", new Set(["elkjs@0.11.1"])],
  ["Unlicense", new Set(["postgres@3.4.7", "robust-predicates@3.0.3"])],
  // Both terms are individually allowlisted; the package requires both together.
  ["(Apache-2.0 AND BSD-3-Clause)", new Set(["@bufbuild/protobuf@2.16.0"])],
  // Official Meshtastic protobufs from JSR. The package ships the GPL-3.0 text; pnpm has no
  // license metadata for JSR packages and misreads that file as "lgpl".
  ["lgpl", new Set(["@jsr/meshtastic__protobufs@2.8.1"])],
]);

const report = readInstalledLicenses();
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
