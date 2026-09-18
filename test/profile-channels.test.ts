import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SnapshotChannel } from "../src/modules/event-configuration/configuration-snapshot.js";
import { resolveProfileChannels } from "../src/modules/profiles/profile-channels.js";

const none = { groupIds: [], roleIds: [], memberIds: [] };

function channel(id: string, overrides: Partial<SnapshotChannel> = {}): SnapshotChannel {
  return {
    id,
    name: id,
    uplinkEnabled: false,
    downlinkEnabled: false,
    positionPrecision: 0,
    secret: false,
    pskVersion: 1,
    audience: none,
    keyHolders: none,
    ...overrides,
  };
}

const channels = [
  channel("event"),
  channel("bravo", { audience: { ...none, groupIds: ["bravo"] } }),
  channel("command", {
    secret: true,
    audience: { ...none, groupIds: ["bravo"] },
    keyHolders: { ...none, roleIds: ["leader"] },
  }),
  channel("staff", { audience: { ...none, memberIds: ["staff-member"] } }),
];

const withheld = new Map(channels.map(({ id }) => [id, { released: false }]));

function summary(
  recipient: { memberId: string; eventRoleId: string; eventGroupId: string },
  live = withheld,
): string[] {
  return resolveProfileChannels(channels, live, recipient).map(
    ({ name, delivery, keyHolder }) => `${name}:${delivery}${keyHolder ? ":holder" : ""}`,
  );
}

void describe("profile channel resolution", () => {
  void it("gives everyone the primary channel and only matching members a secondary one", () => {
    assert.deepEqual(summary({ memberId: "m1", eventRoleId: "participant", eventGroupId: "alpha" }), [
      "event:included",
    ]);
    assert.deepEqual(
      summary({ memberId: "staff-member", eventRoleId: "participant", eventGroupId: "alpha" }),
      ["event:included", "staff:included"],
    );
  });

  void it("withholds secret channels from everyone but key holders in the audience", () => {
    assert.deepEqual(summary({ memberId: "m2", eventRoleId: "participant", eventGroupId: "bravo" }), [
      "event:included",
      "bravo:included",
      "command:on-site",
    ]);
    assert.deepEqual(summary({ memberId: "m3", eventRoleId: "leader", eventGroupId: "bravo" }), [
      "event:included",
      "bravo:included",
      "command:included:holder",
    ]);
    // A key-holder role outside the audience receives nothing.
    assert.deepEqual(summary({ memberId: "m4", eventRoleId: "leader", eventGroupId: "alpha" }), [
      "event:included",
    ]);
  });

  void it("includes released secret channels and skips deleted ones", () => {
    const live = new Map(withheld);
    live.set("command", { released: true });
    live.delete("bravo");

    assert.deepEqual(summary({ memberId: "m2", eventRoleId: "participant", eventGroupId: "bravo" }, live), [
      "event:included",
      "command:included",
    ]);
  });
});
