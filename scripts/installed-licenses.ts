import { spawnSync } from "node:child_process";

export interface LicensePackage {
  name: string;
  versions: string[];
  paths: string[];
  license: string;
  homepage?: string;
}

/** `pnpm licenses list --json`: installed packages grouped by their declared license. */
export type LicenseReport = Record<string, LicensePackage[]>;

/** Reads the license report of the installed dependency tree; run this through pnpm. */
export function readInstalledLicenses(options: { production?: boolean } = {}): LicenseReport {
  const pnpmCli = process.env.npm_execpath;

  if (pnpmCli === undefined) {
    throw new Error("npm_execpath is unavailable; run this script through pnpm.");
  }

  const listArguments = ["licenses", "list", "--json", ...(options.production === true ? ["--prod"] : [])];
  const isJavaScriptCli = /\.(?:c|m)?js$/i.test(pnpmCli);
  const command = isJavaScriptCli ? process.execPath : pnpmCli;
  const arguments_ = isJavaScriptCli ? [pnpmCli, ...listArguments] : listArguments;

  const result = spawnSync(command, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`Unable to read the installed dependency licenses (status ${String(result.status)}): ${result.stderr}`);
  }

  return JSON.parse(result.stdout) as LicenseReport;
}
