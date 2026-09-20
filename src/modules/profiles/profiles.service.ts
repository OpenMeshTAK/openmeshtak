import type { Event } from "../../generated/prisma/client.js";
import {
  forbidden,
  hasAnyGrantForEvent,
  hasPermission,
} from "../../shared/auth/permission-check.js";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { latestConfigurationRevision } from "../event-configuration/configuration-revisions.service.js";
import {
  buildConfigurationSnapshot,
  parseConfigurationSnapshot,
  type ConfigurationSnapshot,
} from "../event-configuration/configuration-snapshot.js";
import type { MyEventMembershipDto, ResolvedProfileDto } from "./profile.dto.js";
import type { LiveChannelState } from "./profile-channels.js";
import { resolveProfileFirmware } from "./profile-firmware.js";
import { resolveProfile } from "./profile-resolver.js";

const memberSelection = {
  id: true,
  eventId: true,
  userId: true,
  username: true,
  callsign: true,
  shortNameNumber: true,
  eventRoleId: true,
  eventGroupId: true,
} as const;

function notPublished(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:profile-not-published",
    title: "Profile not published yet",
    status: 409,
    detail: "The member's role or group is not part of the published configuration. Publish it first.",
    code: "PROFILE_NOT_PUBLISHED",
  });
}

/**
 * Administrators with `members.read` see every member; a participant sees only their own profile
 * and only while the event is active. Everyone else gets the usual concealment rules.
 */
async function requireProfileAccess(
  principal: Principal,
  event: Event,
  memberUserId: string | null,
): Promise<void> {
  if (await hasPermission(principal, "members.read", event.id)) {
    return;
  }
  const isSelf = principal.type === "user" && memberUserId === principal.id;
  if (isSelf && event.status === "active") {
    return;
  }
  throw (await hasAnyGrantForEvent(principal, event.id)) ? forbidden() : notFoundProblem();
}

async function liveChannelStates(eventId: string): Promise<Map<string, LiveChannelState>> {
  const channels = await database.meshtasticChannel.findMany({
    where: { eventId },
    select: { id: true, releasedAt: true },
  });
  return new Map(channels.map(({ id, releasedAt }) => [id, { released: releasedAt !== null }]));
}

/** Drafts preview the current configuration; active and archived events use the last revision. */
async function configurationFor(
  event: Event,
): Promise<{ snapshot: ConfigurationSnapshot; revision: { id: string; number: number } | null }> {
  if (event.status === "draft") {
    const snapshot = await database.$transaction((transaction) =>
      buildConfigurationSnapshot(transaction, event.id),
    );
    return { snapshot, revision: null };
  }

  const revision = await latestConfigurationRevision(database, event.id);
  if (revision === null) {
    throw notPublished();
  }
  return {
    snapshot: parseConfigurationSnapshot(revision.snapshot),
    revision: { id: revision.id, number: revision.number },
  };
}

export async function getMemberProfile(
  principal: Principal,
  eventId: string,
  memberId: string,
): Promise<ResolvedProfileDto> {
  const event = await database.event.findUnique({ where: { id: eventId } });
  const member =
    event === null
      ? null
      : await database.eventMember.findFirst({ where: { id: memberId, eventId }, select: memberSelection });

  if (event === null) {
    throw notFoundProblem();
  }
  await requireProfileAccess(principal, event, member?.userId ?? null);
  if (member === null) {
    throw notFoundProblem();
  }

  const { snapshot, revision } = await configurationFor(event);
  const role = snapshot.roles.find(({ id }) => id === member.eventRoleId);
  const group = snapshot.groups.find(({ id }) => id === member.eventGroupId);
  if (role === undefined || group === undefined) {
    throw notPublished();
  }

  return resolveProfile({
    member,
    role: { slug: role.slug, name: role.name },
    group,
    channels: snapshot.channels,
    liveChannels: await liveChannelStates(eventId),
    firmware: await resolveProfileFirmware(snapshot.meshtastic),
    tak: snapshot.tak,
    revision,
  });
}

/** The signed-in user's participations in active events, so the PWA can open their profile. */
export async function listMyEventMemberships(principal: Principal): Promise<MyEventMembershipDto[]> {
  if (principal.type !== "user") {
    return [];
  }

  const members = await database.eventMember.findMany({
    where: { userId: principal.id, event: { status: "active" } },
    orderBy: [{ event: { name: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      callsign: true,
      event: { select: { id: true, name: true, slug: true, timeZone: true } },
    },
  });

  return members.map((member) => ({
    eventId: member.event.id,
    eventName: member.event.name,
    eventSlug: member.event.slug,
    timeZone: member.event.timeZone,
    memberId: member.id,
    callsign: member.callsign,
  }));
}
