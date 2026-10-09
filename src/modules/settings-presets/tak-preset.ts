import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { entryProblem, targetKeyOf, type PreferenceTargets } from "../tak-configuration/atak-preference-validation.js";
import type { AtakPreferenceTarget, TargetedAtakPreference } from "../tak-configuration/atak-preferences.js";
import type { PresetAtakTarget, TakPresetContent } from "./preset-document.js";
import type { PresetEntryChangeDto, PresetEntryProblemDto, PresetTargetDto } from "./settings-presets.dto.js";

/** A group or role of the target event, as offered for mapping. */
export interface MappableTarget {
  type: "group" | "role";
  id: string;
  slug: string;
  name: string;
}

export interface TakPresetPlan {
  /** The event's whole list after the import. */
  entries: TargetedAtakPreference[];
  targets: PresetTargetDto[];
  added: PresetEntryChangeDto[];
  changed: PresetEntryChangeDto[];
  unchanged: number;
  invalid: PresetEntryProblemDto[];
  skipped: number;
  /** Whether every group and role of the preset has a mapping. */
  complete: boolean;
}

export function refOf(target: { type: "group" | "role"; slug: string }): string {
  return `${target.type}:${target.slug}`;
}

function identityOf(entry: Pick<TargetedAtakPreference, "target" | "preference" | "key">): string {
  return `${targetKeyOf(entry)}\u0000${entry.preference}\u0000${entry.key}`;
}

function toTargetDto(target: AtakPreferenceTarget): PresetEntryChangeDto["target"] {
  return target.type === "event" ? { type: "event", id: null } : { type: target.type, id: target.id };
}

/** Groups and roles the preset names, with a same-slug or same-name suggestion from the event. */
function presetTargets(
  content: TakPresetContent,
  available: readonly MappableTarget[],
  mappings: ReadonlyMap<string, string | null>,
): PresetTargetDto[] {
  const byRef = new Map<string, PresetTargetDto>();
  for (const { target } of content.atakPreferences) {
    if (target.type === "event") {
      continue;
    }
    const ref = refOf(target);
    const known = byRef.get(ref);
    if (known !== undefined) {
      known.entryCount += 1;
      continue;
    }
    const name = target.name ?? target.slug;
    const sameType = available.filter(({ type }) => type === target.type);
    const suggestion =
      sameType.find(({ slug }) => slug === target.slug) ?? sameType.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    byRef.set(ref, {
      type: target.type,
      slug: target.slug,
      name,
      entryCount: 1,
      suggestedTargetId: suggestion?.id ?? null,
      ...(mappings.has(ref) ? { mapping: { targetId: mappings.get(ref) ?? null } } : {}),
    });
  }
  return [...byRef.values()];
}

function resolveTarget(target: PresetAtakTarget, mappings: ReadonlyMap<string, string | null>): AtakPreferenceTarget | null | undefined {
  if (target.type === "event") {
    return { type: "event" };
  }
  const ref = refOf(target);
  if (!mappings.has(ref)) {
    return undefined;
  }
  const id = mappings.get(ref) ?? null;
  return id === null ? null : { type: target.type, id };
}

/**
 * Dry run of merging a TAK preset into an event's ATAK preference list. Each preset entry replaces
 * the event's entry for the same target and key; other entries, including member-specific ones,
 * stay. Group and role entries apply only through an explicit mapping; until every one is mapped
 * the plan is incomplete and cannot be applied.
 */
