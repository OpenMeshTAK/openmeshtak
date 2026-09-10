import { randomUUID } from "node:crypto";
import { INSTANCE_SCOPE_KEY, PERMISSIONS } from "../../shared/auth/permissions.js";
import { database } from "../../shared/database/database.js";
import { logger } from "../../shared/logging/logger.js";

/** The Admin group created during setup. It always holds every permission instance-wide. */
export const ADMINISTRATORS_SYSTEM_KEY = "administrators";

/**
 * Grants permissions added to the catalog after setup to the Admin group. Without this, a new
 * release would leave no one able to delegate the new permission. Runs at startup and is a no-op
 * when nothing is missing.
 */
export async function ensureAdministratorGrants(): Promise<void> {
  const group = await database.userGroup.findUnique({
    where: { systemKey: ADMINISTRATORS_SYSTEM_KEY },
    select: { id: true, permissionGrants: { select: { permission: true, scopeKey: true } } },
  });
  if (group === null) {
    return;
  }

  const held = new Set(
    group.permissionGrants
      .filter(({ scopeKey }) => scopeKey === INSTANCE_SCOPE_KEY)
      .map(({ permission }) => permission),
  );
  const missing = PERMISSIONS.filter((permission) => !held.has(permission));
  if (missing.length === 0) {
    return;
  }

  await database.permissionGrant.createMany({
    data: missing.map((permission) => ({
      id: randomUUID(),
      userGroupId: group.id,
      permission,
      scopeKey: INSTANCE_SCOPE_KEY,
    })),
  });
  logger.info(
    { event: "administrator_grants_added", permissions: missing },
    "Added new permissions to the Admin group",
  );
}
