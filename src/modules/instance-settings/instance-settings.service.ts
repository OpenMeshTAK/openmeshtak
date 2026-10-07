import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { validationProblem, versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { InstanceSettingsDto, UpdateInstanceSettingsRequest } from "./instance-settings.dto.js";

const SETTINGS_ID = "instance";
const DEFAULT_NAME = "OpenMeshTak";

export async function getInstanceSettings(): Promise<InstanceSettingsDto> {
  const row = await database.instanceSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row === null ? { name: DEFAULT_NAME, version: 0 } : { name: row.name, version: row.version };
}

/** The name account emails and the Web app show for this installation. */
export async function instanceName(): Promise<string> {
  return (await getInstanceSettings()).name;
}

/** Requires instance-wide `settings.manage`. */
export async function updateInstanceSettings(actor: ActorContext, input: UpdateInstanceSettingsRequest): Promise<InstanceSettingsDto> {
  await requirePermission(actor.principal, "settings.manage");
  // Collapse line breaks and runs of spaces: the name ends up in email subjects and the page title.
  const name = input.name.replace(/\s+/g, " ").trim();
  if (name === "") {
    throw validationProblem([{ field: "name", code: "REQUIRED", message: "Enter a name." }]);
  }
  await database.$transaction(async (transaction) => {
    if (input.version === 0) {
      try {
        await transaction.instanceSettings.create({ data: { id: SETTINGS_ID, name } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await getInstanceSettings()).version) : error;
      }
    } else {
      const updated = await transaction.instanceSettings.updateMany({
        where: { id: SETTINGS_ID, version: input.version },
        data: { name, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await getInstanceSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "instance-settings.updated",
        targetType: "instance-settings",
        targetId: SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: { name },
      },
      transaction,
    );
  });
  return getInstanceSettings();
}
