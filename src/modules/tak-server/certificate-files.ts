import { X509Certificate } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { TakServerCertificate } from "../../generated/prisma/client.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { ProblemError, validationProblem } from "../../shared/errors/problem-error.js";
import { logger } from "../../shared/logging/logger.js";
import { activeServerCertificate, addServerCertificate } from "./server-certificate.js";
import { loadTakServerSettings, SETTINGS_ID } from "./tak-server-settings.js";

/**
 * Reuses the certificate files of the reverse proxy, e.g. certbot's `fullchain.pem` and
 * `privkey.pem` or Caddy's `.crt` and `.key`. The operator mounts the proxy's certificate directory
 * read-only at TAK_CERTIFICATE_DIRECTORY; Core reads only below it, so a settings change can never
 * point it at another file in the container.
 */

export interface CertificateFiles {
  certificateFile: string;
  keyFile: string;
}

interface FileOptions {
  directory?: string;
  /** Test seam, passed through to the public-chain check. */
  trustedRoots?: readonly string[];
}

type FileField = "certificateFile" | "keyFile";

const CERTIFICATE_FILE_PATTERN = /.(?:pem|crt|cer|key)$/i;
const MAX_SUGGESTIONS = 10;

function fileProblem(field: FileField, message: string): ProblemError {
  return validationProblem([{ field, code: "INVALID_CERTIFICATE_FILE", message }]);
}

function isBelow(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

/**
 * Lists what is in the closest existing directory of a path that was not found, so a typo in a
 * host name or file name is easy to spot. Only names of certificate-like files and subdirectories
 * below the mount are shown, never contents, and only to administrators saving these settings.
 */
async function nearbyEntries(root: string, missing: string): Promise<string[]> {
  let directory = path.dirname(missing);
  while (isBelow(root, directory)) {
    try {
      const real = await realpath(directory);
      if (!isBelow(root, real)) {
        return [];
      }
      const entries = await readdir(real, { withFileTypes: true });
      const relativeDirectory = path.relative(root, directory);
      return entries
        .filter((entry) => entry.isDirectory() || CERTIFICATE_FILE_PATTERN.test(entry.name))
        .map((entry) => path.posix.join(relativeDirectory.split(path.sep).join("/"), entry.name) + (entry.isDirectory() ? "/" : ""))
        .sort()
        .slice(0, MAX_SUGGESTIONS);
    } catch {
      directory = path.dirname(directory);
    }
  }
  return [];
}

/** Resolves a relative path below the mounted directory, following symlinks such as certbot's `live/` links. */
async function resolveBelow(directory: string, relative: string, field: FileField): Promise<string> {
  const trimmed = relative.trim();
  if (trimmed === "" || trimmed.includes("\0") || path.isAbsolute(trimmed)) {
    throw fileProblem(field, `Enter a path relative to ${directory}.`);
  }
  let root: string;
  try {
    root = await realpath(directory);
  } catch {
    throw fileProblem(field, `${directory} was not found. Check that the proxy's certificate directory is mounted there.`);
  }
  let file: string;
  try {
    file = await realpath(path.resolve(root, trimmed));
  } catch {
    const nearby = await nearbyEntries(root, path.resolve(root, trimmed));
    const hint = nearby.length === 0 ? "" : ` Found there: ${nearby.join(", ")}.`;
    throw fileProblem(field, `The file was not found below ${directory}.${hint}`);
  }
  if (!file.startsWith(root + path.sep)) {
    throw fileProblem(field, `The file must be below ${directory}.`);
  }
  return file;
}

async function readFiles(files: CertificateFiles, directory: string): Promise<{ chainPem: string; keyPem: string }> {
  const [chainPath, keyPath] = await Promise.all([
    resolveBelow(directory, files.certificateFile, "certificateFile"),
    resolveBelow(directory, files.keyFile, "keyFile"),
  ]);
  try {
    const [chainPem, keyPem] = await Promise.all([readFile(chainPath, "utf8"), readFile(keyPath, "utf8")]);
    return { chainPem, keyPem };
  } catch {
    throw fileProblem("certificateFile", "The files could not be read. Check that Core may read them.");
  }
}

/** Point the certificate checks' field names at the file settings the administrator entered. */
function asFileProblem(error: unknown): unknown {
  if (!(error instanceof ProblemError) || error.errors === undefined) {
    return error;
  }
  return validationProblem(
    error.errors.map((problem) => ({ ...problem, field: problem.field === "privateKeyPem" ? "keyFile" : "certificateFile" })),
  );
}

/** Reads the files, activates their certificate and stores the paths for later reloads. */
export async function useCertificateFiles(hostName: string, files: CertificateFiles, options: FileOptions = {}): Promise<TakServerCertificate> {
  const { chainPem, keyPem } = await readFiles(files, options.directory ?? config.takCertificateDirectory);
  let certificate: TakServerCertificate;
  try {
    certificate = await addServerCertificate(chainPem, keyPem, hostName, {
      source: "file",
      ...(options.trustedRoots === undefined ? {} : { trustedRoots: options.trustedRoots }),
    });
  } catch (error: unknown) {
    throw asFileProblem(error);
  }
  await database.takServerSettings.update({
    where: { id: SETTINGS_ID },
    data: { certificateFile: files.certificateFile.trim(), certificateKeyFile: files.keyFile.trim() },
  });
  return certificate;
}

/** Another certificate source was chosen; Core stops reading the proxy's files. */
export async function forgetCertificateFiles(): Promise<void> {
  await database.takServerSettings.updateMany({
    where: { id: SETTINGS_ID, certificateFile: { not: null } },
    data: { certificateFile: null, certificateKeyFile: null },
  });
}

/**
 * Picks up a certificate the proxy renewed. Returns the new certificate, or null when nothing
 * changed. A file that cannot be used keeps the current certificate; the expiry warning reports it
 * if it is never fixed.
 */
export async function reloadCertificateFiles(options: FileOptions = {}): Promise<TakServerCertificate | null> {
  const settings = await loadTakServerSettings();
  if (settings.hostName === null || settings.certificateFile === null || settings.certificateKeyFile === null) {
    return null;
  }
  const files = { certificateFile: settings.certificateFile, keyFile: settings.certificateKeyFile };
  try {
    const { chainPem } = await readFiles(files, options.directory ?? config.takCertificateDirectory);
    const leafPem = chainPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];
    const active = await activeServerCertificate();
    if (leafPem !== undefined && active?.source === "file" && active.certificateChainPem.startsWith(new X509Certificate(leafPem).toString())) {
      return null;
    }
    const renewed = await useCertificateFiles(settings.hostName, files, options);
    logger.info(
      { event: "tak_certificate_files_reloaded", hostName: settings.hostName, notAfter: renewed.notAfter.toISOString() },
      "TAK server certificate reloaded from the proxy's files",
    );
    return renewed;
  } catch (error: unknown) {
    logger.warn({ error, event: "tak_certificate_files_reload_failed", hostName: settings.hostName }, "TAK certificate files could not be reloaded");
    return null;
  }
}
