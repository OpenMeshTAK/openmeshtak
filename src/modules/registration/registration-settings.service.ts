import { recordAudit } from "../../shared/audit/audit.js";
import { requirePermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { isUniqueConstraintError } from "../../shared/database/unique-constraint.js";
import { versionConflictProblem } from "../../shared/errors/problem-error.js";
import type { RegistrationMode, RegistrationSettingsDto, UpdateRegistrationSettingsRequest } from "./registration.dto.js";

const SETTINGS_ID = "registration";

function toMode(value: string): RegistrationMode {
  return value === "invite" || value === "open" ? value : "closed";
}

async function loadRegistrationSettings(): Promise<RegistrationSettingsDto> {
  const row = await database.registrationSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row === null ? { mode: "closed", version: 0 } : { mode: toMode(row.mode), version: row.version };
}

/** Public: the sign-in page needs it to decide whether to offer "Create account". */
export async function registrationMode(): Promise<RegistrationMode> {
  return (await loadRegistrationSettings()).mode;
}

export async function getRegistrationSettings(principal: Principal): Promise<RegistrationSettingsDto> {
  await requirePermission(principal, "registration.manage");
  return loadRegistrationSettings();
}

/** Opening registration lets strangers create accounts, so every change is audited. Requires `registration.manage`. */
export async function updateRegistrationSettings(
  actor: ActorContext,
  input: UpdateRegistrationSettingsRequest,
): Promise<RegistrationSettingsDto> {
  await requirePermission(actor.principal, "registration.manage");
  await database.$transaction(async (transaction) => {
    if (input.version === 0) {
      try {
        await transaction.registrationSettings.create({ data: { id: SETTINGS_ID, mode: input.mode } });
      } catch (error: unknown) {
        throw isUniqueConstraintError(error) ? versionConflictProblem((await loadRegistrationSettings()).version) : error;
      }
    } else {
      const updated = await transaction.registrationSettings.updateMany({
        where: { id: SETTINGS_ID, version: input.version },
        data: { mode: input.mode, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw versionConflictProblem((await loadRegistrationSettings()).version);
      }
    }
    await recordAudit(
      {
        actor: actor.principal,
        action: "registration-settings.updated",
        targetType: "registration-settings",
        targetId: SETTINGS_ID,
        result: "success",
        traceId: actor.traceId,
        metadata: { mode: input.mode },
      },
      transaction,
    );
  });
  return loadRegistrationSettings();
}
