import type { Request, Response } from "express";
import { database } from "../../../shared/database/database.js";
import type { AuthenticatedTakClient } from "../client-authentication.js";
import { groupDirectionKey } from "../streaming/cot-scope.js";
import { takGroupActivity } from "../tak-group-activity.js";

type Locals = { client: AuthenticatedTakClient };

const MAX_CLIENT_UID_LENGTH = 200;

/** One direction of one TAK group, as ATAK lists it. */
interface GroupEntry {
  groupId: string;
  name: string;
  description: string;
  direction: "IN" | "OUT";
  created: Date;
}

/**
 * The caller's TAK groups in events that use the advanced group mode and show groups in the app.
 * Each assignment becomes one entry per direction, like TAK Server lists them.
 */
async function groupEntries(client: AuthenticatedTakClient): Promise<GroupEntry[]> {
  const memberships = await database.takGroupMembership.findMany({
    where: {
      member: { userId: client.userId, eventId: { in: client.access.eventIds } },
      group: { event: { takConfiguration: { groupMode: "advanced", groupsInApp: true } } },
    },
    include: { group: { include: { event: { select: { name: true } } } } },
    orderBy: [{ group: { createdAt: "asc" } }, { groupId: "asc" }],
  });
  return memberships.flatMap(({ group, receive, send }) => {
    const base = { groupId: group.id, name: group.name, description: group.description ?? group.event.name, created: group.createdAt };
    return [...(receive ? [{ ...base, direction: "IN" as const }] : []), ...(send ? [{ ...base, direction: "OUT" as const }] : [])];
  });
}

function directionKey(entry: Pick<GroupEntry, "groupId" | "direction">): string {
  return groupDirectionKey(entry.groupId, entry.direction === "IN" ? "in" : "out");
}

function clientUidOf(request: Request): string | null {
  const uid = request.query.clientUid;
  return typeof uid === "string" && uid.length > 0 && uid.length <= MAX_CLIENT_UID_LENGTH ? uid : null;
}

/**
 * `GET /Marti/api/groups/all`: ATAK reads `name`, `direction`, `created` (UTC `yyyy-MM-dd`),
 * `type`, `bitpos` and `active` (see ATAK-CIV `ServerGroup`). Switched-off groups are reported for
 * the device in `clientUid` when ATAK sends it; otherwise every group is active.
 */
export async function allGroups(request: Request, response: Response<unknown, Locals>): Promise<void> {
  const { client } = response.locals;
  const inactive = takGroupActivity.inactiveFor(client.userId, clientUidOf(request));
  const data = (await groupEntries(client)).map((entry, index) => ({
    name: entry.name,
    direction: entry.direction,
    created: entry.created.toISOString().slice(0, 10),
    type: "SYSTEM",
    bitpos: index,
    active: !inactive.has(directionKey(entry)),
    description: entry.description,
  }));
  response.json({ version: "3", type: "com.bbn.marti.remote.groups.Group", data, nodeId: "openmeshtak" });
}

/**
 * `PUT /Marti/api/groups/active?clientUid=`: the app sends its group list with `active` flags.
 * Entries are matched by name and direction; a group can only be switched off, never added.
 */
export function setActiveGroups(request: Request, response: Response<unknown, Locals>): Promise<void> {
  return (async () => {
    const { client } = response.locals;
    const clientUid = clientUidOf(request);
    const body: unknown = request.body;
    if (clientUid === null || !Array.isArray(body)) {
      response.status(400).end();
      return;
    }
    const switchedOff = new Set(
      body
        .filter((item): item is { name: string; direction: string; active: boolean } => typeof item === "object" && item !== null && (item as { active?: unknown }).active === false)
        .map(({ name, direction }) => `${String(name)}\u0000${String(direction)}`),
    );
    const entries = await groupEntries(client);
    const inactive = new Set(entries.filter((entry) => switchedOff.has(`${entry.name}\u0000${entry.direction}`)).map(directionKey));
    takGroupActivity.set(client.userId, clientUid, inactive);
    response.status(200).end();
  })();
}
