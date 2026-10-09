import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATAK_PREFERENCE_TOPICS, BLOCKED_ATAK_PREFERENCES } from "../src/modules/tak-configuration/atak-preference-catalog.js";
import { listProblems } from "../src/modules/tak-configuration/atak-preference-validation.js";
import {
  mergeAtakPreferences,
  parseAtakPreferenceFile,
  resolveAtakPreferences,
  type TargetedAtakPreference,
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

  void it("lets the most specific entry win for a member, and a later event override an earlier one", () => {
    const app = "com.atakmap.app_preferences";
    const entries: TargetedAtakPreference[] = [
      { target: { type: "member", id: "peter" }, preference: app, key: "coord_display_pref", type: "string", value: "UTM" },
      { target: { type: "event" }, preference: app, key: "coord_display_pref", type: "string", value: "MGRS" },
      { target: { type: "group", id: "bravo" }, preference: app, key: "coord_display_pref", type: "string", value: "DD" },
      { target: { type: "role", id: "leader" }, preference: app, key: "coord_display_pref", type: "string", value: "DMS" },
      { target: { type: "event" }, preference: app, key: "rab_rng_units_pref", type: "string", value: "1" },
    ];
    const value = (recipient: { memberId: string; eventRoleId: string; eventGroupId: string }) =>
      resolveAtakPreferences(entries, recipient).find(({ key }) => key === "coord_display_pref")?.value;
    assert.equal(value({ memberId: "peter", eventRoleId: "leader", eventGroupId: "bravo" }), "UTM");
    assert.equal(value({ memberId: "anna", eventRoleId: "leader", eventGroupId: "bravo" }), "DMS");
    assert.equal(value({ memberId: "anna", eventRoleId: "participant", eventGroupId: "bravo" }), "DD");
    assert.equal(value({ memberId: "anna", eventRoleId: "participant", eventGroupId: "charlie" }), "MGRS");

    const event = resolveAtakPreferences(entries, { memberId: "anna", eventRoleId: "participant", eventGroupId: "charlie" });
    const merged = mergeAtakPreferences(event, [{ preference: app, key: "rab_rng_units_pref", type: "string", value: "2" }]);
    assert.equal(merged.find(({ key }) => key === "rab_rng_units_pref")?.value, "2");
    assert.equal(merged.find(({ key }) => key === "coord_display_pref")?.value, "MGRS");
  });

  void it("checks entries against ATAK's types and values and keeps owned keys out", () => {
    const app = "com.atakmap.app_preferences";
    const targets = { groupIds: new Set(["bravo"]), roleIds: new Set<string>(), memberIds: new Set(["peter"]) };
    const entry = (key: string, type: TargetedAtakPreference["type"], value: string, target: TargetedAtakPreference["target"] = { type: "event" }) =>
      ({ target, preference: app, key, type, value }) satisfies TargetedAtakPreference;
    const problems = listProblems(
      [
        entry("coord_display_pref", "string", "MGRS"),
        entry("coord_display_pref", "string", "XYZ", { type: "group", id: "bravo" }),
        entry("alt_display_agl", "string", "true"),
        entry("constantReportingRateReliable", "string", "fast"),
        entry("locationCallsign", "string", "ADMIN"),
        entry("saEmailAddress", "string", "a@example.org"),
        entry("saEmailAddress", "string", "a@example.org", { type: "member", id: "peter" }),
        entry("myPluginKey", "integer", "3"),
        entry("myPluginKey", "integer", "3"),
        entry("otherPluginKey", "boolean", "yes"),
        entry("map_zoom_visible", "boolean", "true", { type: "role", id: "missing" }),
      ],
      targets,
    );
    assert.deepEqual(
      problems.map(({ field, code }) => [field, code]),
      [
        ["entries[1].value", "INVALID_VALUE"],
        ["entries[2].type", "TYPE_MISMATCH"],
        ["entries[3].value", "INVALID_VALUE"],
        ["entries[4].key", "OWNED_KEY"],
        ["entries[5].target", "MEMBER_ONLY"],
        ["entries[8].key", "DUPLICATE"],
        ["entries[9].value", "INVALID_VALUE"],
        ["entries[10].target", "UNKNOWN_REFERENCE"],
      ],
    );
  });

  void it("ships a catalog whose defaults fit its own types and values", () => {
    const keys = ATAK_PREFERENCE_TOPICS.flatMap(({ keys }) => keys);
    assert.equal(new Set(keys.map(({ key }) => key)).size, keys.length, "every key appears once");
    assert.ok(keys.every(({ group }) => group.trim() !== ""), "every key belongs to a subgroup");
    for (const known of keys) {
      const fits =
        known.defaultValue === null ||
        (known.values?.some(({ value }) => value === known.defaultValue) ?? true) &&
          (known.type !== "boolean" || ["true", "false"].includes(known.defaultValue));
      assert.ok(fits, `${known.key} has a default ATAK would not accept`);
    }
    assert.ok(!keys.some(({ key }) => BLOCKED_ATAK_PREFERENCES.some((blocked) => blocked.key === key)), "blocked keys are not offered");
  });
});
