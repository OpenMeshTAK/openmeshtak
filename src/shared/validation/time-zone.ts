const ianaTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

/**
 * Returns the canonical spelling of an IANA time-zone name, or `null` when the value is not one.
 * `Intl` alone is too lenient: it accepts any casing and fixed offsets such as `+01:00`, which
 * would silently drop daylight-saving rules for event-local schedules.
 */
export function canonicalIanaTimeZone(value: string): string | null {
  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }

  return ianaTimeZones.has(resolved) || resolved === "UTC" ? resolved : null;
}
