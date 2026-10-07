import { copyFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const templatePath = process.env.TEST_DATABASE_TEMPLATE;
const dataDirectory = process.env.TEST_DATA_DIRECTORY;

if (process.env.NODE_TEST_CONTEXT !== undefined && templatePath !== undefined && dataDirectory !== undefined) {
  // Node runs each test file in its own process. A private database and storage tree let those
  // processes run concurrently without weakening the tests' existing cleanup guarantees.
  const workerDatabaseFile = `${basename(templatePath, ".sqlite")}-${String(process.pid)}.sqlite`;
  const workerDatabasePath = join(dirname(templatePath), workerDatabaseFile);

  copyFileSync(templatePath, workerDatabasePath);
  process.env.DATABASE_URL = `file:./server/data/db/${workerDatabaseFile}`;
  process.env.DATA_DIRECTORY = join(dataDirectory, String(process.pid));
}
