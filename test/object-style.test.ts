import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertGeoJson, snapshotToGeoJson } from "../src/modules/data-packages/geojson.js";
import { snapshotToKml } from "../src/modules/data-packages/kml-export.js";
import { DEFAULT_STYLE } from "../src/modules/data-packages/package-objects.service.js";
import type { PackageSnapshot } from "../src/modules/data-packages/package-snapshot.js";

const area = {
  id: "77777777-7777-4777-8777-777777777777",
  layerId: "layer",
  kind: "polygon" as const,
  name: "Zone",
  description: null,
  geometry: { type: "Polygon" as const, coordinates: [[[8.6, 50.1], [8.6, 50.2], [8.7, 50.2], [8.6, 50.1]]] },
  style: { color: "#0000FF", strokeWidth: 2, fillOpacity: 0.5, strokeStyle: "dashed" as const, fillColor: "#00FF00" },
  tak: null,
};

void describe("object styles in GeoJSON and KML", () => {
  void it("round-trips the line style and a fill colour of its own through GeoJSON", () => {
    const snapshot = { layers: [{ id: "layer", name: "Layer" }], objects: [area] } as unknown as PackageSnapshot;
    const document = snapshotToGeoJson(snapshot) as { features: Array<{ properties: Record<string, unknown> }> };
    assert.equal(document.features[0]?.properties["stroke-style"], "dashed");
    assert.equal(document.features[0]?.properties.fill, "#00FF00");

    const imported = convertGeoJson(document, DEFAULT_STYLE);
    assert.deepEqual(imported.candidates[0]?.style, area.style);
  });

  void it("keeps objects saved before line styles solid and filled with their colour", () => {
    const old = { ...area, style: { color: "#0000FF", strokeWidth: 2, fillOpacity: 0.5 } };
    const snapshot = { layers: [{ id: "layer", name: "Layer" }], objects: [old] } as unknown as PackageSnapshot;
    const properties = (snapshotToGeoJson(snapshot) as { features: Array<{ properties: Record<string, unknown> }> }).features[0]?.properties;
    assert.deepEqual([properties?.["stroke-style"], properties?.fill], ["solid", "#0000FF"]);
    assert.match(snapshotToKml(snapshot), /<PolyStyle>\s*<color>80ff0000<\/color>/);
  });

  void it("round-trips shape height and display units through GeoJSON without changing altitude", () => {
    const elevated = { ...area, style: { ...area.style, height: 12.5, heightUnit: 4 as const } };
    const snapshot = { layers: [{ id: "layer", name: "Layer" }], objects: [elevated] } as unknown as PackageSnapshot;
    const imported = convertGeoJson(snapshotToGeoJson(snapshot), DEFAULT_STYLE);
    assert.deepEqual(imported.candidates[0]?.style, elevated.style);
    assert.deepEqual(imported.candidates[0]?.geometry, elevated.geometry);
  });
});
