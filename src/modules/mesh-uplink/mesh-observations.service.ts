import { randomUUID } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { requireEventPermission } from "../events/event-access.js";
import { loadMeshtasticConfiguration } from "../meshtastic-configuration/current-configuration.js";
import { cotRouter, type CotRouter, type LiveItem, type LiveMeshItem } from "../tak-server/streaming/cot-router.js";
import { trafficRecorder, type RecordedMeshPosition } from "../tak-server/traffic-recording.js";
import { memberCotUid } from "./member-cot-uid.js";
import { nodeIdOf, unboundNodeUid } from "./mesh-node-id.js";
import type {
  MeshObservationBatchRequest,
  MeshObservationBatchResultDto,
  MeshObservationDto,
  MeshObservationResultDto,
} from "./mesh-observation.dto.js";
import {
  displayText,
  parseInstant,
  positionIntervalSeconds,
  positionTime,
  precisionCe,
  receiveTimeProblem,
  staleAfterMs,
  takPositionCovers,
} from "./mesh-observation-rules.js";
import { claimPackets, packetKey, releasePackets } from "./mesh-packet-receipts.js";

const POSITION_INTERVAL_FIELD = "config.position.positionBroadcastSecs";
const BOUND_TYPE = "a-f-G-U-C";
/** Unknown affiliation: Core cannot say who carries a node nobody is bound to. */
const UNBOUND_TYPE = "a-u-G";

/** An observation that passed the checks, with its parsed times. */
interface Observation {
  index: number;
  input: MeshObservationDto;
  nodeId: string;
  receivedAt: Date;
  packetTime: Date | null;
}

/** What Core knows about a node after this batch. */
interface NodeState {
  shortName: string | null;
  longName: string | null;
  memberId: string | null;
}

interface BoundMemberInfo {
  memberId: string;
  userId: string;
  callsign: string;
}

function eventNotActiveProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:event-not-active",
    title: "Event is not active",
    status: 409,
    detail: "Mesh observations are accepted only for active events.",
    code: "EVENT_NOT_ACTIVE",
  });
}

function meshtasticDisabledProblem(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:meshtastic-disabled",
    title: "Meshtastic is off for this event",
    status: 409,
    detail: "Turn on Meshtastic for the event before uploading mesh observations.",
    code: "MESHTASTIC_DISABLED",
  });
}

function rejected(code: string): MeshObservationResultDto {
  return { status: "rejected", code };
}

/** Checks one observation; returns why it is unusable, or the parsed observation. */
function check(input: MeshObservationDto, index: number, now: Date): Observation | MeshObservationResultDto {
  const receivedAt = parseInstant(input.receivedAt);
  if (receivedAt === null) {
    return rejected("INVALID_TIME");
  }
  const timeProblem = receiveTimeProblem(receivedAt, now);
  if (timeProblem !== null) {
    return rejected(timeProblem);
  }
  if (input.kind === "position") {
    if (input.position === undefined) {
      return rejected("NO_POSITION");
    }
    // Meshtastic sends 0,0 while a node has no fix.
    if (input.position.lat === 0 && input.position.lon === 0) {
      return rejected("NO_FIX");
    }
  }
  const packetTime = input.packetTime === undefined ? null : parseInstant(input.packetTime);
  return { index, input, nodeId: nodeIdOf(input.nodeNum), receivedAt, packetTime };
}

function latest(a: Date | null, b: Date): Date {
  return a === null || b > a ? b : a;
}

/**
 * Stores what the batch says about each node: when it was last heard and, from packets at least as
 * new as the stored ones, the names it announced. Uplink updates leave the binding version alone,
 * so an operator binding a node is never refused because the node keeps talking.
 */
async function updateNodes(eventId: string, observations: readonly Observation[]): Promise<Map<string, NodeState>> {
  const byNode = new Map<string, Observation[]>();
  for (const observation of observations) {
    byNode.set(observation.nodeId, [...(byNode.get(observation.nodeId) ?? []), observation]);
  }
  const existing = await database.meshtasticNode.findMany({
    where: { eventId, nodeId: { in: [...byNode.keys()] } },
    select: { nodeId: true, shortName: true, longName: true, lastHeardAt: true, lastPositionAt: true, memberId: true },
  });
  const stored = new Map(existing.map((row) => [row.nodeId, row]));
  const states = new Map<string, NodeState>();
  for (const [nodeId, list] of byNode) {
    const row = stored.get(nodeId);
    let shortName = row?.shortName ?? null;
    let longName = row?.longName ?? null;
    let lastHeardAt = row?.lastHeardAt ?? null;
    let lastPositionAt = row?.lastPositionAt ?? null;
    for (const { input, receivedAt } of [...list].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())) {
      if (lastHeardAt === null || receivedAt >= lastHeardAt) {
        shortName = displayText(input.shortName) ?? shortName;
        longName = displayText(input.longName) ?? longName;
      }
      lastHeardAt = latest(lastHeardAt, receivedAt);
      if (input.kind === "position") {
        lastPositionAt = latest(lastPositionAt, receivedAt);
      }
    }
    const data = { shortName, longName, lastHeardAt, lastPositionAt };
    await database.meshtasticNode.upsert({
      where: { eventId_nodeId: { eventId, nodeId } },
      create: { id: randomUUID(), eventId, nodeId, ...data },
      update: data,
    });
    states.set(nodeId, { shortName, longName, memberId: row?.memberId ?? null });
  }
  return states;
}

