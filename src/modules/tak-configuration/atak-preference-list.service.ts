import { randomUUID } from "node:crypto";
import type { AtakPreferenceEntry, Prisma } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import { eventAccessFor, forbidden } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import { requireMutableEvent, requireReadableEvent } from "../events/event-access.js";
import { ATAK_PREFERENCE_TOPICS, BLOCKED_ATAK_PREFERENCES } from "./atak-preference-catalog.js";
import { ATAK_SCREEN_ITEMS } from "./atak-preference-restrictions.js";
import type {
  AtakPreferenceCatalogDto,
  AtakPreferenceEntryDto,
  AtakPreferenceListDto,
  ImportAtakPreferencesRequest,
  ImportAtakPreferencesResponse,
  ReplaceAtakPreferencesRequest,
  SkippedAtakPreferenceDto,
} from "./atak-preference-list.dto.js";
import { entryProblem, listProblems, targetKeyOf, type PreferenceTargets } from "./atak-preference-validation.js";
import {
  MAX_ENTRIES,
  mergeAtakPreferences,
  parseAtakPreferenceFile,
  type AtakPreferenceTarget,
  type AtakPreferenceType,
  type TargetedAtakPreference,
} from "./atak-preferences.js";

type EntryClient = Pick<Prisma.TransactionClient, "atakPreferenceEntry">;

const SPECIFICITY = { event: 0, group: 1, role: 2, member: 3 } as const;

/** Code-point order, independent of the server's locale, so snapshot hashes stay stable. */
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function targetOf(row: AtakPreferenceEntry): AtakPreferenceTarget {
  if (row.eventGroupId !== null) {
    return { type: "group", id: row.eventGroupId };
  }
  if (row.eventRoleId !== null) {
    return { type: "role", id: row.eventRoleId };
  }
  if (row.eventMemberId !== null) {
    return { type: "member", id: row.eventMemberId };
  }
  return { type: "event" };
}

/**
 * The event's entries in a fixed order (target kind, target, group, key), so the same list always
 * serializes to the same configuration snapshot.
 */
export async function loadAtakPreferenceEntries(client: EntryClient, eventId: string): Promise<TargetedAtakPreference[]> {
  const rows = await client.atakPreferenceEntry.findMany({ where: { eventId } });
  return rows
    .map((row) => ({ target: targetOf(row), preference: row.preference, key: row.key, type: row.type as AtakPreferenceType, value: row.value }))
    .sort(
      (a, b) =>
        SPECIFICITY[a.target.type] - SPECIFICITY[b.target.type] ||
        compareText(targetKeyOf(a), targetKeyOf(b)) ||
        compareText(a.preference, b.preference) ||
        compareText(a.key, b.key),
    );
}

function toEntryDto(entry: TargetedAtakPreference): AtakPreferenceEntryDto {
  const { target, preference, key, type, value } = entry;
  return { target: target.type === "event" ? { type: "event", id: null } : { type: target.type, id: target.id }, preference, key, type, value };
}

function fromEntryDto(entry: AtakPreferenceEntryDto): TargetedAtakPreference {
  const { target, preference, key, type, value } = entry;
  // A target without an ID never matches a group, role or member and fails validation.
  return { target: target.type === "event" ? { type: "event" } : { type: target.type, id: target.id ?? "" }, preference, key, type, value };
}

async function toListDto(eventId: string): Promise<AtakPreferenceListDto> {
  const [list, entries] = await Promise.all([
    database.atakPreferenceList.findUnique({ where: { eventId } }),
    loadAtakPreferenceEntries(database, eventId),
  ]);
  return {
    eventId,
    entries: entries.map(toEntryDto),
    version: list?.version ?? 0,
    updatedAt: list?.updatedAt.toISOString() ?? null,
  };
}

async function eventTargets(eventId: string): Promise<PreferenceTargets> {
  const [groups, roles, members] = await Promise.all([
    database.eventGroup.findMany({ where: { eventId }, select: { id: true } }),
    database.eventRole.findMany({ where: { eventId }, select: { id: true } }),
    database.eventMember.findMany({ where: { eventId }, select: { id: true } }),
  ]);
  return {
    groupIds: new Set(groups.map(({ id }) => id)),
    roleIds: new Set(roles.map(({ id }) => id)),
    memberIds: new Set(members.map(({ id }) => id)),
  };
}

export async function getAtakPreferences(principal: Principal, eventId: string): Promise<AtakPreferenceListDto> {
  await requireReadableEvent(principal, eventId);
  return toListDto(eventId);
}

