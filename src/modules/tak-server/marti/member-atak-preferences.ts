import { database } from "../../../shared/database/database.js";
import { latestConfigurationRevision } from "../../event-configuration/configuration-revisions.service.js";
import { parseConfigurationSnapshot } from "../../event-configuration/configuration-snapshot.js";
import { mergeAtakPreferences, type AtakPreference } from "../../tak-configuration/atak-preferences.js";

/**
 * The ATAK preferences of the user's active events, from their published revisions. A member of
 * several events gets one merged set: for the same key, the event that started last wins, using
 * the creation time for events without a start date. Preferences follow membership, so
 * administrators who only have TAK access get none.
 *
 * `changed` tells whether any of these revisions is newer than `changedSince`, so a connection
 * profile only carries preferences when they may differ from what the app already applied.
 */
export async function memberAtakPreferences(userId: string, changedSince: Date | null): Promise<{ entries: AtakPreference[]; changed: boolean }> {
  const events = await database.event.findMany({
    where: { status: "active", members: { some: { userId } } },
    select: { id: true, startsAt: true, createdAt: true },
  });
  const ordered = events.sort((a, b) => (a.startsAt ?? a.createdAt).getTime() - (b.startsAt ?? b.createdAt).getTime());
  const lists: AtakPreference[][] = [];
  let changed = changedSince === null;
  for (const event of ordered) {
    const revision = await latestConfigurationRevision(database, event.id);
    if (revision === null) {
      continue;
    }
    const entries = parseConfigurationSnapshot(revision.snapshot).tak?.atakPreferences ?? [];
    if (entries.length > 0) {
      lists.push(entries);
      changed ||= changedSince !== null && revision.createdAt > changedSince;
    }
  }
  return { entries: mergeAtakPreferences(...lists), changed };
}
