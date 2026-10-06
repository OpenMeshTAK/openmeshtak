import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:net";
import { after, before, describe, it } from "node:test";

let occupied: Server;
let occupiedPort: number;

function runPreflight(ports: Array<{ published: number; host_ip?: string }>, composePs = ""): { status: number | null; output: string } {
  const config = { services: { core: { ports: ports.map((port) => ({ ...port, target: 8443, protocol: "tcp" })) } } };
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli/preflight-ports.ts"], {
    env: { ...process.env, COMPOSE_CONFIG: JSON.stringify(config), COMPOSE_PS: composePs, DOCKER_PS: `panel\t0.0.0.0:${String(occupiedPort)}->8443/tcp` },
    encoding: "utf8",
  });
  return { status: result.status, output: result.stdout };
}

void describe("host port preflight", () => {
  before(async () => {
    occupied = createServer();
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", resolve));
    occupiedPort = (occupied.address() as { port: number }).port;
  });

  after(() => {
    occupied.close();
  });

  void it("stops on a port another service owns and names the owner", () => {
    const result = runPreflight([{ published: occupiedPort, host_ip: "127.0.0.1" }]);
    assert.equal(result.status, 1);
    assert.ok(result.output.includes(`FAIL core 127.0.0.1:${String(occupiedPort)}/tcp is in use by panel`), result.output);
    assert.match(result.output, /Nothing was started/);
  });

  void it("passes free ports and ports the running deployment already publishes", () => {
    const composePs = JSON.stringify({ Publishers: [{ PublishedPort: occupiedPort, Protocol: "tcp" }] });
    const result = runPreflight([{ published: occupiedPort, host_ip: "127.0.0.1" }], composePs);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /is used by this deployment/);
  });
});
