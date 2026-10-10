import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XMLParser } from "fast-xml-parser";
import { objectToCot } from "../src/modules/data-packages/atak/cot-export.js";
import { convertCotEvent } from "../src/modules/data-packages/atak/cot-import.js";
import type { PackageGeometry, PackageObjectStyle, TakMarker } from "../src/modules/data-packages/package-object.dto.js";
import type { PackageSnapshotObject } from "../src/modules/data-packages/package-snapshot.js";

// Expected shapes follow ATAK-CIV 5.6 Data Package exports (2026-10-10) and a WinTAK 4.6 export;
// device identifiers are not reproduced here.
const time = new Date("2026-10-10T00:00:00Z");
const fallback: PackageObjectStyle = { color: "#123456", strokeWidth: 3, fillOpacity: 0.25 };
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: false });
type Detail = Record<string, Record<string, string> | undefined> & { link?: unknown; shape?: { link: { Style: { LineStyle: { color: string }; PolyStyle: { color: string } } } } };

function object(geometry: PackageGeometry, style: Partial<PackageObjectStyle> = {}, tak: TakMarker | null = null): PackageSnapshotObject {
  const kind = geometry.type === "Point" ? "point" : geometry.type === "LineString" ? "line" : geometry.type === "Circle" ? "circle" : geometry.type === "Ellipse" ? "ellipse" : geometry.type === "Route" ? "route" : "polygon";
  return { id: "11111111-1111-4111-8111-111111111111", layerId: "layer", name: "Plan", description: null, geometry, kind, tak, style: { ...fallback, color: "#1E88E5", ...style } };
}
function exported(source: PackageSnapshotObject): { type: string; how: string; detail: Detail } {
  return (parser.parse(objectToCot(source, time)) as { event: { type: string; how: string; detail: Detail } }).event;
}
function imported(xml: string) {
  const result = convertCotEvent(xml, fallback);
  assert.equal(result.outcome, "accepted", JSON.stringify(result));
  if (result.outcome !== "accepted") assert.fail();
  return result.candidates[0]!;
}

