import { database } from "../../shared/database/database.js";
import { validationProblem, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import type { Uuid } from "../../shared/http/uuid.js";

/**
 * A selection of event members: everyone who matches any listed group, role or member. Used by
 * Meshtastic channels and Data Packages so both decide "who receives this" the same way.
 */
export interface EventAudience {
  /** @maxItems 100 */
  groupIds: Uuid[];
  /** @maxItems 100 */
  roleIds: Uuid[];
  /** @maxItems 500 */
  memberIds: Uuid[];
}

/** The member attributes an audience can select by. */
export interface AudienceRecipient {
  memberId: string;
  eventRoleId: string;
  eventGroupId: string;
}

/** One stored selector row: exactly one of the three IDs is set. */
export interface AudienceSelector {
  eventGroupId: string | null;
  eventRoleId: string | null;
  eventMemberId: string | null;
}

export const EMPTY_AUDIENCE: EventAudience = { groupIds: [], roleIds: [], memberIds: [] };

type Lookup = (ids: string[]) => Promise<Array<{ id: string }>>;

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function hasUnknownIds(ids: string[], lookup: Lookup): Promise<boolean> {
  const wanted = unique(ids);
  return wanted.length > 0 && (await lookup(wanted)).length !== wanted.length;
}

export function isEmptyAudience(audience: EventAudience): boolean {
  return audience.groupIds.length + audience.roleIds.length + audience.memberIds.length === 0;
}

/** Every selected group, role and member must belong to the event. `field` prefixes problems. */
export async function validateAudience(eventId: string, audience: EventAudience, field: string): Promise<void> {
  const inEvent = (ids: string[]) => ({ where: { eventId, id: { in: ids } }, select: { id: true } });
  const checks: Array<[keyof EventAudience, Lookup]> = [
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

/** Selector rows for storage, without duplicates. */
export function audienceSelectors(audience: EventAudience): Array<Partial<AudienceSelector>> {
  return [
    ...unique(audience.groupIds).map((eventGroupId) => ({ eventGroupId })),
    ...unique(audience.roleIds).map((eventRoleId) => ({ eventRoleId })),
    ...unique(audience.memberIds).map((eventMemberId) => ({ eventMemberId })),
  ];
}

/** Sorted so responses and configuration snapshots are deterministic. */
export function audienceFromSelectors(rows: readonly AudienceSelector[]): EventAudience {
  const pick = (key: keyof AudienceSelector): string[] =>
    rows.flatMap((row) => (row[key] === null ? [] : [row[key]])).sort();

  return {
    groupIds: pick("eventGroupId"),
    roleIds: pick("eventRoleId"),
    memberIds: pick("eventMemberId"),
  };
}

export function audienceIncludes(audience: EventAudience, recipient: AudienceRecipient): boolean {
  return (
    audience.groupIds.includes(recipient.eventGroupId) ||
    audience.roleIds.includes(recipient.eventRoleId) ||
    audience.memberIds.includes(recipient.memberId)
  );
}