async function boundMembers(eventId: string, nodes: ReadonlyMap<string, NodeState>): Promise<Map<string, BoundMemberInfo>> {
  const memberIds = [...nodes.values()].flatMap(({ memberId }) => (memberId === null ? [] : [memberId]));
  const rows = await database.eventMember.findMany({ where: { eventId, id: { in: memberIds } }, select: { id: true, userId: true, callsign: true } });
  return new Map(rows.map(({ id, userId, callsign }) => [id, { memberId: id, userId, callsign }]));
}

/** Seconds between two position reports the event's radios are configured for. */
async function eventPositionInterval(eventId: string): Promise<number> {
  const configuration = await loadMeshtasticConfiguration(database, eventId);
  return positionIntervalSeconds(configuration.settings[POSITION_INTERVAL_FIELD]);
}

/**
 * When the members' TAK apps reported their own positions around the batch: the newest report the
 * router saw, plus, for late uploads, the recorded ones of an event that records.
 */
async function takPositionTimes(
  eventId: string,
  userIds: readonly string[],
  times: readonly Date[],
  intervalSeconds: number,
  router: CotRouter,
): Promise<Map<string, Date[]>> {
  const result = new Map<string, Date[]>();
  for (const userId of userIds) {
    const device = router.latestDevice(eventId, userId);
    result.set(userId, device === null ? [] : [device.lastEventTime]);
  }
  if (userIds.length === 0 || times.length === 0 || !(await trafficRecorder.isRecording(eventId))) {
    return result;
  }
  const marginMs = intervalSeconds * 1000;
  const earliest = Math.min(...times.map((time) => time.getTime()));
  const newest = Math.max(...times.map((time) => time.getTime()));
  const recorded = await database.takTrafficItem.findMany({
    where: {
      eventId,
      source: "tak",
      selfReported: true,
      userId: { in: [...userIds] },
      time: { gte: new Date(earliest - marginMs), lte: new Date(newest + marginMs) },
    },
    select: { userId: true, time: true },
  });
  for (const { userId, time } of recorded) {
    if (userId !== null) {
      result.get(userId)?.push(time);
    }
  }
  return result;
}

function channelOf(input: MeshObservationDto): LiveMeshItem["mesh"]["channel"] {
  return input.channel === undefined ? null : { index: input.channel.index, name: displayText(input.channel.name) };
}

interface PositionPlan {
  live: LiveMeshItem[];
  recorded: RecordedMeshPosition[];
  takPreferred: Set<number>;
}

/**
 * Turns accepted positions into CoT items: bound nodes under the member's CoT UID, unbound ones
 * under a node-derived UID typed as unknown. A bound member's mesh position is dropped when the
 * member's TAK app reported a position within the event's position interval: one track per member,
 * and TAK is the more precise source.
 */
async function planPositions(
  eventId: string,
  positions: readonly Observation[],
  nodes: ReadonlyMap<string, NodeState>,
  hq: { id: string; name: string | null },
  router: CotRouter,
): Promise<PositionPlan> {
  const plan: PositionPlan = { live: [], recorded: [], takPreferred: new Set() };
  if (positions.length === 0) {
    return plan;
  }
  const intervalSeconds = await eventPositionInterval(eventId);
  const members = await boundMembers(eventId, nodes);
  const times = positions.map(({ receivedAt, packetTime }) => positionTime(receivedAt, packetTime));
  const takTimes = await takPositionTimes(eventId, [...new Set([...members.values()].map(({ userId }) => userId))], times, intervalSeconds, router);
  const uids = new Map<string, string>();

  for (const [position, time] of positions.map((observation, index) => [observation, times[index] as Date] as const)) {
    const node = nodes.get(position.nodeId) as NodeState;
    const member = node.memberId === null ? undefined : members.get(node.memberId);
    if (member !== undefined && (takTimes.get(member.userId) ?? []).some((takTime) => takPositionCovers(takTime, time, intervalSeconds))) {
      plan.takPreferred.add(position.index);
      continue;
    }
    let uid = unboundNodeUid(position.nodeId);
    if (member !== undefined) {
      uid = uids.get(member.memberId) ?? (await memberCotUid(eventId, member, router));
      uids.set(member.memberId, uid);
    }
    const coordinates = position.input.position as NonNullable<MeshObservationDto["position"]>;
    const item: LiveItem = {
      uid,
      type: member === undefined ? UNBOUND_TYPE : BOUND_TYPE,
      callsign: member?.callsign ?? node.longName ?? node.shortName ?? position.nodeId,
      lat: coordinates.lat,
      lon: coordinates.lon,
      course: coordinates.groundTrack ?? null,
      speed: coordinates.groundSpeed ?? null,
      time,
      stale: new Date(time.getTime() + staleAfterMs(intervalSeconds)),
    };
    const userId = member?.userId ?? null;
    plan.recorded.push({
      item,
      ce: precisionCe(coordinates.precisionBits),
      userId,
      nodeId: position.nodeId,
      hqId: hq.id,
      hqName: hq.name,
      receivedAt: position.receivedAt,
    });
    plan.live.push({
      item,
      eventId,
      userId,
      mesh: {
        nodeId: position.nodeId,
        shortName: node.shortName,
        longName: node.longName,
        memberId: member?.memberId ?? null,
        hqId: hq.id,
        hqName: hq.name,
        receivedAt: position.receivedAt,
        batteryLevel: position.input.batteryLevel ?? null,
        snr: position.input.snr ?? null,
        rssi: position.input.rssi ?? null,
        hopsAway: position.input.hopsAway ?? null,
        channel: channelOf(position.input),
      },
    });
  }
  return plan;
}

