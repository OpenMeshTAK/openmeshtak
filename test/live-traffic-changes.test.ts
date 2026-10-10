import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fingerprint, trafficChanges } from "../src/modules/tak-server/live-traffic-changes.js";
import type { LiveTakTrafficDto } from "../src/modules/tak-server/live-traffic.dto.js";

const connection = {
  id: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
  userDisplayName: "Alpha",
  eventGroup: null,
  eventRole: null,
  callsign: "ALPHA",
  connectedAt: "2026-10-10T10:00:00.000Z",
  lastSeenAt: "2026-10-10T10:00:01.000Z",
};

function traffic(lastSeenAt: string, callsign = "ALPHA"): LiveTakTrafficDto {
  return { connections: [{ ...connection, callsign, lastSeenAt }], items: [] };
}

void describe("live traffic changes", () => {
  void it("does not resend a connection whose last-seen time only ticked within the resolution", () => {
    const sent = fingerprint(traffic("2026-10-10T10:00:01.000Z"));
    assert.equal(trafficChanges(sent, traffic("2026-10-10T10:00:20.000Z")), null);
    assert.equal(trafficChanges(sent, traffic("2026-10-10T10:00:31.000Z"))?.connections.upserted.length, 1);
  });

  void it("sends changed and removed connections", () => {
    const sent = fingerprint(traffic("2026-10-10T10:00:01.000Z"));
    assert.equal(trafficChanges(sent, traffic("2026-10-10T10:00:01.000Z", "ALPHA-2"))?.connections.upserted[0]?.callsign, "ALPHA-2");
    assert.deepEqual(trafficChanges(sent, { connections: [], items: [] })?.connections.removed, [connection.id]);
  });
});
