import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readInstalledLicenses, type LicensePackage } from "./installed-licenses.js";

/**
 * Writes the third-party notices and a CycloneDX SBOM into `dist/` for release artifacts, which
 * must carry the attribution that third-party licenses require. The image build runs it after
 * pruning to production dependencies, so both files cover exactly the packages the image ships.
 */

const outputDirectory = "dist";

/** Declared licenses that are not valid SPDX expressions, keyed by package name. */
const licenseCorrections = new Map<string, string>([
  // pnpm has no license metadata for JSR packages and misreads the shipped GPL-3.0 text as "lgpl".
  // The text has no "only" or "or later" statement, so the SBOM names the license, not an SPDX id.
  ["@jsr/meshtastic__protobufs", "GPL-3.0 (license text shipped by the package)"],
]);

const spdxCorrections = new Map<string, string>([["MIT and ISC", "MIT AND ISC"]]);

interface Component {
  name: string;
  version: string;
  license: string;
  /** False when the license is only a name because no exact SPDX identifier applies. */
  spdx: boolean;
  homepage: string | undefined;
  path: string;
}

function componentsOf(packages: LicensePackage[]): Component[] {
  return packages.flatMap((item) =>
    item.versions.map((version, index) => ({
      name: item.name,
      version,
      license: licenseCorrections.get(item.name) ?? spdxCorrections.get(item.license) ?? item.license,
      spdx: !licenseCorrections.has(item.name),
      homepage: item.homepage,
      path: item.paths[index] ?? item.paths[0] ?? "",
    })),
  );
}

/** LICENSE, COPYING and NOTICE files at the package root, which carry the required attribution. */
function licenseTexts(packagePath: string): string[] {
  const files = readdirSync(packagePath)
    .filter((file) => /^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(file))
    .sort();
  return files.map((file) => readFileSync(join(packagePath, file), "utf8").trim());
}

function notices(components: Component[]): string {
  const sections = components.map((component) => {
    const texts = licenseTexts(component.path);
    const body = texts.length > 0 ? texts.join("\n\n") : `The package ships no license file; it declares ${component.license}.`;
    return `${component.name}@${component.version}\nLicense: ${component.license}\n${component.homepage ?? ""}\n\n${body}`;
  });
  return [
    "OpenMeshTak Core third-party notices",
    "",
    "OpenMeshTak Core is licensed under AGPL-3.0-only. It includes the following third-party packages,",
    "each under its own license reproduced below.",
    "",
    ...sections.map((section) => `${"=".repeat(78)}\n${section}\n`),
  ].join("\n");
}

function packageUrl(component: Component): string {
  const name = component.name.startsWith("@") ? `%40${component.name.slice(1)}` : component.name;
  return `pkg:npm/${name}@${component.version}`;
}

function sbom(components: Component[], version: string): object {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        type: "application",
        name: "openmeshtak",
        version,
        licenses: [{ license: { id: "AGPL-3.0-only" } }],
        purl: `pkg:github/OpenMeshTAK/openmeshtak@${version}`,
      },
    },
    components: components.map((component) => ({
      type: "library",
      name: component.name,
      version: component.version,
      purl: packageUrl(component),
      licenses: [component.spdx ? { expression: component.license } : { license: { name: component.license } }],
    })),
  };
}

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const components = Object.values(readInstalledLicenses({ production: true }))
  .flatMap(componentsOf)
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, "THIRD_PARTY_NOTICES.txt"), notices(components));
writeFileSync(join(outputDirectory, "sbom.cdx.json"), `${JSON.stringify(sbom(components, version), null, 2)}\n`);
process.stdout.write(`Wrote notices and SBOM for ${String(components.length)} packages to ${outputDirectory}/.\n`);
