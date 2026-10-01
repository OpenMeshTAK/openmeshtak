import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STARTUP_TIMEOUT_MS = 20_000;

function run(command: string, args: string[], environment: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { env: environment, stdio: "inherit" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with status ${String(result.status)}.`);
  }
}

async function unusedPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a smoke-test port."));
        return;
      }
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

async function waitForResponse(process: ChildProcess, url: string): Promise<Response> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`Core exited with status ${String(process.exitCode)} before it became healthy.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        return response;
      }
    } catch {
      // Startup is asynchronous; retry until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Core did not answer ${url} within ${String(STARTUP_TIMEOUT_MS)} ms.`);
}

async function stop(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) {
    return;
  }
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => process.once("exit", () => resolve())),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        process.kill("SIGKILL");
        resolve();
      }, 5_000),
    ),
  ]);
}

async function smokeCleanInstall(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "openmeshtak-clean-install-"));
  const dataDirectory = join(root, "data");
  const secretsDirectory = join(root, "secrets");
  const databasePath = join(dataDirectory, "db", "openmeshtak.sqlite");
  const rootKeyPath = join(secretsDirectory, "root-encryption-key");
  const port = await unusedPort();
  mkdirSync(secretsDirectory, { recursive: true });
  writeFileSync(rootKeyPath, randomBytes(32).toString("base64"), { encoding: "utf8", mode: 0o600 });

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    APP_HOST: "127.0.0.1",
    APP_PORT: String(port),
    BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
    DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
    DATA_DIRECTORY: dataDirectory,
    LOG_LEVEL: "silent",
    NODE_ENV: "production",
    PUBLIC_ORIGIN: `https://127.0.0.1:${String(port)}`,
    ROOT_ENCRYPTION_KEY_FILE: rootKeyPath,
    SWAGGER_ENABLED: "false",
    TRUST_PROXY: "true",
  };

  let core: ChildProcess | undefined;
  try {
    run(process.execPath, ["--import", "tsx", "scripts/prepare-data.ts"], environment);
    run(process.execPath, ["--import", "tsx", "scripts/run-prisma.ts", "migrate", "deploy"], environment);
    if (!existsSync(databasePath) || !existsSync(join(dataDirectory, "storage"))) {
      throw new Error("The clean install did not create its database and storage directories.");
    }

    // Suppress child output because first startup intentionally prints a live bootstrap token.
    core = spawn(process.execPath, ["dist/server.js"], { env: environment, stdio: "ignore" });
    const baseUrl = `http://127.0.0.1:${String(port)}`;
    const health = (await (await waitForResponse(core, `${baseUrl}/api/v1/health`)).json()) as {
      service?: string;
      status?: string;
    };
    if (health.status !== "ok" || health.service !== "openmeshtak") {
      throw new Error("The clean install returned an unexpected health response.");
    }

    const setup = (await (await fetch(`${baseUrl}/api/v1/setup`)).json()) as { configured?: boolean };
    if (setup.configured !== false) {
      throw new Error("A clean install unexpectedly reports completed setup.");
    }
    if ((await fetch(`${baseUrl}/api/docs`)).status !== 404) {
      throw new Error("Swagger UI must stay disabled by default in production.");
    }

    process.stdout.write("Clean-install smoke test passed.\n");
  } finally {
    if (core !== undefined) {
      await stop(core);
    }
    rmSync(root, { recursive: true, force: true });
  }
}

await smokeCleanInstall();
