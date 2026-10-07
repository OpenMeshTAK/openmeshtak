import type { Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import { requireEventPermission } from "../events/event-access.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import type { UserDto } from "./user.dto.js";
import { toUserDto, userSelection } from "./users.service.js";

/**
 * Event accounts exist for one event and are deleted when it is archived, so short-lived
 * participants do not pile up as permanent users. Permanent accounts have no account event.
 */

/** Accounts created for an event are event accounts unless the event keeps its accounts. */
export function accountEventIdFor(event: { id: string; permanentAccounts: boolean }): string | null {
  return event.permanentAccounts ? null : event.id;
}

export interface EndedEventAccounts {
  deleted: number;
  /** Still members of another event that is not archived; they now end with that event. */
  moved: number;
}

/**
 * Runs inside the archive transition. Deleting the Better Auth subject ends sign-in, sessions and
 * passkeys; deleting the domain user removes memberships, tokens and client certificates, and the
 * TAK connection recheck then closes live connections within seconds.
 */
export async function endEventAccounts(
  transaction: Prisma.TransactionClient,
  eventId: string,
): Promise<EndedEventAccounts> {
  const accounts = await transaction.domainUser.findMany({
    where: { accountEventId: eventId },
    select: {
      id: true,
      authSubjectId: true,
      eventMemberships: {
        where: { eventId: { not: eventId }, event: { status: { not: "archived" } } },
        select: { eventId: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  let moved = 0;
  const deleted: typeof accounts = [];
  for (const account of accounts) {
    const nextEvent = account.eventMemberships[0];
    if (nextEvent === undefined) {
      deleted.push(account);
    } else {
      await transaction.domainUser.update({ where: { id: account.id }, data: { accountEventId: nextEvent.eventId } });
      moved += 1;
    }
  }

  const authSubjectIds = deleted.flatMap(({ authSubjectId }) => (authSubjectId === null ? [] : [authSubjectId]));
  await transaction.user.deleteMany({ where: { id: { in: authSubjectIds } } });
  await transaction.domainUser.deleteMany({ where: { id: { in: deleted.map(({ id }) => id) } } });
  return { deleted: deleted.length, moved };
}

/**
 * Keeps an event account when its event is archived. Requires `event-accounts.manage` for the
 * account's event; permanent accounts need it instance-wide and are returned unchanged.
 */
export async function makeUserPermanent(actor: ActorContext, userId: string): Promise<UserDto> {
  await requirePermission(actor.principal, "users.read");
  const user = await database.domainUser.findUnique({ where: { id: userId }, select: { accountEventId: true } });
  if (user === null) {
    throw notFoundProblem();
  }
  await requirePermission(actor.principal, "event-accounts.manage", user.accountEventId);
  if (user.accountEventId !== null) {
    await database.$transaction(async (transaction) => {
      await transaction.domainUser.update({
        where: { id: userId },
        data: { accountEventId: null, version: { increment: 1 } },
      });
      await recordAudit(
        {
          actor: actor.principal,
          action: "user.made-permanent",
          targetType: "user",
          targetId: userId,
          result: "success",
          traceId: actor.traceId,
          metadata: { eventId: user.accountEventId },
        },
        transaction,
      );
    });
  }
  return toUserDto(await database.domainUser.findUniqueOrThrow({ where: { id: userId }, select: userSelection }));
}

/**
 * Turns every current event account of the event into a permanent account, e.g. before archiving
 * an event whose participants should keep their logins. Requires `event-accounts.manage` for the event.
 */
export async function makeEventAccountsPermanent(actor: ActorContext, eventId: string): Promise<number> {
  await requireEventPermission(actor.principal, eventId, "event-accounts.manage");
  return database.$transaction(async (transaction) => {
    const { count } = await transaction.domainUser.updateMany({
      where: { accountEventId: eventId },
      data: { accountEventId: null, version: { increment: 1 } },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "event.accounts-made-permanent",
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: { accounts: count },
      },
      transaction,
    );
    return count;
  });
}
