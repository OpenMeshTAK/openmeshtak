import type {
  SnapshotChannel,
  SnapshotGroup,
} from "../event-configuration/configuration-snapshot.js";
import { shortNameFor } from "../event-members/member-identity.js";
import { resolveProfileChannels, type LiveChannelState } from "./profile-channels.js";
import type { ProfileAssignment, ResolvedProfileDto } from "./profile.dto.js";

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
  role: ProfileAssignment;
  group: SnapshotGroup;
  channels: SnapshotChannel[];
  liveChannels: ReadonlyMap<string, LiveChannelState>;
  revision: { id: string; number: number } | null;
}

/**
 * The one server-side implementation of profile resolution. It is pure so artifact generators
 * and tests can rely on identical output for identical inputs.
 *
 * Callsign and short-name number are member identity and come from the member record; every other
 * setting comes from the group as captured in the configuration revision.
 */
export function resolveProfile({
  member,
  role,
  group,
  channels,
  liveChannels,
  revision,
}: ProfileInputs): ResolvedProfileDto {
  const { provisioning } = group;

  return {
    eventId: member.eventId,
    memberId: member.id,
    userId: member.userId,
    source: revision === null ? "preview" : "published",
    configurationRevision: revision,
    username: member.username,
    callsign: member.callsign,
    eventRole: role,
    group: { slug: group.slug, name: group.name },
    tak: {
      callsign: member.callsign,
      team: provisioning.tak.team,
      role: provisioning.tak.role,
      serverGroups: provisioning.tak.serverGroups,
    },
    meshtastic: {
      longName: member.callsign,
      shortName: shortNameFor(provisioning.shortNamePrefix, member.shortNameNumber),
      deviceRole: provisioning.meshtastic.deviceRole,
      channels: resolveProfileChannels(channels, liveChannels, {
        memberId: member.id,
        eventRoleId: member.eventRoleId,
        eventGroupId: member.eventGroupId,
      }),
    },
    missionGroups: provisioning.missionGroups,
  };
}
