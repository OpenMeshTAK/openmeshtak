import type { Prisma } from "../../generated/prisma/client.js";
import { ProblemError, type ProblemFieldError } from "../../shared/errors/problem-error.js";
import { callsignFits, renderCallsign, shortNameFits } from "./member-identity.js";

interface GroupIdentitySettings {
  id: string;
  eventId: string;
  name: string;
  callsignFormat: string;
  shortNamePrefix: string | null;
}

function identityConflict(errors: ProblemFieldError[]): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:member-identity-conflict",
    title: "Member callsigns or short names would be invalid",
    status: 409,
    detail: "The change would give members duplicate, oversized or impossible names.",
    code: "MEMBER_IDENTITY_CONFLICT",
    errors,
  });
}

/**
 * Re-renders the callsigns of a group's members after its format, name or prefix changed. Runs in
 * the caller's transaction so an invalid change rolls back completely. Members with an override
 * keep it.
 */
export async function refreshGroupMemberIdentities(
  transaction: Prisma.TransactionClient,
  group: GroupIdentitySettings,
): Promise<void> {
  const members = await transaction.eventMember.findMany({
    where: { eventGroupId: group.id },
    select: { id: true, username: true, callsign: true, callsignOverride: true, shortNameNumber: true },
  });

  const errors: ProblemFieldError[] = [];
  const updates: Array<{ id: string; callsign: string }> = [];
  for (const member of members) {
    const callsign =
      member.callsignOverride ?? renderCallsign(group.callsignFormat, member.username, group.name);
    if (!callsignFits(callsign)) {
      errors.push({ field: `members.${member.id}.callsign`, code: "TOO_LONG", message: "Callsign exceeds 39 bytes." });
    }
    if (!shortNameFits(group.shortNamePrefix, member.shortNameNumber)) {
      errors.push({ field: `members.${member.id}.shortName`, code: "EXHAUSTED", message: "Short name exceeds 4 bytes." });
    }
    if (callsign !== member.callsign) {
      updates.push({ id: member.id, callsign });
    }
  }

  const newCallsigns = updates.map(({ callsign }) => callsign);
  const holders = await transaction.eventMember.findMany({
    where: { eventId: group.eventId, callsign: { in: newCallsigns }, NOT: { eventGroupId: group.id } },
    select: { callsign: true },
  });
  const taken = new Set(holders.map(({ callsign }) => callsign));
  const duplicates = newCallsigns.filter((callsign, index) => newCallsigns.indexOf(callsign) !== index);
  for (const callsign of new Set([...taken, ...duplicates])) {
    errors.push({ field: "callsign", code: "CONFLICT", message: `Callsign "${callsign}" would be used twice.` });
  }

  if (errors.length > 0) {
    throw identityConflict(errors);
  }

  // Free the old values first so renames that swap callsigns inside the group never collide.
  for (const { id } of updates) {
    await transaction.eventMember.update({ where: { id }, data: { callsign: `\u0000${id}` } });
  }
  for (const { id, callsign } of updates) {
    await transaction.eventMember.update({ where: { id }, data: { callsign } });
  }
}
