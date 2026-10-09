import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertCotEvent } from "../src/modules/data-packages/atak/cot-import.js";
import { objectToCot } from "../src/modules/data-packages/atak/cot-export.js";
import { parseArgb, parseLinkPoint, toArgb } from "../src/modules/data-packages/atak/cot-values.js";
import { DEFAULT_STYLE } from "../src/modules/data-packages/package-objects.service.js";
import { circle, customIcon, freeformArea, friendlyInfantry, route, spotMarker } from "./support/cot-fixtures.js";

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
      assert.equal(result.candidates[0]?.name, "ALPHA");
      assert.equal(result.candidates[0]?.description, "Meet here & wait");
      assert.deepEqual(result.candidates[0]?.geometry, { type: "Point", coordinates: [8.6821, 50.1101, 112.5] });
      assert.equal(result.candidates[0]?.style.color, "#FF7700");
    }
  });

  void it("imports closed freeform shapes as polygons with comma-decimal altitudes", () => {
    const result = convertCotEvent(freeformArea, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      const { geometry, style } = result.candidates[0] ?? assert.fail("no object");
      assert.equal(geometry.type, "Polygon");
      assert.deepEqual(geometry.type === "Polygon" ? geometry.coordinates[0]?.[0] : null, [8.68, 50.1, 82.73679294]);
      assert.deepEqual(style, { color: "#00FF00", strokeWidth: 1, fillOpacity: 0.09, strokeStyle: "solid", fillColor: null, height: 0 });
    }
  });

  void it("imports circles with their radius and reports a rounded stroke width", () => {
    const result = convertCotEvent(circle, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      assert.deepEqual(result.candidates[0]?.geometry, { type: "Circle", coordinates: [8.6744, 50.1083, 81.91], radius: 46.38 });
      assert.deepEqual(result.changes, ["stroke width 4.5 became 5"]);
    }
  });

  void it("keeps military symbol types and custom icon sets of markers", () => {
    const infantry = convertCotEvent(friendlyInfantry, DEFAULT_STYLE);
    const hiker = convertCotEvent(customIcon, DEFAULT_STYLE);
    const spot = convertCotEvent(spotMarker, DEFAULT_STYLE);
    assert.deepEqual(infantry.outcome === "accepted" ? infantry.candidates[0]?.tak : undefined, { cotType: "a-f-G-U-C-I", iconsetPath: null });
    assert.deepEqual(hiker.outcome === "accepted" ? hiker.candidates[0]?.tak : undefined, {
      cotType: "a-u-G",
      iconsetPath: "f7f71666-8b28-4b57-9fbb-e38e61d33b79/Google/hiker.png",
    });
    assert.equal(spot.outcome === "accepted" ? spot.candidates[0]?.tak : undefined, null);
    assert.deepEqual(infantry.outcome === "accepted" ? infantry.changes : undefined, []);
  });

  void it("keeps a dashed line style and a fill colour of its own, and reports unknown line styles", () => {
    const shape = (style: string) =>
      `<event version="2.0" uid="66666666-6666-4666-8666-666666666666" type="u-d-f" how="h-e"><point lat="50.1" lon="8.6" hae="0" ce="9999999" le="9999999" /><detail><contact callsign="ZONE" /><strokeColor value="-16776961" /><fillColor value="-2147418368" /><strokeStyle value="${style}" /><link point="50.1,8.6" /><link point="50.2,8.6" /><link point="50.2,8.7" /><link point="50.1,8.6" /></detail></event>`;
    const dashed = convertCotEvent(shape("dashed"), DEFAULT_STYLE);
    assert.equal(dashed.outcome, "accepted");
    if (dashed.outcome === "accepted") {
      assert.deepEqual(dashed.candidates[0]?.style, { color: "#0000FF", strokeWidth: 3, fillOpacity: 0.5, strokeStyle: "dashed", fillColor: "#00FF00" });
      const exported = objectToCot(
        { id: "66666666-6666-4666-8666-666666666666", layerId: "layer", kind: "polygon", ...(dashed.candidates[0] ?? assert.fail("no object")) },
        new Date("2026-10-05T00:00:00Z"),
      );
      assert.match(exported, /<strokeStyle value="dashed"\/>/);
      assert.match(exported, new RegExp(`<fillColor value="${String(toArgb("#00FF00", 0.5))}"/>`));
    }
    const dotted = convertCotEvent(shape("dotted"), DEFAULT_STYLE);
    assert.deepEqual(dotted.outcome === "accepted" ? [dotted.candidates[0]?.style.strokeStyle, dotted.changes] : null, ["solid", ["line style dotted became solid"]]);
  });

  void it("imports each stroke of a freehand drawing as its own line", () => {
    const stroke = (uid: string, color: string, points: string[]) =>
      `<?xml version='1.0' encoding='utf-8' standalone='yes'?><event version='2.0' uid='${uid}' type='u-d-f' how='h-e'><point lat='52.47' lon='11.72' hae='9999999' ce='9999999' le='9999999' /><detail><contact callsign='Freehand 1[1]' /><strokeColor value='${color}' />${points.map((point) => `<link point='${point}' />`).join("")}</detail></event>`;
    const escape = (xml: string) => xml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const strokes = [
      stroke("064e5815-9528-4597-95f1-25fb9ade51a7", "-65536", ["52.4772,11.7073", "52.4773,11.7060", "52.4774,11.7047"]),
      stroke("164e5815-9528-4597-95f1-25fb9ade51a7", "-16776961", ["52.4700,11.7000", "52.4710,11.7010"]),
    ];
    const drawing = `<?xml version="1.0" encoding="utf-8" standalone="yes"?><event version="2.0" uid="4400e918-948a-4052-ac94-e01397d6fbbf" type="u-d-f-m" how="h-e"><point lat="0" lon="0" hae="9999999" ce="9999999" le="9999999" /><detail><contact callsign="Freehand 1" />${strokes.map((xml) => `<link line="${escape(xml)}" />`).join("")}<remarks>Sketch</remarks></detail></event>`;

    const result = convertCotEvent(drawing, DEFAULT_STYLE);
    assert.equal(result.outcome, "accepted");
    if (result.outcome === "accepted") {
      assert.deepEqual(
        result.candidates.map(({ name, description, geometry, style }) => [name, description, geometry.type, style.color]),
        [
          ["Freehand 1 1", "Sketch", "LineString", "#FF0000"],
          ["Freehand 1 2", "Sketch", "LineString", "#0000FF"],
        ],
      );
      assert.deepEqual(result.changes, ["freehand drawing split into 2 objects"]);
    }
    const empty = drawing.replace(/<link line="[^"]*" \/>/g, "");
    assert.deepEqual(convertCotEvent(empty, DEFAULT_STYLE), { outcome: "rejected", message: "The freehand drawing has no strokes." });
  });

  void it("skips unsupported types and rejects DOCTYPE documents", () => {
    assert.deepEqual(convertCotEvent(route.replace('type="b-m-r"', 'type="b-r-f-h-c"'), DEFAULT_STYLE), { outcome: "skipped", message: "CoT type b-r-f-h-c is not supported yet." });
    const entity = `<!DOCTYPE event [<!ENTITY x SYSTEM "file:///etc/passwd">]>${spotMarker}`;
    assert.equal(convertCotEvent(entity, DEFAULT_STYLE).outcome, "rejected");
  });

  void it("keeps height in metres, display units and observed circle extrusion modes", () => {
    for (const mode of ["cylinder", "cone_down"] as const) {
      for (const height of ['<height value="-12,5"/><height_unit value="4"/>', '<height>-12.5</height><height_unit>4</height_unit>']) {
        const imported = convertCotEvent(circle.replace("<detail>", `<detail>${height}<extrudeMode value="${mode}"/>`), DEFAULT_STYLE);
        assert.equal(imported.outcome, "accepted");
        if (imported.outcome !== "accepted") continue;
        const candidate = imported.candidates[0] ?? assert.fail("no circle");
        assert.deepEqual([candidate.style.height, candidate.style.heightUnit, candidate.style.extrudeMode], [-12.5, 4, mode]);
        const xml = objectToCot({ ...candidate, id: "shape", layerId: "layer", kind: "circle" }, new Date("2026-10-09T00:00:00Z"));
        const again = convertCotEvent(xml, DEFAULT_STYLE);
        assert.deepEqual(again.outcome === "accepted" ? again.candidates[0]?.style : null, candidate.style);
      }
    }
    const bad = convertCotEvent(circle.replace("<detail>", '<detail><height value="Infinity"/><height_unit>99</height_unit><extrudeMode value="other"/>'), DEFAULT_STYLE);
    assert.equal(bad.outcome, "accepted");
    if (bad.outcome === "accepted") {
      assert.equal(bad.candidates[0]?.style.height, undefined);
      assert.equal(bad.changes.length, 4); // Three omitted values plus rounded stroke width.
    }
    const old = convertCotEvent(circle, DEFAULT_STYLE);
    assert.equal(old.outcome === "accepted" ? old.candidates[0]?.style.height : null, undefined);
  });

  void it("exports objects that import back unchanged", () => {
    for (const xml of [spotMarker, freeformArea, circle, friendlyInfantry, customIcon]) {
      const imported = convertCotEvent(xml, DEFAULT_STYLE);
      assert.equal(imported.outcome, "accepted");
      if (imported.outcome !== "accepted") {
        continue;
      }
      const exported = objectToCot(
        { id: "55555555-5555-4555-8555-555555555555", layerId: "layer", kind: "point", ...(imported.candidates[0] ?? assert.fail("no object")) },
        new Date("2026-10-05T00:00:00Z"),
      );
      const again = convertCotEvent(exported, DEFAULT_STYLE);
      assert.equal(again.outcome, "accepted");
      if (again.outcome === "accepted") {
        assert.deepEqual(again.candidates[0]?.geometry, imported.candidates[0]?.geometry);
        assert.equal(again.candidates[0]?.name, imported.candidates[0]?.name);
        assert.equal(again.candidates[0]?.style.color, imported.candidates[0]?.style.color);
        assert.deepEqual(again.candidates[0]?.tak, imported.candidates[0]?.tak);
      }
    }
  });
});
