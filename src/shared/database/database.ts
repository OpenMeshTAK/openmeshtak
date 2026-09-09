import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client.js";
import { config } from "../config/config.js";

function ensureDatabaseDirectory(databaseUrl: string): void {
  const configuredPath = databaseUrl.slice("file:".length);
  const databasePath = isAbsolute(configuredPath) ? configuredPath : resolve(configuredPath);

  mkdirSync(dirname(databasePath), { recursive: true });
}

ensureDatabaseDirectory(config.databaseUrl);

const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });

export const database = new PrismaClient({ adapter });

export async function connectDatabase(): Promise<void> {
  await database.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await database.$disconnect();
}