export function planTakPreset(
  content: TakPresetContent,
  current: readonly TargetedAtakPreference[],
  eventTargets: PreferenceTargets,
  available: readonly MappableTarget[],
  mappings: ReadonlyMap<string, string | null>,
): TakPresetPlan {
  const currentByIdentity = new Map(current.map((entry) => [identityOf(entry), entry]));
  const imported = new Map<string, TargetedAtakPreference>();
  const plan: TakPresetPlan = {
    entries: [],
    targets: presetTargets(content, available, mappings),
    added: [],
    changed: [],
    unchanged: 0,
    invalid: [],
    skipped: 0,
    complete: true,
  };

  for (const entry of content.atakPreferences) {
    const target = resolveTarget(entry.target, mappings);
    if (target === undefined) {
      plan.complete = false;
      continue;
    }
    if (target === null) {
      plan.skipped += 1;
      continue;
    }
    const targeted: TargetedAtakPreference = { target, preference: entry.preference, key: entry.key, type: entry.type, value: entry.value };
    const problem = entryProblem(targeted, eventTargets);
    if (problem !== null) {
      plan.invalid.push({ target: entry.target, key: entry.key, message: problem.message });
      continue;
    }
    const identity = identityOf(targeted);
    if (imported.has(identity)) {
      plan.invalid.push({ target: entry.target, key: entry.key, message: "The preset sets this key twice for the same target; the first value is used." });
      continue;
    }
    imported.set(identity, targeted);
    const existing = currentByIdentity.get(identity);
    const change: PresetEntryChangeDto = {
      target: toTargetDto(target),
      preference: entry.preference,
      key: entry.key,
      type: entry.type,
      from: existing?.value ?? null,
      to: entry.value,
    };
    if (existing === undefined) {
      plan.added.push(change);
    } else if (existing.type === entry.type && existing.value === entry.value) {
      plan.unchanged += 1;
    } else {
      plan.changed.push(change);
    }
  }

  plan.entries = [...current.filter((entry) => !imported.has(identityOf(entry))), ...imported.values()];
  return plan;
}

/** Mappings must name a group or role of the target event of the same type. */
export function mappingProblems(
  mappings: ReadonlyArray<{ type: "group" | "role"; slug: string; targetId: string | null }>,
  eventTargets: PreferenceTargets,
): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  const seen = new Set<string>();
  mappings.forEach((mapping, index) => {
    const ref = refOf(mapping);
    if (seen.has(ref)) {
      problems.push({ field: `mappings[${String(index)}].slug`, code: "DUPLICATE", message: "This group or role is mapped twice." });
    }
    seen.add(ref);
    const ids = mapping.type === "group" ? eventTargets.groupIds : eventTargets.roleIds;
    if (mapping.targetId !== null && !ids.has(mapping.targetId)) {
      problems.push({
        field: `mappings[${String(index)}].targetId`,
        code: "UNKNOWN_REFERENCE",
        message: `Choose a ${mapping.type} of this event.`,
      });
    }
  });
  return problems;
}

/**
 * Checks a library preset without an event: catalog keys and types, owned and secret keys, and
 * member-only values, which never belong in a portable preset.
 */
export function libraryTakProblems(content: TakPresetContent): ProblemFieldError[] {
  const anyTarget: PreferenceTargets = { groupIds: new Set(["preset"]), roleIds: new Set(["preset"]), memberIds: new Set() };
  const problems: ProblemFieldError[] = [];
  const seen = new Set<string>();
  content.atakPreferences.forEach((entry, index) => {
    const target: AtakPreferenceTarget = entry.target.type === "event" ? { type: "event" } : { type: entry.target.type, id: "preset" };
    const targeted: TargetedAtakPreference = { ...entry, target };
    const problem = entryProblem(targeted, anyTarget);
    if (problem !== null) {
      problems.push({ ...problem, field: `document.tak.atakPreferences[${String(index)}].${problem.field}` });
      return;
    }
    const identity = `${entry.target.type === "event" ? "event" : refOf(entry.target)}\u0000${entry.preference}\u0000${entry.key}`;
    if (seen.has(identity)) {
      problems.push({ field: `document.tak.atakPreferences[${String(index)}].key`, code: "DUPLICATE", message: "This key is already set for the same target." });
    }
    seen.add(identity);
  });
  return problems;
}
