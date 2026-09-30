import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XMLParser } from "fast-xml-parser";
import { kmlColor, snapshotToKml } from "../src/modules/data-packages/kml-export.js";
import type { PackageSnapshot } from "../src/modules/data-packages/package-snapshot.js";

const style = { color: "#FF8000", strokeWidth: 3, fillOpacity: 0.5 };

const snapshot = {
  name: "Game <Area> & more",
  layers: [
    { id: "base", name: "Base", sortOrder: 0, visible: true },
    { id: "top", name: "Top", sortOrder: 1, visible: false },
  ],
  objects: [
    { id: "p1", layerId: "top", kind: "point", name: "HQ", description: null, geometry: { type: "Point", coordinates: [11.6, 52.4, 50] }, style, tak: null },
    { id: "l1", layerId: "base", kind: "line", name: "Road", description: "Main road", geometry: { type: "LineString", coordinates: [[11, 52], [11.1, 52.1]] }, style, tak: null },
    { id: "c1", layerId: "base", kind: "circle", name: "Zone", description: null, geometry: { type: "Circle", coordinates: [11.5, 52.5], radius: 100 }, style, tak: null },
  ],
  contents: [],
} as unknown as PackageSnapshot;

type Node = Record<string, unknown>;

function parse(kml: string): Node {
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: (name) => ["Folder", "Placemark"].includes(name) }).parse(kml) as Node;
}

void describe("KML export", () => {
  void it("converts CSS colours to KML aabbggrr with opacity", () => {
    assert.equal(kmlColor("#FF8000"), "ff0080ff");
    assert.equal(kmlColor("#FF8000", 0.5), "800080ff");
  });

  void it("writes one folder per layer, top layer first, with styled placemarks", () => {
    const document = (parse(snapshotToKml(snapshot)).kml as Node).Document as Node;
    assert.equal(document.name, "Game <Area> & more", "escaped and parsed back unchanged");
    const folders = document.Folder as Node[];
    assert.deepEqual(folders.map((folder) => [folder.name, folder.visibility]), [["Top", 0], ["Base", 1]]);

    const [point] = folders[0]?.Placemark as Node[];
    assert.equal((point?.Point as Node).coordinates, "11.6,52.4,50", "altitude kept");
    assert.equal(((point?.Style as Node).IconStyle as Node).color, "ff0080ff");

    const [line, zone] = folders[1]?.Placemark as Node[];
    assert.equal(line?.description, "Main road");
    const ring = (((zone?.Polygon as Node).outerBoundaryIs as Node).LinearRing as Node).coordinates as string;
    assert.equal(ring.split(" ").length, 65, "circles become closed 64-sided polygons");
    assert.equal(((zone?.Style as Node).PolyStyle as Node).color, "800080ff");
  });
});
