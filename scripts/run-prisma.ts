import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const prismaPackage = require.resolve("prisma/package.json");
const prismaCli = join(dirname(prismaPackage), "build", "index.js");

// Prisma's SQLite schema engine can exit without diagnostics unless Rust logging is enabled.
// Set this before Prisma starts until https://github.com/prisma/prisma/issues/29355 is resolved.
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    RUST_LOG: process.env.RUST_LOG?.trim() || "info",
  },
  stdio: "inherit",
});

if (result.error !== undefined) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
