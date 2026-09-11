import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import { toGroupProvisioning, type GroupProvisioning } from "../event-groups/group-provisioning.js";

export interface SnapshotRole {
  id: string;
  slug: string;
  name: string;
}

export interface SnapshotGroup {
  id: string;
  slug: string;
  name: string;
  provisioning: GroupProvisioning;
}

/** Bump `schemaVersion` whenever the snapshot shape changes; old revisions are never rewritten. */
export interface ConfigurationSnapshot {
  schemaVersion: 1;
  roles: SnapshotRole[];
  groups: SnapshotGroup[];
}

/**
 * Reads the event's current configuration in a deterministic order (by slug), so the same
 * configuration always serializes to the same JSON and therefore the same hash.
 */
export async function buildConfigurationSnapshot(
  transaction: Prisma.TransactionClient,
  eventId: string,
): Promise<ConfigurationSnapshot> {
  const [roles, groups] = await Promise.all([
    transaction.eventRole.findMany({
      where: { eventId },
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    transaction.eventGroup.findMany({ where: { eventId }, orderBy: { slug: "asc" } }),
  ]);

  return {
    schemaVersion: 1,
    roles,
    groups: groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      provisioning: toGroupProvisioning(group),
    })),
  };
}

export function hashConfigurationSnapshot(snapshot: ConfigurationSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

/** Revisions are written only by this module from `ConfigurationSnapshot` values. */
export function parseConfigurationSnapshot(value: Prisma.JsonValue): ConfigurationSnapshot {
  return value as unknown as ConfigurationSnapshot;
}
