import { database } from "../database/database.js";
import { validationProblem, type ProblemFieldError } from "../errors/problem-error.js";
import { forbidden, hasPermission } from "./permission-check.js";
import { scopeKeyFor, supportsEventScope, type Permission } from "./permissions.js";
import type { Principal } from "./principal.js";

export interface PermissionGrantInput {
  permission: Permission;
  /** `null` grants the permission instance-wide. */
  eventId: string | null;
}

export interface ValidatedGrant extends PermissionGrantInput {
  scopeKey: string;
}

/**
 * Rejects duplicates, unsupported event scopes and unknown events. Permission names themselves
 * are already restricted to the catalog by the generated request validation.
 */
export async function validatePermissionGrants(
  grants: PermissionGrantInput[],
  fieldPrefix = "permissions",
): Promise<ValidatedGrant[]> {
  const errors: ProblemFieldError[] = [];
  const seen = new Set<string>();
  const eventIds = [...new Set(grants.flatMap(({ eventId }) => (eventId === null ? [] : [eventId])))];
  const existingEvents = await database.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true },
  });
  const existingEventIds = new Set(existingEvents.map(({ id }) => id));

  const validated = grants.map((grant, index) => {
    const field = `${fieldPrefix}[${String(index)}]`;
    const scopeKey = scopeKeyFor(grant.eventId);
    const identity = `${grant.permission}|${scopeKey}`;

    if (seen.has(identity)) {
      errors.push({ field, code: "DUPLICATE", message: "This grant is listed more than once." });
    }
    seen.add(identity);

    if (grant.eventId !== null && !supportsEventScope(grant.permission)) {
      errors.push({
        field: `${field}.eventId`,
        code: "SCOPE_NOT_SUPPORTED",
        message: "This permission can only be granted instance-wide.",
      });
    } else if (grant.eventId !== null && !existingEventIds.has(grant.eventId)) {
      errors.push({
        field: `${field}.eventId`,
        code: "NOT_FOUND",
        message: "The referenced event does not exist.",
      });
    }

    return { ...grant, scopeKey };
  });

  if (errors.length > 0) {
    throw validationProblem(errors);
  }

  return validated;
}

/**
 * Prevents privilege escalation: an actor may only hand out grants it holds itself at the same
 * or a wider scope. Grants that already exist on the target are not re-checked, so an actor can
 * still edit an account that carries permissions the actor lacks without removing them.
 */
export async function requireDelegableGrants(
  actor: Principal,
  grants: ValidatedGrant[],
  existingScopeIdentities: ReadonlySet<string> = new Set(),
): Promise<void> {
  for (const grant of grants) {
    if (existingScopeIdentities.has(`${grant.permission}|${grant.scopeKey}`)) {
      continue;
    }

    if (!(await hasPermission(actor, grant.permission, grant.eventId))) {
      throw forbidden();
    }
  }
}