function summary(results: readonly MeshObservationResultDto[], recorded: number): MeshObservationBatchResultDto {
  const count = (status: MeshObservationResultDto["status"]): number => results.filter((result) => result.status === status).length;
  return {
    accepted: count("accepted"),
    duplicates: count("duplicate"),
    takPreferred: count("tak-preferred"),
    rejected: count("rejected"),
    recorded,
    results: [...results],
  };
}

/**
 * Takes a batch of Meshtastic packets an HQ heard (`mesh-uplink.send`, active Meshtastic events
 * only). Each packet is processed once per event, whichever HQ uploads it and however often.
 * Positions reach the live view and, when the event records, the recording; never TAK apps. The
 * batch is audited with counts only: positions are personal data and stay out of audit and logs.
 */
export async function ingestMeshObservations(
  actor: ActorContext,
  eventId: string,
  input: MeshObservationBatchRequest,
  router: CotRouter = cotRouter,
  now = new Date(),
): Promise<MeshObservationBatchResultDto> {
  const event = await requireEventPermission(actor.principal, eventId, "mesh-uplink.send");
  if (event.status !== "active") {
    throw eventNotActiveProblem();
  }
  if (!event.meshtasticEnabled) {
    throw meshtasticDisabledProblem();
  }
  const hq = { id: input.hqId.toLowerCase(), name: displayText(input.hqName) };
  const results: MeshObservationResultDto[] = [];
  const candidates: Observation[] = [];
  input.observations.forEach((observation, index) => {
    const checked = check(observation, index, now);
    if ("status" in checked) {
      results[index] = checked;
    } else {
      candidates.push(checked);
    }
  });

  const claimed = await claimPackets(eventId, candidates.map(({ nodeId, input: { packetId } }) => ({ nodeId, packetId })));
  const fresh: Observation[] = [];
  for (const candidate of candidates) {
    const key = packetKey({ nodeId: candidate.nodeId, packetId: candidate.input.packetId });
    if (claimed.delete(key)) {
      fresh.push(candidate);
    } else {
      results[candidate.index] = { status: "duplicate" };
    }
  }

  let plan: PositionPlan;
  let recorded: number;
  try {
    const nodes = fresh.length === 0 ? new Map<string, NodeState>() : await updateNodes(eventId, fresh);
    plan = await planPositions(eventId, fresh.filter(({ input: { kind } }) => kind === "position"), nodes, hq, router);
    recorded = await trafficRecorder.recordMesh(eventId, plan.recorded);
  } catch (error: unknown) {
    // Nothing was acknowledged: let the HQ's retry process these packets instead of calling them duplicates.
    await releasePackets(eventId, fresh.map(({ nodeId, input: { packetId } }) => ({ nodeId, packetId })));
    throw error;
  }
  for (const entry of plan.live) {
    router.rememberMesh(entry, now);
  }
  for (const { index } of fresh) {
    results[index] = plan.takPreferred.has(index) ? { status: "tak-preferred" } : { status: "accepted" };
  }

  const result = summary(results, recorded);
  await recordAudit({
    actor: actor.principal,
    action: "mesh-uplink.batch-received",
    targetType: "event",
    targetId: eventId,
    result: "success",
    traceId: actor.traceId,
    metadata: {
      hqId: hq.id,
      observations: input.observations.length,
      accepted: result.accepted,
      duplicates: result.duplicates,
      takPreferred: result.takPreferred,
      rejected: result.rejected,
      recorded,
    },
  });
  return result;
}
