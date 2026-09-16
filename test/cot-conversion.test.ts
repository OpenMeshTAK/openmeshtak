import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertCotEvent } from "../src/modules/data-packages/atak/cot-import.js";
import { objectToCot } from "../src/modules/data-packages/atak/cot-export.js";
import { parseArgb, parseLinkPoint, toArgb } from "../src/modules/data-packages/atak/cot-values.js";
import { DEFAULT_STYLE } from "../src/modules/data-packages/package-objects.service.js";
import { circle, freeformArea, route, spotMarker } from "./support/cot-fixtures.js";

void describe("CoT values", () => {
  void it("reads link points with dot and locale comma decimals", () => {
    assert.deepEqual(parseLinkPoint("52.38418502,11.83233492,82,73679294"), [11.83233492, 52.38418502, 82.73679294]);
    assert.deepEqual(parseLinkPoint("52.1,11.2,83.5"), [11.2, 52.1, 83.5]);
    assert.deepEqual(parseLinkPoint("52,1,11,2,83,5"), [11.2, 52.1, 83.5]);
    assert.deepEqual(parseLinkPoint("52.1,11.2"), [11.2, 52.1]);
    assert.deepEqual(parseLinkPoint("52.1,11.2,9999999"), [11.2, 52.1]);
    assert.equal(parseLinkPoint("52.1,11.2,1,2,3"), null);
  });

  void it("converts signed ARGB integers in both directions", () => {
    assert.deepEqual(parseArgb("-16777089"), { color: "#00007F", alpha: 1 });
    assert.deepEqual(parseArgb("956301439"), { color: "#00007F", alpha: 0.22 });
    assert.equal(toArgb("#00007F", 1), -16777089);
    assert.equal(toArgb("#FFFFFF", 1), -1);
  });
});

void describe("CoT event conversion", () => {
  void it("imports spot markers with colour, remarks and altitude", () => {
    const result = convertCotEvent(spotMarker, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      assert.equal(result.candidate.name, "ALPHA");
      assert.equal(result.candidate.description, "Meet here & wait");
      assert.deepEqual(result.candidate.geometry, { type: "Point", coordinates: [8.6821, 50.1101, 112.5] });
      assert.equal(result.candidate.style.color, "#FF7700");
    }
  });

  void it("imports closed freeform shapes as polygons with comma-decimal altitudes", () => {
    const result = convertCotEvent(freeformArea, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      const { geometry, style } = result.candidate;
      assert.equal(geometry.type, "Polygon");
      assert.deepEqual(geometry.type === "Polygon" ? geometry.coordinates[0]?.[0] : null, [8.68, 50.1, 82.73679294]);
      assert.deepEqual(style, { color: "#00FF00", strokeWidth: 1, fillOpacity: 0.09 });
    }
  });

  void it("imports circles with their radius and reports a rounded stroke width", () => {
    const result = convertCotEvent(circle, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      assert.deepEqual(result.candidate.geometry, { type: "Circle", coordinates: [8.6744, 50.1083, 81.91], radius: 46.38 });
      assert.deepEqual(result.changes, ["stroke width 4.5 became 5"]);
    }
  });

  void it("skips unsupported types and rejects DOCTYPE documents", () => {
    assert.deepEqual(convertCotEvent(route, DEFAULT_STYLE), { outcome: "skipped", message: "CoT type b-m-r is not supported yet." });
    const entity = `<!DOCTYPE event [<!ENTITY x SYSTEM "file:///etc/passwd">]>${spotMarker}`;
    assert.equal(convertCotEvent(entity, DEFAULT_STYLE).outcome, "rejected");
  });

  void it("exports objects that import back unchanged", () => {
    for (const xml of [spotMarker, freeformArea, circle]) {
      const imported = convertCotEvent(xml, DEFAULT_STYLE);
      assert.equal(imported.outcome, "accepted");
      if (imported.outcome !== "accepted") {
        continue;
      }
      const exported = objectToCot(
        { id: "55555555-5555-4555-8555-555555555555", layerId: "layer", kind: "point", ...imported.candidate },
        new Date("2026-10-05T00:00:00Z"),
      );
      const again = convertCotEvent(exported, DEFAULT_STYLE);
      assert.equal(again.outcome, "accepted");
      if (again.outcome === "accepted") {
        assert.deepEqual(again.candidate.geometry, imported.candidate.geometry);
        assert.equal(again.candidate.name, imported.candidate.name);
        assert.equal(again.candidate.style.color, imported.candidate.style.color);
      }
    }
  });
});
