import { randomUUID } from "node:crypto";
import type { MeshtasticChannelAudience, Prisma } from "../../generated/prisma/client.js";
import { database } from "../../shared/database/database.js";
import { validationProblem, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { ChannelAudience } from "./meshtastic-channel.dto.js";

export const EMPTY_AUDIENCE: ChannelAudience = { groupIds: [], roleIds: [], memberIds: [] };

type Lookup = (ids: string[]) => Promise<Array<{ id: string }>>;

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function hasUnknownIds(ids: string[], lookup: Lookup): Promise<boolean> {
  const wanted = unique(ids);
  return wanted.length > 0 && (await lookup(wanted)).length !== wanted.length;
}

/** Every selected group, role and member must belong to the channel's event. */
export async function validateAudience(
  eventId: string,
  audience: ChannelAudience,
  field: "audience" | "keyHolders" = "audience",
): Promise<void> {
  const inEvent = (ids: string[]) => ({ where: { eventId, id: { in: ids } }, select: { id: true } });
  const checks: Array<[keyof ChannelAudience, Lookup]> = [
    ["groupIds", (ids) => database.eventGroup.findMany(inEvent(ids))],
    ["roleIds", (ids) => database.eventRole.findMany(inEvent(ids))],
    ["memberIds", (ids) => database.eventMember.findMany(inEvent(ids))],
  ];

  const problems: ProblemFieldError[] = [];
  for (const [key, lookup] of checks) {
    if (await hasUnknownIds(audience[key], lookup)) {
      problems.push({
        field: `${field}.${key}`,
        code: "UNKNOWN_REFERENCE",
        message: "Select only groups, roles and members of this event.",
      });
    }
  }
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
}

/** Key-holder selectors share the table with audience selectors and differ only by the flag. */
export function audienceRows(
  channelId: string,
  audience: ChannelAudience,
  keyHolder = false,
): Prisma.MeshtasticChannelAudienceCreateManyInput[] {
  return [
    ...unique(audience.groupIds).map((eventGroupId) => ({ eventGroupId })),
    ...unique(audience.roleIds).map((eventRoleId) => ({ eventRoleId })),
    ...unique(audience.memberIds).map((eventMemberId) => ({ eventMemberId })),
  ].map((target) => ({ id: randomUUID(), channelId, keyHolder, ...target }));
}

/** Sorted so responses and configuration snapshots are deterministic. */
export function toAudience(rows: MeshtasticChannelAudience[], keyHolder = false): ChannelAudience {
  const selected = rows.filter((row) => row.keyHolder === keyHolder);
  const pick = (key: "eventGroupId" | "eventRoleId" | "eventMemberId"): string[] =>
    selected.flatMap((row) => (row[key] === null ? [] : [row[key]])).sort();

  return {
    groupIds: pick("eventGroupId"),
    roleIds: pick("eventRoleId"),
    memberIds: pick("eventMemberId"),
  };
}
