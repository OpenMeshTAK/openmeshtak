import { createSocket } from "node:dgram";
import { createServer } from "node:net";

/**
 * Host port preflight, started by scripts/preflight.sh before `docker compose up`. It runs in the
 * OpenMeshTak image on the host network and binds every port the compose project publishes, the
 * same way Docker will, so a conflict is found before containers change. Ports already published
 * by this project's running containers belong to the deployment being upgraded and are skipped.
 * It never picks another port: every conflict stops setup with the ways to resolve it.
 *
 * Input comes from environment variables set by the wrapper:
 * - COMPOSE_CONFIG: `docker compose config --format json`
 * - COMPOSE_PS: `docker compose ps --format json` (one object per line or one array)
 * - DOCKER_PS: `docker ps --format '{{.Names}}\t{{.Ports}}'`, to name the owner of a port
 */

interface PublishedPort {
  service: string;
  hostIp: string;
  port: number;
  protocol: "tcp" | "udp";
}

interface ComposePort {
  published?: string | number;
  host_ip?: string;
  protocol?: string;
}

interface ComposeConfig {
  services?: Record<string, { ports?: ComposePort[] }>;
}

interface ComposeContainer {
  Publishers?: Array<{ PublishedPort?: number; Protocol?: string }>;
}

function publishedPorts(config: ComposeConfig): PublishedPort[] {
  return Object.entries(config.services ?? {}).flatMap(([service, { ports = [] }]) =>
    ports
      .filter((entry) => entry.published !== undefined && entry.published !== "")
      .map((entry) => ({
        service,
        hostIp: entry.host_ip ?? "",
        port: Number(entry.published),
        protocol: entry.protocol === "udp" ? ("udp" as const) : ("tcp" as const),
      })),
  );
}

function parseContainers(output: string): ComposeContainer[] {
  const trimmed = output.trim();
  if (trimmed === "") {
    return [];
  }
  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as ComposeContainer[];
  }
  return trimmed.split("\n").map((line) => JSON.parse(line) as ComposeContainer);
}

function ownedPorts(composePs: string): Set<string> {
  const owned = new Set<string>();
  for (const container of parseContainers(composePs)) {
    for (const publisher of container.Publishers ?? []) {
      if (publisher.PublishedPort !== undefined && publisher.PublishedPort > 0) {
        owned.add(`${publisher.Protocol ?? "tcp"}/${String(publisher.PublishedPort)}`);
      }
    }
  }
  return owned;
}

/** Binds and releases one address; resolves to the error code, or null when the port is free. */
function tryBind(host: string, port: number, protocol: "tcp" | "udp"): Promise<string | null> {
  return new Promise((resolve) => {
    if (protocol === "udp") {
      const socket = createSocket(host.includes(":") ? "udp6" : "udp4");
      socket.once("error", (error: NodeJS.ErrnoException) => {
        socket.close();
        resolve(error.code ?? "ERROR");
      });
      socket.bind({ address: host, port, exclusive: true }, () => {
        socket.close(() => {
          resolve(null);
        });
      });
      return;
    }
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      resolve(error.code ?? "ERROR");
    });
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => {
        resolve(null);
      });
    });
  });
}

/** A wildcard publish needs both stacks; a host without IPv6 simply cannot bind `::`. */
async function bindError(entry: PublishedPort): Promise<string | null> {
  const hosts = entry.hostIp === "" || entry.hostIp === "0.0.0.0" ? ["0.0.0.0", "::"] : [entry.hostIp];
  for (const host of hosts) {
    const code = await tryBind(host, entry.port, entry.protocol);
    if (code !== null && !(host === "::" && (code === "EAFNOSUPPORT" || code === "EADDRNOTAVAIL"))) {
      return code;
    }
  }
  return null;
}

function owners(dockerPs: string, port: number): string[] {
  return dockerPs
    .split("\n")
    .filter((line) => line.includes(`:${String(port)}->`))
    .map((line) => line.split("\t")[0] ?? "")
    .filter((name) => name !== "");
}

/** The resolution paths per service, in the order the deployment guide recommends them. */
function advice(port: number): string {
  switch (port) {
    case 8446:
    case 8089:
      return 'ATAK Quick Connect needs this port. Free it, or bind OpenMeshTak to a second public IP address ("<address>:8446:8446"). Another port is a last resort that participants must enter by hand.';
    case 8443:
      return 'Free it, or publish Data Packages on another port such as "8484:8443" in docker-compose.yml and enter 8484 on the TAK server page.';
    case 80:
    case 443:
      return "Another web server owns it. Let that server forward to OpenMeshTak instead.";
    default:
      return "Free the port or change the left side of the mapping in docker-compose.yml.";
  }
}

async function main(): Promise<void> {
  const config = JSON.parse(process.env.COMPOSE_CONFIG ?? "{}") as ComposeConfig;
  const owned = ownedPorts(process.env.COMPOSE_PS ?? "");
  const dockerPs = process.env.DOCKER_PS ?? "";
  let conflicts = 0;

  for (const entry of publishedPorts(config)) {
    const label = `${entry.service} ${entry.hostIp === "" ? "" : `${entry.hostIp}:`}${String(entry.port)}/${entry.protocol}`;
    if (owned.has(`${entry.protocol}/${String(entry.port)}`)) {
      process.stdout.write(`ok   ${label} is used by this deployment\n`);
      continue;
    }
    const code = await bindError(entry);
    if (code === null) {
      process.stdout.write(`ok   ${label} is free\n`);
      continue;
    }
    conflicts += 1;
    const owner = owners(dockerPs, entry.port);
    const by = code === "EADDRINUSE" ? ` is in use${owner.length > 0 ? ` by ${owner.join(", ")}` : ""}` : ` cannot be bound (${code})`;
    process.stdout.write(`FAIL ${label}${by}. ${advice(entry.port)}\n`);
  }

  process.stdout.write(conflicts === 0 ? "Port preflight passed.\n" : `Port preflight failed: ${String(conflicts)} conflict(s). Nothing was started.\n`);
  process.exitCode = conflicts === 0 ? 0 : 1;
}

await main();
