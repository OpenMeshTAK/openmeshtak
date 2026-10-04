import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function findTestFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? findTestFiles(path)
      : entry.isFile() && entry.name.endsWith(".test.ts")
        ? [path]
        : [];
  });
}

function run(command: string, args: string[], environment: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: "inherit",
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Test prerequisite exited with status ${String(result.status)}.`);
  }
}

const testDatabaseFile = `openmeshtak-test-${randomUUID()}.sqlite`;
const testDatabasePath = resolve("server/data/db", testDatabaseFile);
const testDataDirectory = resolve("server/data", `test-${randomUUID()}`);
const testEnvironment = {
  ...process.env,
  BETTER_AUTH_SECRET: "openmeshtak-test-secret-not-for-production",
  DATABASE_URL: `file:./server/data/db/${testDatabaseFile}`,
  DATA_DIRECTORY: testDataDirectory,
  LOG_LEVEL: "silent",
  NODE_ENV: "test",
  // A test-only firmware line proves new profiles need no code changes.
  MESHTASTIC_FIRMWARE_PROFILE_DIRS: resolve("test/fixtures/firmware-profiles"),
};

mkdirSync(dirname(testDatabasePath), { recursive: true });

try {
  run(
    process.execPath,
    ["--import", "tsx", "scripts/run-prisma.ts", "migrate", "deploy"],
    testEnvironment,
  );
  run(
    process.execPath,
    ["--import", "tsx", "--test", "--test-concurrency=1", ...findTestFiles("test")],
    testEnvironment,
  );
} finally {
  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${testDatabasePath}${suffix}`, { force: true });
  }
  rmSync(testDataDirectory, { recursive: true, force: true });
}
