import { database } from "../../../shared/database/database.js";
import { latestConfigurationRevision } from "../../event-configuration/configuration-revisions.service.js";
import { parseConfigurationSnapshot, type ConfigurationSnapshot } from "../../event-configuration/configuration-snapshot.js";
import {
  mergeAtakPreferences,
  resolveAtakPreferences,
  takIdentityPreferences,
  type AtakPreference,
  type TakIdentity,
} from "../../tak-configuration/atak-preferences.js";

interface ActiveMembership {
  id: string;
  callsign: string;
  eventRoleId: string;
  eventGroupId: string;
  updatedAt: Date;
  snapshot: ConfigurationSnapshot;
  revisionCreatedAt: Date;
}

/** The user's memberships in active events with a published revision, the latest-starting event last. */
async function activeMemberships(userId: string): Promise<ActiveMembership[]> {
  const members = await database.eventMember.findMany({
    where: { userId, event: { status: "active" } },
    select: {
      id: true,
      callsign: true,
      eventRoleId: true,
      eventGroupId: true,
      updatedAt: true,
      event: { select: { id: true, startsAt: true, createdAt: true } },
    },
  });
  const startOf = ({ event }: (typeof members)[number]) => (event.startsAt ?? event.createdAt).getTime();
  const memberships: ActiveMembership[] = [];
  for (const member of members.sort((a, b) => startOf(a) - startOf(b))) {
    const revision = await latestConfigurationRevision(database, member.event.id);
    if (revision !== null) {
      memberships.push({ ...member, snapshot: parseConfigurationSnapshot(revision.snapshot), revisionCreatedAt: revision.createdAt });
    }
  }
  return memberships;
}

/**
 * Callsign, team color and TAK role as the published revision resolves them: the callsign from the
 * member record, the team from the group, the role from the role override or else the group.
 * `null` when the revision predates the member's current role or group.
 */
function identityOf(membership: ActiveMembership): TakIdentity | null {
  const role = membership.snapshot.roles.find(({ id }) => id === membership.eventRoleId);
  const group = membership.snapshot.groups.find(({ id }) => id === membership.eventGroupId);
  if (role === undefined || group === undefined) {
    return null;
  }
  return {
    callsign: membership.callsign,
    team: group.provisioning.tak.team,
    role: role.takRoleOverride ?? group.provisioning.tak.role,
  };
}

/**
 * The ATAK preferences of the user's active events, from their published revisions: per event the
 * entries that reach the member (the most specific target winning), then the member's callsign,
 * team and role. A member of several events gets one merged set: for
 * the same key, the event that started last wins, using the creation time for events without a
 * start date. Preferences follow membership, so administrators who only have TAK access get none.
 *
 * `changed` tells whether any of these revisions or memberships is newer than `changedSince`, so a
 * connection profile only carries preferences when they may differ from what the app already
 * applied. The membership counts because a callsign override or a new group is no revision.
 */
export async function memberAtakPreferences(userId: string, changedSince: Date | null): Promise<{ entries: AtakPreference[]; changed: boolean }> {
  const lists: AtakPreference[][] = [];
  let changed = changedSince === null;
  for (const membership of await activeMemberships(userId)) {
    const identity = identityOf(membership);
    const recipient = { memberId: membership.id, eventRoleId: membership.eventRoleId, eventGroupId: membership.eventGroupId };
    const eventPreferences = resolveAtakPreferences(membership.snapshot.tak?.atakPreferences ?? [], recipient);
    lists.push([...eventPreferences, ...(identity === null ? [] : takIdentityPreferences(identity))]);
    changed ||= changedSince !== null && (membership.revisionCreatedAt > changedSince || membership.updatedAt > changedSince);
  }
  return { entries: mergeAtakPreferences(...lists), changed };
}

/** The identity of the latest-starting active event, for packages that carry no event preferences. */
export async function memberTakIdentity(userId: string): Promise<TakIdentity | null> {
  const identities = (await activeMemberships(userId)).map(identityOf).filter((identity) => identity !== null);
  return identities.at(-1) ?? null;
}
