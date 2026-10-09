import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_ATAK_SETTINGS,
  effectiveAtakPreferences,
  mergeAtakPreferences,
  parseAtakPreferenceFile,
} from "../src/modules/tak-configuration/atak-preferences.js";
import { ProblemError } from "../src/shared/errors/problem-error.js";

/** Shaped like ATAK's own preference export, including the exporting person's connection and identity. */
const exported = `<?xml version='1.0' standalone='yes'?>
<preferences>
  <preference version="1" name="cot_streams">
    <entry key="count" class="class java.lang.Integer">1</entry>
    <entry key="connectString0" class="class java.lang.String">tak.example.org:8089:ssl</entry>
  </preference>
  <preference version="1" name="com.atakmap.app_preferences">
    <entry key="coord_display_pref" class="class java.lang.String">DD</entry>
    <entry key="alt_display_agl" class="class java.lang.Boolean">true</entry>
    <entry key="locationCallsign" class="class java.lang.String">ADMIN</entry>
    <entry key="locationTeam" class="class java.lang.String">Cyan</entry>
    <entry key="clientPassword" class="class java.lang.String">secret</entry>
    <entry key="certificateLocation" class="class java.lang.String">cert/admin.p12</entry>
    <entry key="apiSecureServerPort" class="class java.lang.String">8443</entry>
  </preference>
</preferences>`;

void describe("ATAK preferences", () => {
  void it("keeps the file's settings and removes the connection, certificates, passwords and identity", () => {
    const { entries, removedKeys } = parseAtakPreferenceFile(exported);
    assert.deepEqual(entries, [
      { preference: "com.atakmap.app_preferences", key: "coord_display_pref", type: "string", value: "DD" },
      { preference: "com.atakmap.app_preferences", key: "alt_display_agl", type: "boolean", value: "true" },
    ]);
    assert.deepEqual(removedKeys.sort(), [
      "apiSecureServerPort",
      "certificateLocation",
      "clientPassword",
      "connectString0",
      "count",
      "locationCallsign",
      "locationTeam",
    ]);
  });

  void it("rejects files that are not ATAK preference files", () => {
    assert.throws(() => parseAtakPreferenceFile("<map/>"), ProblemError);
    assert.throws(() => parseAtakPreferenceFile('<!DOCTYPE x [<!ENTITY a "b">]><preferences/>'), ProblemError);
    assert.throws(
      () => parseAtakPreferenceFile('<preferences><preference name="x"><entry key="a" class="class java.io.File">/</entry></preference></preferences>'),
      ProblemError,
    );
  });

  void it("lets the form override the file, and a later event override an earlier one", () => {
    const { entries } = parseAtakPreferenceFile(exported);
    const event = effectiveAtakPreferences(entries, { ...EMPTY_ATAK_SETTINGS, coordinateFormat: "MGRS", distanceUnit: "metric" });
    assert.deepEqual(
      event.map(({ key, value }) => [key, value]),
      [
        ["alt_display_agl", "true"],
        ["coord_display_pref", "MGRS"],
        ["rab_rng_units_pref", "1"],
      ],
    );

    const later = effectiveAtakPreferences([], { ...EMPTY_ATAK_SETTINGS, distanceUnit: "nautical" });
    const merged = mergeAtakPreferences(event, later);
    assert.equal(merged.find(({ key }) => key === "rab_rng_units_pref")?.value, "2");
    assert.equal(merged.find(({ key }) => key === "coord_display_pref")?.value, "MGRS");
  });
});
