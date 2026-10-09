import type { Response } from "express";
import { recordAudit } from "../../../shared/audit/audit.js";
import type { TakAccess } from "../tak-access.js";
import { loadTakServerSettings } from "../tak-server-settings.js";
import { buildDeviceProfile, profilePackages, type ProfileKind } from "./device-profile.js";
import { memberAtakPreferences } from "./member-atak-preferences.js";

/**
 * Answers a device-profile request: a Data Package with the member's chosen packages and event
 * preferences, or 204 when nothing needs installing. Every delivered package is audited like a
 * download.
 */
export async function sendDeviceProfile(
  response: Response,
  userId: string,
  access: TakAccess,
  kind: ProfileKind,
  changedSince: Date | null,
): Promise<void> {
  const packages = await profilePackages(userId, access, kind, changedSince);
  // The public Marti port from the settings, never the container's listen port.
  const { martiPort } = await loadTakServerSettings();
  // Enrollment always applies the current preferences; a connection only when they changed.
  const preferences = await memberAtakPreferences(userId, kind === "enrollment" ? null : changedSince);
  const profile = await buildDeviceProfile(kind, packages, martiPort, preferences.changed ? preferences.entries : null);
  if (profile === null) {
    response.status(204).end();
    return;
  }
  for (const { dataPackage, latest } of packages) {
    await recordAudit({
      actor: { type: "user", id: userId },
      action: "data-package.downloaded",
      targetType: "data-package",
      targetId: dataPackage.id,
      result: "success",
      metadata: { eventId: dataPackage.eventId, revision: latest.number, via: `tak-${kind}-profile` },
    });
  }
  response.type("application/zip").attachment(`openmeshtak-${kind}-profile.zip`).send(Buffer.from(profile));
}
