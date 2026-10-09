import { ATAK_PREFERENCE_TOPICS } from "./atak-preference-catalog.js";
import { APP_PREFERENCES, type AtakPreference } from "./atak-preferences.js";

/*
 * ATAK greys out or removes a settings item when the application preferences hold
 * `disablePreferenceItem_<item>` or `hidePreferenceItem_<item>` as Boolean `true`. `<item>` is the
 * `android:key` of the item on ATAK's settings screens: for value settings the storage key, for
 * links to other screens and for actions an ID that stores nothing. ATAK-CIV 5.5.1.10 checks both
 * in `AtakPreferenceFragment.processPreference`, which every built-in settings screen runs; hiding
 * an item also hides the items that depend on it.
 *
 * Observed in the same source, and the reason for the warnings the Web shows:
 * - only the settings screens check them; toolbars, radial menus, imported `.pref` files and other
 *   apps still change the values, so this is no protection against a determined user;
 * - they are app-wide preferences that stay on the device after the event until set to `false`;
 *   a `.pref` file cannot delete a key, so unlocking writes `false`;
 * - ATAK's settings search (`PreferenceSearchIndex.getMatch`) skips items whose hide key is
 *   `false` and still finds hidden ones.
 */

export const DISABLE_PREFIX = "disablePreferenceItem_";
export const HIDE_PREFIX = "hidePreferenceItem_";

/** A settings item without a value setting of its own, such as a link to another settings screen. */
export interface AtakScreenItem {
  id: string;
  /** Where the item is in ATAK, such as "Settings → Network". */
  area: string;
  description: string;
}

/**
 * Items of ATAK-CIV 5.5.1.10's settings screens that an event may restrict besides the catalog's
 * value keys: the main menu entries of the default (non-legacy) layout and the items for identity,
 * server connections and settings files that OpenMeshTak sets itself. Restricting one never sends
 * a value for it.
 */
export const ATAK_SCREEN_ITEMS: AtakScreenItem[] = [
  { id: "callSignAndDevicePrefs", area: "Settings", description: "Callsign and device settings menu" },
  { id: "networkPrefs", area: "Settings", description: "Network settings menu" },
  { id: "toolPrefs", area: "Settings", description: "Tool settings menu" },
  { id: "displayPrefs", area: "Settings", description: "Display settings menu" },
  { id: "controlPrefs", area: "Settings", description: "Control settings menu" },
  { id: "legacyPrefs", area: "Settings", description: "Legacy settings menu" },
  { id: "accounts", area: "Settings", description: "Accounts menu" },
  { id: "callSignPrefs", area: "Settings → Callsign and device", description: "My callsign screen" },
  { id: "devicePrefs", area: "Settings → Callsign and device", description: "Device settings screen" },
  { id: "reportingPrefs", area: "Settings → Callsign and device", description: "Reporting settings screen" },
  { id: "prefManage", area: "Settings → Callsign and device", description: "Settings management screen" },
  { id: "locationCallsign", area: "Settings → My callsign", description: "Callsign field" },
  { id: "locationTeam", area: "Settings → My callsign", description: "Team colour" },
  { id: "atakRoleTypeAction", area: "Settings → My callsign", description: "Role" },
  { id: "serverConnections", area: "Settings → Network", description: "Server connections screen" },
  { id: "networkSettings", area: "Settings → Network", description: "Network connection settings screen" },
  { id: "manageStreamingLink", area: "Settings → Network → Server connections", description: "Manage server connections" },
  { id: "manageInputsLink", area: "Settings → Network → Server connections", description: "Manage mesh inputs" },
  { id: "manageOutputsLink", area: "Settings → Network → Server connections", description: "Manage mesh outputs" },
  { id: "configureNonStreamingEncryption", area: "Settings → Network → Server connections", description: "Mesh encryption" },
  { id: "caLocation", area: "Settings → Network → Server connections", description: "Default truststore" },
  { id: "certificateLocation", area: "Settings → Network → Server connections", description: "Default client certificate" },
  { id: "default_client_credentials", area: "Settings → Network → Server connections", description: "Default sign-in credentials" },
  { id: "apiSecureServerPort", area: "Settings → Network → Server connections", description: "Secure server API port" },
  { id: "apiCertEnrollmentPort", area: "Settings → Network → Server connections", description: "Certificate enrollment port" },
  { id: "deviceProfileEnableOnConnect", area: "Settings → Network → Server connections", description: "Apply device profiles on connect" },
  { id: "certEnrollmentExport", area: "Settings → Network → Server connections", description: "Export enrolled certificates" },
  { id: "httpClientPermissiveMode", area: "Settings → Network → Server connections", description: "Relaxed TLS checks" },
  { id: "savePrefs", area: "Settings → Settings management", description: "Save settings to a file" },
  { id: "loadPrefs", area: "Settings → Settings management", description: "Load settings from a file" },
  { id: "pref_import_pref_action", area: "Settings → Settings management", description: "What to do with received settings files" },
  { id: "prepareForClone", area: "Settings → Settings management", description: "Prepare the device for cloning" },
  { id: "appMgmtEnableUpdateServer", area: "Settings → Tools → App management", description: "Use an update server" },
  { id: "atakUpdateServerUrl", area: "Settings → Tools → App management", description: "Update server address" },
];

const RESTRICTABLE_ITEMS = new Set([
  ...ATAK_PREFERENCE_TOPICS.flatMap(({ keys }) => keys.map(({ key }) => key)),
  ...ATAK_SCREEN_ITEMS.map(({ id }) => id),
]);

export interface RestrictionKey {
  kind: "disable" | "hide";
  itemId: string;
}

/** The restriction a key in ATAK's application preferences stands for, or `null` for any other key. */
export function restrictionOf(preference: string, key: string): RestrictionKey | null {
  if (preference !== APP_PREFERENCES) {
    return null;
  }
  if (key.startsWith(DISABLE_PREFIX)) {
    return { kind: "disable", itemId: key.slice(DISABLE_PREFIX.length) };
  }
  if (key.startsWith(HIDE_PREFIX)) {
    return { kind: "hide", itemId: key.slice(HIDE_PREFIX.length) };
  }
  return null;
}

/** Whether ATAK-CIV 5.5.1.10 shows an item with this ID on one of its settings screens. */
export function isRestrictableItem(itemId: string): boolean {
  return RESTRICTABLE_ITEMS.has(itemId);
}

/** The settings items a preference list restricts, normal or not, sorted. */
export function restrictedItems(entries: Array<Pick<AtakPreference, "preference" | "key">>): string[] {
  const items = new Set<string>();
  for (const entry of entries) {
    const restriction = restrictionOf(entry.preference, entry.key);
    if (restriction !== null) {
      items.add(restriction.itemId);
    }
  }
  return [...items].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Preferences that make the items normal again: both keys `false`, since a `.pref` cannot delete one. */
export function unlockPreferences(itemIds: string[]): AtakPreference[] {
  return itemIds.flatMap((itemId) => [
    { preference: APP_PREFERENCES, key: `${DISABLE_PREFIX}${itemId}`, type: "boolean" as const, value: "false" },
    { preference: APP_PREFERENCES, key: `${HIDE_PREFIX}${itemId}`, type: "boolean" as const, value: "false" },
  ]);
}
