import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { notFoundProblem } from "../../../shared/errors/problem-error.js";
import { readBlob } from "../../../shared/storage/blob-storage.js";
import { iconDimensions } from "./icon-database.js";

/** Only called after the library owner and icon membership have been authorized. */
export async function readIconArchiveImage(storageKey: string, sha256: string, iconId: string): Promise<Uint8Array> {
  const archive = await readBlob(storageKey);
  if (createHash("sha256").update(archive).digest("hex") !== sha256) throw new Error("Stored icon library failed its integrity check.");
  const key = `${iconId}.png`;
  const bytes = unzipSync(archive, { filter: (entry) => entry.name === key })[key];
  if (bytes === undefined || iconDimensions(bytes) === null) throw notFoundProblem();
  return bytes;
}
