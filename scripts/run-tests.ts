import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { availableParallelism } from "node:os";

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
const testRunId = testDatabaseFile.slice(0, -".sqlite".length);
const testDataDirectory = resolve("server/data", testRunId);
const requestedConcurrency = Number.parseInt(process.env.TEST_CONCURRENCY ?? "", 10);
const testConcurrency = Number.isSafeInteger(requestedConcurrency) && requestedConcurrency > 0
  ? requestedConcurrency
  : Math.min(10, availableParallelism());
const testEnvironment = {
  ...process.env,
  BETTER_AUTH_SECRET: "openmeshtak-test-secret-not-for-production",
  DATABASE_URL: `file:./server/data/db/${testDatabaseFile}`,
  DATA_DIRECTORY: testDataDirectory,
  LOG_LEVEL: "silent",
  NODE_ENV: "test",
  // A test-only firmware line proves new profiles need no code changes.
  MESHTASTIC_FIRMWARE_PROFILE_DIRS: resolve("test/fixtures/firmware-profiles"),
  TEST_DATABASE_TEMPLATE: testDatabasePath,
  TEST_DATA_DIRECTORY: testDataDirectory,
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
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/test-worker-environment.ts",
      "--test",
      `--test-concurrency=${String(testConcurrency)}`,
      ...findTestFiles("test"),
    ],
    testEnvironment,
  );
} finally {
  for (const entry of readdirSync(dirname(testDatabasePath))) {
    if (entry.startsWith(`${testRunId}-`) || entry === testDatabaseFile) {
      rmSync(join(dirname(testDatabasePath), entry), { force: true });
    }
  }
  rmSync(testDataDirectory, { recursive: true, force: true });
}
