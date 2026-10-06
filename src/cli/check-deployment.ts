import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "node:tls";
import { strFromU8, unzipSync } from "fflate";
import { buildConnectionPackage } from "../modules/tak-server/connection-package.js";
import { buildDeviceProfile } from "../modules/tak-server/marti/device-profile.js";
import { currentServerCertificate } from "../modules/tak-server/server-certificate.js";
import { loadTakServerSettings } from "../modules/tak-server/tak-server-settings.js";
import { config } from "../shared/config/config.js";
import { disconnectDatabase } from "../shared/database/database.js";

/**
 * Post-start deployment check, run inside the Core container:
 *
 *   docker compose -f deploy/compose.yaml exec core node dist/cli/check-deployment.js
 *
 * It goes through the public names and ports, like a phone would, and proves that each TAK port
 * reaches this Core (not another service such as a hosting panel), that the mutual-TLS ports
 * demand a client certificate, and that generated profiles advertise exactly the configured
 * endpoint. `--connect <address>` sends the TCP connections to another address while keeping the
 * public name for TLS, for hosts that cannot reach their own public address (no NAT hairpin).
 * Nothing secret is printed.
 */

const TIMEOUT_MS = 5000;
let failures = 0;

function report(ok: boolean, message: string): void {
  if (!ok) {
    failures += 1;
  }
  process.stdout.write(`${ok ? "ok  " : "FAIL"} ${message}\n`);
}

function connectAddress(): string | undefined {
  const index = process.argv.indexOf("--connect");
  return index === -1 ? undefined : process.argv[index + 1];
}

async function checkWebOrigin(): Promise<void> {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
  const url = new URL("/api/v1/health", config.publicOrigin);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = (await response.json()) as { version?: string };
    report(response.ok && body.version === version, `${url.origin} answers as OpenMeshTak ${body.version ?? "?"} (expected ${version})`);
  } catch (error: unknown) {
    report(false, `${url.origin} is not reachable: ${(error as Error).message}`);
  }
}

interface TlsProbe {
  presentedCertificate: Buffer | null;
  /** The server ended the connection although the client sent no certificate. */
  rejectedWithoutClientCertificate: boolean;
  error: string | null;
}

/** Connects without a client certificate, as an unenrolled device would. */
function probe(hostName: string, port: number): Promise<TlsProbe> {
  return new Promise((resolve) => {
    const result: TlsProbe = { presentedCertificate: null, rejectedWithoutClientCertificate: false, error: null };
    const socket = connect({ host: connectAddress() ?? hostName, port, servername: hostName, rejectUnauthorized: false });
    let done = false;
    const finish = (): void => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const timer = setTimeout(finish, TIMEOUT_MS);
    socket.once("secureConnect", () => {
      result.presentedCertificate = socket.getPeerCertificate().raw;
      // With TLS 1.3 the server rejects a missing client certificate after the handshake.
      socket.write("\r\n");
    });
    socket.once("data", finish);
    socket.once("error", (error: NodeJS.ErrnoException) => {
      if (done) {
        return;
      }
      if (result.presentedCertificate === null) {
        result.error = error.code ?? error.message;
      } else {
        result.rejectedWithoutClientCertificate = true;
      }
      finish();
    });
    socket.once("close", () => {
      if (!done && result.presentedCertificate !== null) {
        result.rejectedWithoutClientCertificate = true;
      }
      finish();
    });
  });
}

/** The certificate the TAK listeners present: the first one of the active chain. */
async function serverCertificatePem(hostName: string): Promise<string> {
  const { certificateChainPem } = await currentServerCertificate(hostName);
  return /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(certificateChainPem)?.[0] ?? "";
}

async function checkTakPorts(hostName: string, ports: Record<string, { port: number; mutualTls: boolean }>): Promise<void> {
  const expected = new X509Certificate(await serverCertificatePem(hostName)).raw;
  for (const [name, { port, mutualTls }] of Object.entries(ports)) {
    const target = `${name} ${hostName}:${String(port)}`;
    const result = await probe(hostName, port);
    if (result.presentedCertificate === null) {
      report(false, `${target} is not reachable over TLS (${result.error ?? "timeout"})`);
      continue;
    }
    if (!result.presentedCertificate.equals(expected)) {
      report(false, `${target} answers with another certificate; the port reaches a different service`);
      continue;
    }
    if (mutualTls && !result.rejectedWithoutClientCertificate) {
      report(false, `${target} reaches Core but accepted a connection without a client certificate`);
      continue;
    }
    report(true, `${target} reaches Core${mutualTls ? " and requires a client certificate" : ""}`);
  }
}

async function checkGeneratedMaterial(hostName: string, streamingPort: number, martiPort: number): Promise<void> {
  // Only the advertised endpoint matters here; any valid certificate fills the truststore.
  const caPems = [await serverCertificatePem(hostName)];
  const connectionPackage = buildConnectionPackage({ hostName, streamingPort, martiPort, caPems });
  const connectionPreferences = strFromU8(unzipSync(connectionPackage.bytes)["config.pref"] ?? new Uint8Array());
  const profile = (await buildDeviceProfile("enrollment", [], martiPort)) ?? new Uint8Array();
  const profilePreferences = strFromU8(unzipSync(profile)["preferences/preference.pref"] ?? new Uint8Array());
  const martiEntry = `<entry key="apiSecureServerPort" class="class java.lang.String">${String(martiPort)}</entry>`;
  report(
    connectionPreferences.includes(`>${hostName}:${String(streamingPort)}:ssl<`) &&
      connectionPreferences.includes(martiEntry) &&
      profilePreferences.includes(martiEntry),
    `connection package and enrollment profile advertise ${hostName}, streaming ${String(streamingPort)} and Data Packages ${String(martiPort)}`,
  );
}

async function main(): Promise<void> {
  await checkWebOrigin();
  const settings = await loadTakServerSettings();
  if (!settings.enabled || settings.hostName === null) {
    process.stdout.write("skip TAK server is disabled\n");
  } else {
    await checkTakPorts(settings.hostName, {
      Enrollment: { port: settings.enrollmentPort, mutualTls: false },
      "Data Packages": { port: settings.martiPort, mutualTls: true },
      Streaming: { port: settings.streamingPort, mutualTls: true },
    });
    await checkGeneratedMaterial(settings.hostName, settings.streamingPort, settings.martiPort);
  }
  await disconnectDatabase();
  process.stdout.write(failures === 0 ? "Deployment check passed.\n" : `Deployment check failed: ${String(failures)} problem(s).\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
