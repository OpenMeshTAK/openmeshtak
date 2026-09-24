import type {
  SnapshotChannel,
  SnapshotGroup,
  SnapshotTak,
} from "../event-configuration/configuration-snapshot.js";
import type { TakRole } from "../event-groups/provisioning-values.js";
import { shortNameFor } from "../event-members/member-identity.js";
import { resolveTakConnection } from "./profile-tak.js";
import { resolveProfileChannels, type LiveChannelState } from "./profile-channels.js";
import type { ProfileAssignment, ProfileFirmware, ResolvedProfileDto } from "./profile.dto.js";

export interface ProfileMember {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  callsign: string;
  shortNameNumber: number;
  eventRoleId: string;
  eventGroupId: string;
}

export interface ProfileInputs {
  member: ProfileMember;
  role: ProfileAssignment & { takRoleOverride: TakRole | null };
  group: SnapshotGroup;
  channels: SnapshotChannel[];
  liveChannels: ReadonlyMap<string, LiveChannelState>;
  firmware: ProfileFirmware | null;
  tak: SnapshotTak | null;
  revision: { id: string; number: number } | null;
}

/**
 * The one server-side implementation of profile resolution. It is pure so artifact generators
 * and tests can rely on identical output for identical inputs.
 *
 * Callsign and short-name number are member identity and come from the member record; every other
 * setting comes from the group as captured in the configuration revision, except that the event
 * role may override the TAK role.
 */
export function resolveProfile({
  member,
  role,
  group,
  channels,
  liveChannels,
  firmware,
  tak,
  revision,
}: ProfileInputs): ResolvedProfileDto {
  const { provisioning } = group;
  const memberChannels = resolveProfileChannels(channels, liveChannels, {
    memberId: member.id,
    eventRoleId: member.eventRoleId,
    eventGroupId: member.eventGroupId,
  });

  return {
    eventId: member.eventId,
    memberId: member.id,
    userId: member.userId,
    source: revision === null ? "preview" : "published",
    configurationRevision: revision,
    username: member.username,
    callsign: member.callsign,
    eventRole: { slug: role.slug, name: role.name },
    group: { slug: group.slug, name: group.name },
    tak: {
      callsign: member.callsign,
      team: provisioning.tak.team,
      role: role.takRoleOverride ?? provisioning.tak.role,
      serverGroups: provisioning.tak.serverGroups,
      connection: resolveTakConnection(tak, memberChannels),
    },
    meshtastic: {
      longName: member.callsign,
      shortName: shortNameFor(provisioning.shortNamePrefix, member.shortNameNumber),
      channels: memberChannels,
      firmware,
    },
  };
}
