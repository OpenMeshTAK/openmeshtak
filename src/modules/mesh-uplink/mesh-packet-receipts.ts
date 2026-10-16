import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { logger } from "../../shared/logging/logger.js";
import { DEDUPE_WINDOW_MS } from "./mesh-observation-rules.js";

export interface PacketKey {
  nodeId: string;
  packetId: number;
}

function keyOf({ nodeId, packetId }: PacketKey): string {
  return `${nodeId}:${String(packetId)}`;
}

/**
 * Claims packets for one event and returns the keys that were new. The same packet uploaded again,
 * by a retry or by a second HQ that heard it too, is already claimed and left out. The primary key
 * decides, so two HQs uploading at the same moment cannot both win.
 */
export async function claimPackets(eventId: string, packets: readonly PacketKey[]): Promise<Set<string>> {
  const unique = [...new Map(packets.map((packet) => [keyOf(packet), packet])).values()];
  if (unique.length === 0) {
    return new Set();
  }
  const existing = await database.meshPacketReceipt.findMany({
    where: { eventId, OR: unique.map(({ nodeId, packetId }) => ({ nodeId, packetId: BigInt(packetId) })) },
    select: { nodeId: true, packetId: true },
  });
  const seen = new Set(existing.map(({ nodeId, packetId }) => `${nodeId}:${packetId.toString()}`));
  const fresh = unique.filter((packet) => !seen.has(keyOf(packet)));
  const rows = fresh.map(({ nodeId, packetId }) => ({ eventId, nodeId, packetId: BigInt(packetId) }));
  try {
    await database.meshPacketReceipt.createMany({ data: rows });
    return new Set(fresh.map(keyOf));
  } catch (error: unknown) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }
  // Another upload claimed some of them in between: claim one by one.
  const claimed = new Set<string>();
  for (const row of rows) {
    try {
      await database.meshPacketReceipt.create({ data: row });
      claimed.add(`${row.nodeId}:${row.packetId.toString()}`);
    } catch (error: unknown) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }
  return claimed;
}

/** Gives up claims after processing failed, so the HQ's retry is processed instead of being a duplicate. */
export async function releasePackets(eventId: string, packets: readonly PacketKey[]): Promise<void> {
  if (packets.length === 0) {
    return;
  }
  await database.meshPacketReceipt.deleteMany({
    where: { eventId, OR: packets.map(({ nodeId, packetId }) => ({ nodeId, packetId: BigInt(packetId) })) },
  });
}

export function packetKey(packet: PacketKey): string {
  return keyOf(packet);
}

/** Forgets packets older than the deduplication window; uploads that old are rejected anyway. */
export async function purgeExpiredPacketReceipts(now = new Date()): Promise<number> {
  const result = await database.meshPacketReceipt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - DEDUPE_WINDOW_MS) } } });
  return result.count;
}

/** Runs the cleanup at start and then every six hours in the Core server process. */
export function schedulePacketReceiptCleanup(): NodeJS.Timeout {
  const run = (): void => {
    purgeExpiredPacketReceipts().catch((error: unknown) => {
      logger.error({ error, event: "mesh_receipts_purge_failed" }, "Expired mesh packet receipts could not be deleted");
    });
  };
  run();
  return setInterval(run, 6 * 3_600_000).unref();
}
