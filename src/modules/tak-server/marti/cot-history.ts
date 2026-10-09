import type { Request, Response } from "express";
import type { Prisma, TakTrafficItem } from "../../../generated/prisma/client.js";
import { recordAudit } from "../../../shared/audit/audit.js";
import { database } from "../../../shared/database/database.js";
import type { AuthenticatedTakClient } from "../client-authentication.js";

/** Most items one history request returns, newest first. */
const MAX_HISTORY_ITEMS = 1000;
const MAX_UID_LENGTH = 200;

type Locals = { client: AuthenticatedTakClient };

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => `&#${String(character.charCodeAt(0))};`);
}

/**
 * A recorded item as CoT. Core records only uid, type, position, callsign and times, so this is
 * the item's position report, not its original detail; height and accuracy are unknown.
 */
function itemXml(item: TakTrafficItem): string {
  const contact = item.callsign === null ? "" : `<contact callsign="${escapeXml(item.callsign)}"/>`;
  return (
    `<event version="2.0" uid="${escapeXml(item.uid)}" type="${escapeXml(item.type)}" how="m-g" time="${item.time.toISOString()}" ` +
    `start="${item.time.toISOString()}" stale="${item.stale.toISOString()}">` +
    `<point lat="${String(item.lat)}" lon="${String(item.lon)}" hae="9999999.0" ce="9999999.0" le="9999999.0"/>` +
    `<detail>${contact}</detail></event>`
  );
}

/** The caller's active events that currently record their traffic; history exists only there. */
async function recordingEventIds(client: AuthenticatedTakClient): Promise<string[]> {
  const rows = await database.takTrafficRecording.findMany({
    where: { enabled: true, eventId: { in: client.access.eventIds } },
    select: { eventId: true },
  });
  return rows.map(({ eventId }) => eventId);
}

/**
 * Which recorded items the caller may read: everything of events it sees completely, and in events
 * that separate TAK groups only items it would have received live: from its own event group (simple
 * mode) or from members sending into a group it receives from (advanced mode), and from roles that
 * see every group.
 */
async function visibleItems(client: AuthenticatedTakClient, eventIds: string[]): Promise<Prisma.TakTrafficItemWhereInput> {
  const conditions = await Promise.all(
    eventIds.map(async (eventId): Promise<Prisma.TakTrafficItemWhereInput> => {
      const view = client.access.views[eventId];
      if (view === undefined || view.seesAll) {
        return { eventId };
      }
      // Advanced mode: senders that send into a group the caller receives from; simple mode: the caller's event group.
      const sameGroup =
        view.receives === null
          ? { eventGroupId: view.groupId ?? "" }
          : { takGroups: { some: { send: true, groupId: { in: view.receives } } } };
      const hidden = await database.eventMember.findMany({
        where: { eventId, eventRole: { seesAllTakGroups: false }, NOT: sameGroup },
        select: { userId: true },
      });
      return { eventId, userId: { notIn: hidden.map(({ userId }) => userId) } };
    }),
  );
  return { OR: conditions };
}

function requestedUid(request: Request): string | null {
  const uid = request.params.uid;
  return typeof uid === "string" && uid.length > 0 && uid.length <= MAX_UID_LENGTH ? uid : null;
}

function timeParameter(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const date = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The time window of a history request: `secago`, or `start` and `end`; without them, everything recorded. */
function window(request: Request): { gte?: Date; lte?: Date } | null {
  const secago = request.query.secago;
  if (secago !== undefined) {
    const seconds = Number(secago);
    return Number.isFinite(seconds) && seconds > 0 ? { gte: new Date(Date.now() - seconds * 1000) } : null;
  }
  const from = timeParameter(request.query.start);
  const to = timeParameter(request.query.end);
  if (from === null || to === null) {
    return null;
  }
  return { ...(from === undefined ? {} : { gte: from }), ...(to === undefined ? {} : { lte: to }) };
}

async function audit(client: AuthenticatedTakClient, uid: string, eventIds: string[], count: number): Promise<void> {
  await recordAudit({
    actor: { type: "user", id: client.userId },
    action: "tak-traffic.history-queried",
    targetType: "tak-item",
    targetId: uid,
    result: "success",
    metadata: { eventIds, count, certificateId: client.certificate.id },
  });
}

/** `GET /Marti/api/cot/xml/{uid}`: the latest recorded state of one item. */
export async function latestCot(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const uid = requestedUid(request);
  const eventIds = uid === null ? [] : await recordingEventIds(client);
  const item =
    uid === null || eventIds.length === 0
      ? null
      : await database.takTrafficItem.findFirst({ where: { uid, ...(await visibleItems(client, eventIds)) }, orderBy: { time: "desc" } });
  if (uid === null || item === null) {
    response.status(404).end();
    return;
  }
  await audit(client, uid, eventIds, 1);
  response.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>${itemXml(item)}`);
}

/** `GET /Marti/api/cot/xml/{uid}/all`: an item's recorded history, newest first. */
export async function cotHistory(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const uid = requestedUid(request);
  const range = window(request);
  if (uid === null || range === null) {
    response.status(400).end();
    return;
  }
  const eventIds = await recordingEventIds(client);
  const items =
    eventIds.length === 0
      ? []
      : await database.takTrafficItem.findMany({
          where: { uid, time: range, ...(await visibleItems(client, eventIds)) },
          orderBy: { time: "desc" },
          take: MAX_HISTORY_ITEMS,
        });
  await audit(client, uid, eventIds, items.length);
  response.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><events>${items.map(itemXml).join("")}</events>`);
}
