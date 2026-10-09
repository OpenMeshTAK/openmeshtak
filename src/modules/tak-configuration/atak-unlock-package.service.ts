import { strToU8, zipSync } from "fflate";
import type { Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";
import { parseConfigurationSnapshot } from "../event-configuration/configuration-snapshot.js";
import { requireReadableEvent } from "../events/event-access.js";
import { dataPackageManifest } from "../tak-server/marti/device-profile.js";
import { loadAtakPreferenceEntries } from "./atak-preference-list.service.js";
import { restrictedItems, unlockPreferences } from "./atak-preference-restrictions.js";
import { preferenceFileXml } from "./atak-preferences.js";

function nothingToUnlock(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:nothing-to-unlock",
    title: "Nothing to unlock",
    status: 409,
    detail: "This event has never greyed out or hidden an ATAK settings item.",
    code: "NOTHING_TO_UNLOCK",
  });
}

/** Every settings item the event restricts now or restricted in any published revision. */
async function everRestrictedItems(eventId: string): Promise<string[]> {
  const [current, revisions] = await Promise.all([
    loadAtakPreferenceEntries(database, eventId),
    database.eventConfigurationRevision.findMany({ where: { eventId }, select: { snapshot: true } }),
  ]);
  const published = revisions.flatMap(({ snapshot }) => parseConfigurationSnapshot(snapshot).tak?.atakPreferences ?? []);
  return restrictedItems([...current, ...published]);
}

/**
 * A Data Package that makes every ATAK settings item the event ever greyed out or hidden normal
 * again, for devices that keep these app-wide restrictions after the event. It names only item
 * IDs, never values, so it may be handed to anyone; it is built from the current list and every
 * published revision, so removing a restriction from the list does not drop it from the package.
 */
export async function createAtakUnlockPackage(principal: Principal, eventId: string): Promise<{ fileName: string; bytes: Uint8Array }> {
  const event = await requireReadableEvent(principal, eventId);
  const items = await everRestrictedItems(eventId);
  if (items.length === 0) {
    throw nothingToUnlock();
  }
  const files = {
    "preferences/openmeshtak-unlock.pref": strToU8(preferenceFileXml(unlockPreferences(items))),
    "MANIFEST/manifest.xml": strToU8(dataPackageManifest(`${event.name} ATAK unlock`, ["preferences/openmeshtak-unlock.pref"])),
  };
  return { fileName: `${event.slug}-atak-unlock.zip`, bytes: zipSync(files, { level: 6 }) };
}
