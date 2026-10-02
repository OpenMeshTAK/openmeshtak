import type { Event } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { buildConfigurationSnapshot, hashConfigurationSnapshot } from "../event-configuration/configuration-snapshot.js";
import { latestConfigurationRevision } from "../event-configuration/configuration-revisions.service.js";

export interface EventOverview {
  /** Members of the event, whatever their group or role. */
  memberCount: number;
  /** Synchronized members that could not be resolved and wait for an administrator. */
  openSyncIssueCount: number;
  /** Number of the configuration revision participants receive; `null` before the first one. */
  publishedRevision: number | null;
  /**
   * Whether an active event's current configuration differs from its published revision, so
   * participants do not see the changes until someone publishes. Always `false` for drafts
   * (activation publishes) and archived events (read-only).
   */
  unpublishedChanges: boolean;
}

async function configurationState(event: Pick<Event, "id" | "status">): Promise<Pick<EventOverview, "publishedRevision" | "unpublishedChanges">> {
  const latest = await latestConfigurationRevision(database, event.id);
  if (latest === null || event.status !== "active") {
    return { publishedRevision: latest?.number ?? null, unpublishedChanges: false };
  }
  // The same deterministic hash that decides whether publishing creates a new revision.
  const current = hashConfigurationSnapshot(await buildConfigurationSnapshot(database, event.id));
  return { publishedRevision: latest.number, unpublishedChanges: current !== latest.snapshotHash };
}

/** Operational facts for the event overview, computed for one page of events at once. */
export async function eventOverviews(events: Array<Pick<Event, "id" | "status">>): Promise<Map<string, EventOverview>> {
  const eventIds = events.map(({ id }) => id);
  const [members, issues, configurations] = await Promise.all([
    database.eventMember.groupBy({ by: ["eventId"], where: { eventId: { in: eventIds } }, _count: { _all: true } }),
    database.syncIssue.groupBy({ by: ["eventId"], where: { eventId: { in: eventIds }, status: "open" }, _count: { _all: true } }),
    Promise.all(events.map(configurationState)),
  ]);
  const memberCounts = new Map(members.map((row) => [row.eventId, row._count._all]));
  const issueCounts = new Map(issues.map((row) => [row.eventId, row._count._all]));

  return new Map(
    events.map((event, index) => [
      event.id,
      {
        memberCount: memberCounts.get(event.id) ?? 0,
        openSyncIssueCount: issueCounts.get(event.id) ?? 0,
        ...(configurations[index] ?? { publishedRevision: null, unpublishedChanges: false }),
      },
    ]),
  );
}
