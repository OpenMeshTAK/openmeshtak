import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { isPlaceholderEmail } from "../auth/claim-session.plugin.js";
import { renderEmail } from "../email/email-layout.js";
import { sendEmailInBackground } from "../email/mailer.js";
import { eventArchivedProblem, requireEventPermission } from "../events/event-access.js";
import { instanceName } from "../instance-settings/instance-settings.service.js";
import type { EventMemberDto } from "./event-member.dto.js";
import { eventMemberSelection, toEventMemberDto } from "./event-member.mapper.js";
import { memberIdentityConflictProblem, shortNameFits } from "./member-identity.js";

export interface ReorderGroupMembersRequest {
  /** Every member of the group exactly once, in the new short-name order (first becomes 1). */
  memberIds: string[];
  /**
   * Emails members whose short name changed, if they have a confirmed address, asking them to set
   * up their radio again. Otherwise the change is only shown to the administrator.
   */
  notifyMembers?: boolean;
}

interface Renumbering {
  memberId: string;
  from: number | undefined;
  to: number;
}

/** Tells affected members their new short name; the radio keeps the old one until re-provisioned. */
async function notifyRenumbered(eventId: string, prefix: string | null, changes: Renumbering[]): Promise<void> {
  const event = await database.event.findUnique({ where: { id: eventId }, select: { name: true } });
  const name = await instanceName();
  const members = await database.eventMember.findMany({
    where: { id: { in: changes.map(({ memberId }) => memberId) } },
    select: { id: true, callsign: true, user: { select: { authSubject: { select: { email: true, emailVerified: true } } } } },
  });
  for (const member of members) {
    const change = changes.find(({ memberId }) => memberId === member.id);
    const address = member.user.authSubject;
    if (change === undefined || address === null || !address.emailVerified || isPlaceholderEmail(address.email)) {
      continue;
    }
    const before = change.from === undefined ? "" : ` from ${prefix ?? ""}${String(change.from)}`;
    sendEmailInBackground(
      {
        to: address.email,
        subject: `Your Meshtastic short name for ${event?.name ?? "your event"} changed`,
        ...renderEmail({
          instanceName: name,
          title: "Your Meshtastic short name changed",
          greeting: `Hello ${member.callsign},`,
          paragraphs: [
            `your Meshtastic short name changed${before} to ${prefix ?? ""}${String(change.to)}. Your radio keeps the old short name until you download your settings file again from the dashboard and import it.`,
          ],
          action: { label: "Open dashboard", url: config.publicOrigin },
        }),
      },
      "short-name-changed",
    );
  }
}

function staleOrder(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:stale-member-order",
    title: "Group members changed",
    status: 409,
    detail: "Members joined or left this group meanwhile. Reload and reorder again.",
    code: "STALE_MEMBER_ORDER",
  });
}

/**
 * Renumbers a group's members `1..n` in the given order, which changes their Meshtastic short
 * names (`B1`, `B2`, ...). The request must name exactly the current members, so a concurrent
 * join or move fails instead of being silently numbered. Already issued artifacts keep the old
 * short names until members are provisioned again.
 */
export async function reorderGroupMembers(
  actor: ActorContext,
  eventId: string,
  groupId: string,
  input: ReorderGroupMembersRequest,
): Promise<EventMemberDto[]> {
  const event = await requireEventPermission(actor.principal, eventId, "members.manage");
  if (event.status === "archived") {
    throw eventArchivedProblem();
  }
  const group = await database.eventGroup.findFirst({ where: { id: groupId, eventId }, select: { id: true, shortNamePrefix: true } });
  if (group === null) {
    throw notFoundProblem();
  }
  if (!shortNameFits(group.shortNamePrefix, input.memberIds.length)) {
    throw memberIdentityConflictProblem([
      { field: "memberIds", code: "SHORT_NAME_TOO_LONG", message: "The highest number would not fit the 4-byte short name." },
    ]);
  }

  const changes = await database.$transaction(async (transaction) => {
    const members = await transaction.eventMember.findMany({ where: { eventGroupId: groupId }, select: { id: true, shortNameNumber: true } });
    const current = new Set(members.map(({ id }) => id));
    const requested = new Set(input.memberIds);
    if (requested.size !== input.memberIds.length || requested.size !== current.size || input.memberIds.some((id) => !current.has(id))) {
      throw staleOrder();
    }
    // Numbers are unique per group, so move everyone to temporary negative numbers first.
    for (const [index, id] of input.memberIds.entries()) {
      await transaction.eventMember.update({ where: { id }, data: { shortNameNumber: -(index + 1) } });
    }
    for (const [index, id] of input.memberIds.entries()) {
      await transaction.eventMember.update({ where: { id }, data: { shortNameNumber: index + 1, version: { increment: 1 } } });
    }
    const renumbered: Renumbering[] = input.memberIds.flatMap((id, index) => {
      const before = members.find((member) => member.id === id)?.shortNameNumber;
      return before === index + 1 ? [] : [{ memberId: id, from: before, to: index + 1 }];
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "event-group.members-renumbered",
        targetType: "event-group",
        targetId: groupId,
        result: "success",
        traceId: actor.traceId,
        metadata: { eventId, changes: renumbered, notifyMembers: input.notifyMembers === true },
      },
      transaction,
    );
    return renumbered;
  });
  if (input.notifyMembers === true && changes.length > 0) {
    await notifyRenumbered(eventId, group.shortNamePrefix, changes);
  }

  const rows = await database.eventMember.findMany({
    where: { eventGroupId: groupId },
    orderBy: { shortNameNumber: "asc" },
    select: eventMemberSelection,
  });
  return rows.map(toEventMemberDto);
}
