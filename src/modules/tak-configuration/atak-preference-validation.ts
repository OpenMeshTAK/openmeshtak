import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { ATAK_PREFERENCE_TOPICS, BLOCKED_ATAK_PREFERENCES, type AtakCatalogKey } from "./atak-preference-catalog.js";
import {
  APP_PREFERENCES,
  isOwnedKey,
  isOwnedPreferenceGroup,
  MAX_KEY_LENGTH,
  MAX_VALUE_LENGTH,
  type TargetedAtakPreference,
} from "./atak-preferences.js";

const CATALOG = new Map<string, AtakCatalogKey>(ATAK_PREFERENCE_TOPICS.flatMap(({ keys }) => keys.map((entry) => [entry.key, entry])));
const BLOCKED_REASONS = new Map(BLOCKED_ATAK_PREFERENCES.map(({ key, reason }) => [key, reason]));

/** The catalog entry of a key in ATAK's application preferences, if ATAK's own screens define it. */
export function catalogKey(preference: string, key: string): AtakCatalogKey | undefined {
  return preference === APP_PREFERENCES ? CATALOG.get(key) : undefined;
}

/** Groups, roles and members of the event an entry may target. */
export interface PreferenceTargets {
  groupIds: ReadonlySet<string>;
  roleIds: ReadonlySet<string>;
  memberIds: ReadonlySet<string>;
}

const NUMBER = /^-?\d+(\.\d+)?$/;
const INTEGER = /^-?\d+$/;

/** Checks the value against the stored class; ATAK fails to read a value of the wrong class. */
function valueProblem(entry: TargetedAtakPreference): string | null {
  switch (entry.type) {
    case "boolean":
      return entry.value === "true" || entry.value === "false" ? null : "Use true or false.";
    case "integer":
    case "long":
      return INTEGER.test(entry.value) ? null : "Use a whole number.";
    case "float":
      return NUMBER.test(entry.value) ? null : "Use a number.";
    case "string":
      return null;
  }
}

function catalogProblem(entry: TargetedAtakPreference, known: AtakCatalogKey): Omit<ProblemFieldError, "field"> | null {
  if (entry.type !== known.type) {
    return { code: "TYPE_MISMATCH", message: `ATAK stores this key as ${known.type}.` };
  }
  if (known.values !== null && !known.values.some(({ value }) => value === entry.value)) {
    return { code: "INVALID_VALUE", message: "Choose one of the listed values." };
  }
  if (known.numeric && !NUMBER.test(entry.value)) {
    return { code: "INVALID_VALUE", message: "ATAK reads this value as a number." };
  }
  if (known.use === "member" && entry.target.type !== "member") {
    return { code: "MEMBER_ONLY", message: "This personal value can only be set for one member." };
  }
  return null;
}

/** The first problem of one entry, with a field name relative to the entry. */
export function entryProblem(entry: TargetedAtakPreference, targets: PreferenceTargets): ProblemFieldError | null {
  if (entry.preference.trim() === "" || entry.preference.length > MAX_KEY_LENGTH) {
    return { field: "preference", code: "INVALID_VALUE", message: "Enter a preference group of at most 200 characters." };
  }
  if (entry.key.trim() === "" || entry.key.length > MAX_KEY_LENGTH) {
    return { field: "key", code: "INVALID_VALUE", message: "Enter a key of at most 200 characters." };
  }
  if (isOwnedPreferenceGroup(entry.preference) || isOwnedKey(entry.key)) {
    const reason = BLOCKED_REASONS.get(entry.key) ?? "OpenMeshTak sets this key itself or it holds a secret";
    return { field: "key", code: "OWNED_KEY", message: `${reason}.` };
  }
  if (entry.value.length > MAX_VALUE_LENGTH) {
    return { field: "value", code: "INVALID_VALUE", message: "The value is too long." };
  }
  const typeProblem = valueProblem(entry);
  if (typeProblem !== null) {
    return { field: "value", code: "INVALID_VALUE", message: typeProblem };
  }
  const known = catalogKey(entry.preference, entry.key);
  const problem = known === undefined ? null : catalogProblem(entry, known);
  if (problem !== null) {
    return { field: problem.code === "TYPE_MISMATCH" ? "type" : problem.code === "MEMBER_ONLY" ? "target" : "value", ...problem };
  }
  const { target } = entry;
  const exists =
    target.type === "event" ||
    (target.type === "group" && targets.groupIds.has(target.id)) ||
    (target.type === "role" && targets.roleIds.has(target.id)) ||
    (target.type === "member" && targets.memberIds.has(target.id));
  return exists ? null : { field: "target", code: "UNKNOWN_REFERENCE", message: "Choose a group, role or member of this event." };
}

export function targetKeyOf(entry: Pick<TargetedAtakPreference, "target">): string {
  return entry.target.type === "event" ? "event" : `${entry.target.type}:${entry.target.id}`;
}

/** Every problem of a whole list, with fields such as `entries[3].value`. */
export function listProblems(entries: TargetedAtakPreference[], targets: PreferenceTargets): ProblemFieldError[] {
  const problems: ProblemFieldError[] = [];
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    const problem = entryProblem(entry, targets);
    if (problem !== null) {
      problems.push({ ...problem, field: `entries[${String(index)}].${problem.field}` });
      return;
    }
    const identity = `${targetKeyOf(entry)}\u0000${entry.preference}\u0000${entry.key}`;
    if (seen.has(identity)) {
      problems.push({ field: `entries[${String(index)}].key`, code: "DUPLICATE", message: "This key is already set for the same target." });
    }
    seen.add(identity);
  });
  return problems;
}