/** Replaces the whole list in one versioned step and audits how many entries it holds, not their values. */
async function saveList(
  actor: ActorContext,
  eventId: string,
  version: number,
  entries: TargetedAtakPreference[],
  audit: { action: string; metadata: Prisma.InputJsonObject },
): Promise<void> {
  await database.$transaction(async (transaction) => {
    if (version === 0) {
      try {
        await transaction.atakPreferenceList.create({ data: { eventId } });
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
        const latest = await transaction.atakPreferenceList.findUnique({ where: { eventId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
    } else {
      const updated = await transaction.atakPreferenceList.updateMany({ where: { eventId, version }, data: { version: { increment: 1 } } });
      if (updated.count !== 1) {
        const latest = await transaction.atakPreferenceList.findUnique({ where: { eventId } });
        throw versionConflictProblem(latest?.version ?? 0);
      }
    }
    await transaction.atakPreferenceEntry.deleteMany({ where: { eventId } });
    await transaction.atakPreferenceEntry.createMany({
      data: entries.map((entry) => ({
        id: randomUUID(),
        eventId,
        targetKey: targetKeyOf(entry),
        eventGroupId: entry.target.type === "group" ? entry.target.id : null,
        eventRoleId: entry.target.type === "role" ? entry.target.id : null,
        eventMemberId: entry.target.type === "member" ? entry.target.id : null,
        preference: entry.preference,
        key: entry.key,
        type: entry.type,
        value: entry.value,
      })),
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: audit.action,
        targetType: "event",
        targetId: eventId,
        result: "success",
        traceId: actor.traceId,
        metadata: audit.metadata,
      },
      transaction,
    );
  });
}

/**
 * Replaces the event's ATAK preferences. Values are not audited, because they may contain
 * anything an administrator's ATAK had set. Members get changes once a revision is published.
 */
export async function replaceAtakPreferences(
  actor: ActorContext,
  eventId: string,
  input: ReplaceAtakPreferencesRequest,
): Promise<AtakPreferenceListDto> {
  await requireMutableEvent(actor.principal, eventId);
  const malformedTargets = input.entries.flatMap((entry, index) =>
    entry.target.type === "event" && entry.target.id !== null
      ? [{ field: `entries[${String(index)}].target.id`, code: "INVALID_VALUE", message: "The whole-event target has no ID." }]
      : [],
  );
  const entries = input.entries.map(fromEntryDto);
  const problems = [...malformedTargets, ...listProblems(entries, await eventTargets(eventId))];
  if (problems.length > 0) {
    throw validationProblem(problems);
  }
  await saveList(actor, eventId, input.version, entries, {
    action: "tak-configuration.atak-preferences-updated",
    metadata: { entryCount: entries.length },
  });
  return toListDto(eventId);
}

/**
 * Imports a `.pref` file such as ATAK's settings export into the list as event-wide entries,
 * replacing event-wide entries of the same key. Keys OpenMeshTak owns and entries that do not fit
 * ATAK's own type or values are left out and reported.
 */
export async function importAtakPreferences(
  actor: ActorContext,
  eventId: string,
  input: ImportAtakPreferencesRequest,
): Promise<ImportAtakPreferencesResponse> {
  await requireMutableEvent(actor.principal, eventId);
  const { entries: parsed, removedKeys } = parseAtakPreferenceFile(input.content);
  const targets = await eventTargets(eventId);
  const imported: TargetedAtakPreference[] = [];
  const invalidKeys: SkippedAtakPreferenceDto[] = [];
  for (const entry of mergeAtakPreferences(parsed)) {
    const targeted: TargetedAtakPreference = { ...entry, target: { type: "event" } };
    const problem = entryProblem(targeted, targets);
    if (problem === null) {
      imported.push(targeted);
    } else {
      invalidKeys.push({ key: entry.key, message: problem.message });
    }
  }
  const importedKeys = new Set(imported.map((entry) => `${entry.preference}\u0000${entry.key}`));
  const kept = (await loadAtakPreferenceEntries(database, eventId)).filter(
    (entry) => entry.target.type !== "event" || !importedKeys.has(`${entry.preference}\u0000${entry.key}`),
  );
  const entries = [...kept, ...imported];
  if (entries.length > MAX_ENTRIES) {
    throw validationProblem([{ field: "content", code: "TOO_MANY_ENTRIES", message: `The list would hold more than ${String(MAX_ENTRIES)} entries.` }]);
  }
  await saveList(actor, eventId, input.version, entries, {
    action: "tak-configuration.atak-preferences-imported",
    metadata: { importedCount: imported.length, removedCount: removedKeys.length, invalidCount: invalidKeys.length },
  });
  return { list: await toListDto(eventId), importedCount: imported.length, removedKeys, invalidKeys };
}

/** Readers of any event may see the catalog; it names ATAK keys and holds no event data. */
export async function getAtakPreferenceCatalog(principal: Principal): Promise<AtakPreferenceCatalogDto> {
  const access = await eventAccessFor(principal, "events.read");
  if (!access.all && access.eventIds.length === 0) {
    throw forbidden();
  }
  return { atakVersion: "5.5.1.10", topics: ATAK_PREFERENCE_TOPICS, screenItems: ATAK_SCREEN_ITEMS, blockedKeys: BLOCKED_ATAK_PREFERENCES };
}
