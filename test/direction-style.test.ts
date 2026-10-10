import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertGeoJson, snapshotToGeoJson } from "../src/modules/data-packages/geojson.js";
import { completeStyle, directionStyleProblems } from "../src/modules/data-packages/object-style.js";
import { objectToCot } from "../src/modules/data-packages/atak/cot-export.js";
import { snapshotToKml } from "../src/modules/data-packages/kml-export.js";
import type { PackageGeometry, PackageObjectStyle } from "../src/modules/data-packages/package-object.dto.js";
import type { PackageSnapshot } from "../src/modules/data-packages/package-snapshot.js";

const line: PackageGeometry = { type: "LineString", coordinates: [[8, 50], [8.1, 50.1], [8.2, 50]] };
const style: PackageObjectStyle = { color: "#123456", strokeWidth: 3, fillOpacity: 0, arrowHeads: "both", arrowHeadSize: 24 };
const object = { id: "arrow", layerId: "layer", kind: "line" as const, name: "Direction", description: "Plan", geometry: line, style, tak: null };
const snapshot: PackageSnapshot = { schema: 3, name: "Plan", description: null, layers: [{ id: "layer", name: "Layer", visible: true, sortOrder: 0 }], objects: [object] };

void describe("direction presentation", () => {
  void it("keeps pre-existing objects undecorated", () => {
    const { arrowHeads, routeDirectionArrows } = completeStyle({ color: "#123456", strokeWidth: 3, fillOpacity: 0 });
    assert.equal(arrowHeads, "none");
    assert.equal(routeDirectionArrows, false);
  });
  void it("round-trips line geometry and arrow presentation through GeoJSON", () => {
    const converted = convertGeoJson(snapshotToGeoJson(snapshot), style);
    assert.deepEqual(converted.candidates[0]?.style, { ...style, strokeStyle: "solid", fillColor: null });
    assert.deepEqual(converted.candidates[0]?.geometry, line);
  });
  void it("keeps route identities, cues and direction presentation in GeoJSON", () => {
    const route: PackageGeometry = { type: "Route", coordinates: [[8, 50], [8.1, 50.1]], points: [
      { id: "a", type: "waypoint", name: "Start", remarks: "" }, { id: "b", type: "checkpoint", name: "End", remarks: "" },
    ], options: {}, navigationCues: [{ pointId: "b", text: "Turn", voice: "Turn", triggers: [{ mode: "d", value: 20 }] }] };
    const routeStyle = { color: "#123456", strokeWidth: 3, fillOpacity: 0, routeDirectionArrows: true, routeArrowSpacing: 96 };
    const converted = convertGeoJson(snapshotToGeoJson({ ...snapshot, objects: [{ ...object, kind: "route", geometry: route, style: routeStyle }] }), style);
    assert.deepEqual(converted.candidates[0]?.geometry, route);
    assert.equal(converted.candidates[0]?.style.routeArrowSpacing, 96);
  });
  void it("rejects direction styles on incompatible geometry and invalid bounds", () => {
    assert.equal(directionStyleProblems(style, { type: "Point", coordinates: [8, 50] })[0]?.field, "style.arrowHeads");
    for (const invalid of [{ arrowHeads: "wrong" }, { arrowHeadSize: 65 }, { arrowHeadSize: 6.5 }, { routeArrowSpacing: 0 }, { routeDirectionArrows: "true" }, { routeDirectionArrows: true }]) {
      assert.ok(directionStyleProblems({ ...style, ...invalid } as PackageObjectStyle, line).length > 0);
    }
    const document = snapshotToGeoJson(snapshot) as { features: Array<{ properties: Record<string, unknown> }> };
    document.features[0]!.properties["arrow-head-size"] = "invalid";
    const imported = convertGeoJson(document, style);
    assert.equal(imported.candidates.length, 0);
    assert.equal(imported.report.rejected.length, 1);
  });
  void it("exports the underlying line with an explicit fallback in CoT and KML", () => {
    const cot = objectToCot(object, new Date("2026-10-10T00:00:00Z"));
    assert.match(cot, /type="u-d-f"/);
    assert.match(cot, /<remarks>Plan<\/remarks>/);
    assert.match(cot, /ARROWHEADS/);
    assert.match(snapshotToKml(snapshot), /openmeshtak:presentation-fallback/);
    assert.match(snapshotToKml(snapshot), /<LineString>/);
  });
});