void describe("ATAK export format", () => {
  void it("writes 2525 markers untinted with ATAK's derived symbol path", () => {
    const event = exported(object({ type: "Point", coordinates: [10, 53] }, {}, { cotType: "a-h-G-U-C-I", iconsetPath: null }));
    assert.equal(event.detail.color?.argb, "-1");
    assert.equal(event.detail.usericon?.iconsetpath, "COT_MAPPING_2525C/a-h/a-h-G-U-C-I");
    const atak = `<event version="2.0" uid="a" type="a-h-G" how="h-g-i-g-o"><point lat="53.7" lon="10.3" hae="82" ce="9999999.0" le="9999999.0"/><detail><contact callsign="R.1"/><usericon iconsetpath="COT_MAPPING_2525C/a-h/a-h-G"/><color argb="-1"/></detail></event>`;
    assert.deepEqual(imported(atak).tak, { cotType: "a-h-G", iconsetPath: null });
  });

  void it("keeps spot colours and exports standalone waypoints as spots", () => {
    for (const cotType of ["b-m-p-w", "b-m-p-c"]) {
      const event = exported(object({ type: "Point", coordinates: [10, 53] }, {}, { cotType, iconsetPath: null }));
      assert.equal(event.type, "b-m-p-s-m");
      assert.equal(event.detail.color?.argb, "-14776091");
      assert.equal(event.detail.usericon?.iconsetpath, "COT_MAPPING_SPOTMAP/b-m-p-s-m/-14776091");
    }
  });

  void it("writes R&B colour as strokeColor and color value, and reads ATAK's", () => {
    const event = exported(object({ type: "LineString", coordinates: [[10, 53], [10.01, 53.01]] }, { rangeBearing: true, arrowHeads: "end" }));
    assert.equal(event.type, "u-rb-a");
    assert.equal(event.detail.strokeColor?.value, "-14776091");
    assert.equal(event.detail.color?.value, "-14776091");
    assert.equal(event.detail.color?.argb, undefined);
    const atak = `<event version="2.0" uid="b" type="u-rb-a" how="h-e"><point lat="53.71" lon="10.35" hae="79" ce="9999999.0" le="9999999.0"/><detail><range value="965.3"/><bearing value="76.08"/><rangeUnits value="1"/><bearingUnits value="0"/><northRef value="1"/><labels_on value="false"/><contact callsign="R&amp;B 1"/><strokeColor value="-65536"/><strokeWeight value="3.0"/><strokeStyle value="solid"/><color value="-65536"/></detail></event>`;
    assert.equal(imported(atak).style.color, "#FF0000");
  });

  void it("writes KmlStyle colours as ARGB hex for circles and ellipses", () => {
    const ellipse = exported(object({ type: "Ellipse", coordinates: [10, 53], major: 200, minor: 100, rotation: 30 }, { fillOpacity: 0.5 }));
    assert.equal(ellipse.detail.shape?.link.Style.LineStyle.color, "ff1e88e5");
    assert.equal(ellipse.detail.shape?.link.Style.PolyStyle.color, "801e88e5");
    const circle = exported(object({ type: "Circle", coordinates: [10, 53], radius: 100 }));
    assert.equal(circle.detail.shape?.link.Style.LineStyle.color, "ff1e88e5");
  });

  void it("reads WinTAK ellipse KmlStyle colours as ARGB", () => {
    const wintak = `<event version="2.0" uid="c" type="u-d-c-e" how="h-g-i-g-o"><point lat="52.45" lon="11.82" hae="9999999" ce="9999999" le="9999999"/><detail><contact callsign="Ellipse 1"/><shape><ellipse minor="1476.6" major="2027.7" angle="90"/><link relation="p-c" uid="c.style" type="b-x-KmlStyle"><Style><LineStyle><color>FF0000FF</color><width>3</width></LineStyle><PolyStyle><color>800000FF</color></PolyStyle></Style></link></shape></detail></event>`;
    const style = imported(wintak).style;
    assert.equal(style.color, "#0000FF");
    assert.equal(style.fillOpacity, 0.5);
  });

  void it("reads ATAK range circle colours", () => {
    const atak = `<event version="2.0" uid="d" type="u-r-b-c-c" how="h-e"><point lat="53.71" lon="10.34" hae="79" ce="9999999.0" le="9999999.0"/><detail><shape><ellipse major="512.12" minor="512.12" angle="360"/><link uid="d.Style" type="b-x-KmlStyle" relation="p-c"><Style><LineStyle><color>ffff0000</color><width>3.0</width></LineStyle><PolyStyle><color>00ff0000</color></PolyStyle></Style></link></shape><contact callsign="E&amp;P-Kreis 1"/><strokeColor value="-65536"/><strokeWeight value="3.0"/><strokeStyle value="solid"/><fillColor value="16711680"/><color argb="-65536"/></detail></event>`;
    const candidate = imported(atak);
    assert.equal(candidate.style.color, "#FF0000");
    assert.equal(candidate.style.rangeCircle, true);
  });

  void it("writes bullseyes with ATAK's marker how", () => {
    const event = exported(object({ type: "Circle", coordinates: [10, 53], radius: 180 }, { bullseye: { ringDistance: 60, ringCount: 3, ringsVisible: true, edgeToCenter: false } }));
    assert.equal(event.type, "u-r-b-bullseye");
    assert.equal(event.how, "h-g-i-g-o");
  });

  void it("writes route links as children with ATAK's stroke details", () => {
    const route: PackageGeometry = { type: "Route", coordinates: [[10, 53], [10.01, 53.01]], options: {}, navigationCues: [], points: [
      { id: "22222222-2222-4222-8222-222222222222", type: "waypoint", name: "SP", remarks: "" },
      { id: "33333333-3333-4333-8333-333333333333", type: "waypoint", name: "TGT", remarks: "" },
    ] };
    const event = exported(object(route));
    const links = event.detail.link as Array<Record<string, string>>;
    assert.deepEqual(links.map((link) => link.relation), ["c", "c"]);
    assert.equal(event.detail.strokeColor?.value, "-14776091");
    assert.equal(event.detail.strokeStyle?.value, "solid");
    assert.equal(event.detail.color?.value, "-14776091");
  });
});
