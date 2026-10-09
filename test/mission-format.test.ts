import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DataPackage } from "../src/generated/prisma/client.js";
import type { PackageSnapshot } from "../src/modules/data-packages/package-snapshot.js";
import { changesBetween, fileChangesBetween, missionChangeNotification } from "../src/modules/missions/mission-format.js";

const file = {
  id: "c1",
  layerId: "l1",
  blobId: "b1",
  kind: "file",
  name: "Briefing",
  archivePath: "files/briefing.pdf",
  sha256: "a".repeat(64),
  size: 10,
  mediaType: "application/pdf",
};
const marker = {
  id: "0b6f8a42-3f1d-4d5e-9a1b-2c3d4e5f6a7b",
  layerId: "l1",
  kind: "point" as const,
  name: "SP 1",
  description: null,
  geometry: { type: "Point" as const, coordinates: [13.4, 52.5] },
  style: { color: "#1E88E5", strokeWidth: 3, fillOpacity: 0.25 },
  tak: null,
};

function snapshot(objects: PackageSnapshot["objects"], contents: NonNullable<PackageSnapshot["contents"]>): PackageSnapshot {
  return { schema: 2, name: "Lageplan Nord", description: null, layers: [{ id: "l1", name: "Layer 1", sortOrder: 0, visible: true }], objects, contents };
}

void describe("mission change format", () => {
  void it("reports added, replaced and removed files and items between revisions", () => {
    const at = new Date("2026-10-09T10:00:00.000Z");
    const first = snapshot([marker], [file]);
    const second = snapshot([], [{ ...file, sha256: "b".repeat(64) }]);
    assert.deepEqual(fileChangesBetween(first, second, at).map(({ type, file: { id } }) => [type, id]), [["ADD_CONTENT", "c1"]]);
    assert.deepEqual(fileChangesBetween(second, snapshot([], []), at).map(({ type }) => type), ["REMOVE_CONTENT"]);
    assert.deepEqual(changesBetween(first, second, at).map(({ type, object: { id } }) => [type, id]), [["REMOVE_CONTENT", marker.id]]);
  });

  void it("builds the t-x-m-c notification with item details and file resources", () => {
    const at = new Date("2026-10-09T10:00:00.000Z");
    const mission = { id: "11111111-2222-3333-4444-555555555555", name: "Lageplan <Nord>" } as DataPackage;
    const xml = missionChangeNotification(mission, changesBetween(null, snapshot([marker], []), at, "ANDROID-1"), at, fileChangesBetween(null, snapshot([], [file]), at));
    assert.match(xml, /type="t-x-m-c"/);
    assert.match(xml, /<mission type="CHANGE" tool="public" name="Lageplan &#60;Nord&#62;" guid="11111111-2222-3333-4444-555555555555">/);
    assert.match(xml, new RegExp(`<contentUid>${marker.id}</contentUid><creatorUid>ANDROID-1</creatorUid>`));
    assert.match(xml, /<details type="b-m-p-s-m" callsign="SP 1"[^>]*><location lat="52.5" lon="13.4"\/><\/details>/);
    assert.match(xml, /<contentResource><filename>briefing.pdf<\/filename><hash>a{64}<\/hash>/);
  });
});
