import type { Prisma } from "../../generated/prisma/client.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { type ProblemFieldError, validationProblem } from "../../shared/errors/problem-error.js";
import {
  callsignFits,
  memberIdentityConflictProblem,
  nextShortNameNumber,
  renderCallsign,
  shortNameFits,
} from "./member-identity.js";

export interface RequestedAssignment {
  eventRoleId: string;
  eventGroupId: string;
  /** Already trimmed; `null` uses the group's callsign format. */
  callsignOverride: string | null;
  username: string;
}

/** The member's current group and number, or `null` for a new member. */
export interface CurrentAssignment {
  memberId: string;
  eventGroupId: string;
  shortNameNumber: number;
}

export interface ResolvedAssignment {
  eventRoleId: string;
  eventGroupId: string;
  callsign: string;
  callsignOverride: string | null;
  shortNameNumber: number;
}

function assignmentProblems(role: { id: string } | null, group: { id: string } | null): ProblemFieldError[] {
  const errors: ProblemFieldError[] = [];
  if (role === null) {
    errors.push({ field: "eventRoleId", code: "NOT_FOUND", message: "No role with this ID exists in this event." });
  }
  if (group === null) {
    errors.push({ field: "eventGroupId", code: "NOT_FOUND", message: "No group with this ID exists in this event." });
  }
  return errors;
}

/**
 * Validates an administrator's role/group choice and computes the member's callsign and short-name
 * number. Unlike external synchronization, which records sync issues, administrators get the
 * problem back directly so they can pick another group or set a callsign override.
 */
export async function resolveAssignment(
  transaction: Prisma.TransactionClient,
  eventId: string,
  requested: RequestedAssignment,
  current: CurrentAssignment | null,
): Promise<ResolvedAssignment> {
  const [role, group] = await Promise.all([
    transaction.eventRole.findFirst({ where: { id: requested.eventRoleId, eventId }, select: { id: true } }),
    transaction.eventGroup.findFirst({
      where: { id: requested.eventGroupId, eventId },
      select: { id: true, name: true, callsignFormat: true, shortNamePrefix: true },
    }),
  ]);
  if (role === null || group === null) {
    throw validationProblem(assignmentProblems(role, group));
  }

  const callsign =
    requested.callsignOverride ?? renderCallsign(group.callsignFormat, requested.username, group.name);
  let shortNameNumber = current?.shortNameNumber ?? 0;
  if (group.id !== current?.eventGroupId) {
    const used = await transaction.eventMember.findMany({
      where: { eventGroupId: group.id },
      select: { shortNameNumber: true },
    });
    shortNameNumber = nextShortNameNumber(used.map((member) => member.shortNameNumber));
  }

  const errors: ProblemFieldError[] = [];
  if (!callsignFits(callsign)) {
    errors.push({ field: "callsignOverride", code: "TOO_LONG", message: "Callsign exceeds 39 bytes." });
  }
  const holder = await transaction.eventMember.findUnique({
    where: { eventId_callsign: { eventId, callsign } },
    select: { id: true },
  });
  if (holder !== null && holder.id !== current?.memberId) {
    errors.push({
      field: "callsignOverride",
      code: "CONFLICT",
      message: "Another member of this event already uses this callsign.",
    });
  }
  if (!shortNameFits(group.shortNamePrefix, shortNameNumber)) {
    errors.push({ field: "eventGroupId", code: "EXHAUSTED", message: "The group has no free short name." });
  }
  if (errors.length > 0) {
    throw memberIdentityConflictProblem(errors);
  }

  return {
    eventRoleId: role.id,
    eventGroupId: group.id,
    callsign,
    callsignOverride: requested.callsignOverride,
    shortNameNumber,
  };
}

/** A concurrent change took the callsign or short-name number after the checks above. */
export function concurrentAssignmentProblem(error: unknown): unknown {
  return isUniqueConstraintError(error)
    ? memberIdentityConflictProblem([
        { field: "callsignOverride", code: "CONFLICT", message: "Another member took this name concurrently." },
      ])
    : error;
}
