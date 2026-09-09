import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./server/data/db/openmeshtak.sqlite";

if (!databaseUrl.startsWith("file:")) {
  throw new Error("The SQLite development database URL must start with file:");
}

const configuredPath = databaseUrl.slice("file:".length);
const databasePath = isAbsolute(configuredPath) ? configuredPath : resolve(configuredPath);

mkdirSync(dirname(databasePath), { recursive: true });
