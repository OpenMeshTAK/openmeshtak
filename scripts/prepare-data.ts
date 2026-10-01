import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL ?? "file:./server/data/db/openmeshtak.sqlite";

if (!databaseUrl.startsWith("file:")) {
  throw new Error("The SQLite development database URL must start with file:");
}

const configuredPath = databaseUrl.slice("file:".length);
const databasePath = databaseUrl.startsWith("file://")
  ? fileURLToPath(databaseUrl)
  : isAbsolute(configuredPath)
    ? configuredPath
    : resolve(configuredPath);
const configuredDataDirectory = process.env.DATA_DIRECTORY ?? "./server/data";
const dataDirectory = isAbsolute(configuredDataDirectory) ? configuredDataDirectory : resolve(configuredDataDirectory);

mkdirSync(dirname(databasePath), { recursive: true });
mkdirSync(resolve(dataDirectory, "storage"), { recursive: true });
