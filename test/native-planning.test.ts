import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { XMLParser } from "fast-xml-parser";
import { objectToCot, objectToCotEvents } from "../src/modules/data-packages/atak/cot-export.js";
import { convertCotEvent } from "../src/modules/data-packages/atak/cot-import.js";
import { completeStyle } from "../src/modules/data-packages/object-style.js";
import { inverseGeodesic } from "../src/modules/data-packages/geodesic.js";
import { presentationLosses } from "../src/modules/data-packages/export-presentation.js";
import { directionStyleProblems } from "../src/modules/data-packages/object-style.js";
import { changesBetween } from "../src/modules/missions/mission-format.js";
import type { PackageGeometry, PackageObjectStyle } from "../src/modules/data-packages/package-object.dto.js";
import type { PackageSnapshotObject } from "../src/modules/data-packages/package-snapshot.js";

const time = new Date("2026-10-10T00:00:00Z");
const fallback: PackageObjectStyle = { color: "#123456", strokeWidth: 3, fillOpacity: 0.25 };
interface NativeEvent { type: string; point: Record<string, string>; detail: { range: { value: string }; bearing: { value: string }; rangeUnits: { value: string }; bearingUnits: { value: string }; northRef: { value: string }; anchorUID?: unknown; rangeUID?: unknown; shape: { ellipse: unknown[]; link: { Style: { LineStyle: { color: string } } } } } }
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: false, trimValues: false });
function object(geometry: PackageGeometry, style: Partial<PackageObjectStyle> = {}): PackageSnapshotObject {
  const kind = geometry.type === "Point" ? "point" : geometry.type === "LineString" ? "line" : geometry.type === "Circle" ? "circle" : geometry.type === "Route" ? "route" : "polygon";
  return { id: "source", layerId: "layer", name: "Plan", description: "  User & text\n  ", geometry, kind, tak: null, style: { ...fallback, ...style } };
}
function candidate(xml: string) {
  const result = convertCotEvent(xml, fallback);
  assert.equal(result.outcome, "accepted", JSON.stringify(result));
  if (result.outcome !== "accepted") assert.fail();
  return result.candidates[0]!;
}
const line: PackageGeometry = { type: "LineString", coordinates: [[8, 50, 20], [8.01, 50.01, 30]] };

void describe("source-confirmed native planning CoT", () => {
  void it("preserves native dotted/dashed/outlined without adding remarks or CoT losses", () => {
    for (const strokeStyle of ["solid", "dashed", "dotted", "outlined"] as const) {
      const source = object(line, { strokeStyle });
      const xml = objectToCot(source, time);
      assert.match(xml, new RegExp(`strokeStyle value="${strokeStyle}"`));
      assert.equal(candidate(xml).style.strokeStyle, strokeStyle);
      assert.equal(candidate(xml).description, source.description);
      assert.deepEqual(presentationLosses(source, "cot"), []);
      assert.equal(presentationLosses(source, "kml").length, strokeStyle === "solid" ? 0 : 1);
    }
  });
  void it("exports WGS84 surface R&B, true bearing, inclination, units and no dangling UID", () => {
    const source = object(line, { rangeBearing: true, arrowHeads: "end", distanceUnit: "nm", bearingUnit: "mils" });
    const xml = objectToCot(source, time);
    const event = (parser.parse(xml) as { event: NativeEvent }).event;
    const expected = inverseGeodesic(line.coordinates[0]!, line.coordinates[1]!);
    assert.equal(event.type, "u-rb-a");
    assert.equal(Number(event.detail.range.value), expected.metres);
    assert.equal(Number(event.detail.bearing.value), expected.bearing);
    assert.equal(event.detail.rangeUnits.value, "2");
    assert.equal(event.detail.bearingUnits.value, "1");
    assert.equal(event.detail.northRef.value, "0");
    assert.equal(event.detail.anchorUID, undefined);
    assert.equal(event.detail.rangeUID, undefined);
    const external = xml.replace(/<openmeshtak[^>]*\/>/, "");
    const imported = candidate(external);
    assert.equal(imported.geometry.type, "LineString");
    if (imported.geometry.type === "LineString") imported.geometry.coordinates[1]!.forEach((value, index) => assert.ok(Math.abs(value - line.coordinates[1]![index]!) < 1e-8));
    assert.deepEqual(candidate(xml).geometry, line);
  });
  void it("reverses a start arrow without reversing its editable source geometry", () => {
    const source = object(line, { arrowHeads: "start" });
    const xml = objectToCot(source, time);
    assert.equal((parser.parse(xml) as { event: NativeEvent }).event.point.lon, "8.01");
    assert.deepEqual(candidate(xml).geometry, line);
  });
  void it("keeps point label visibility and imports plain u-d-p points as spot markers", () => {
    const source = object({ type: "Point", coordinates: [8, 50] }, { labelVisible: false });
    const xml = objectToCot(source, time);
    assert.match(xml, /type="b-m-p-s-m"/);
    assert.match(xml, /<hideLabel\/>/);
    assert.equal(candidate(xml).style.labelVisible, false);
    const named = candidate(`<event version="2.0" uid="p" type="u-d-p" how="h-e"><point lat="50" lon="8" hae="9999999" ce="9999999" le="9999999"/><detail><contact callsign="Named"/></detail></event>`);
    assert.equal(named.name, "Named");
    assert.equal(named.tak, null);
    assert.equal("label" in named.style, false);
  });
  void it("reverses the native endpoints of a saved R&B with a start head", () => {
    const xml = objectToCot(object(line, { rangeBearing: true, arrowHeads: "start" }), time);
    assert.equal((parser.parse(xml) as { event: NativeEvent }).event.point.lon, "8.01");
    assert.deepEqual(candidate(xml).geometry, line);
  });
  void it("exports a two-point double arrow as native R&B plus one start head", () => {
    const events = objectToCotEvents(object({ type: "LineString", coordinates: [[8, 50], [8.01, 50.01]] }, { arrowHeads: "both" }), time);
    assert.deepEqual(events.map(({ uid }) => uid), ["source", "source.head-start"]);
    assert.match(events[0]!.xml, /type="u-rb-a"/);
    assert.match(events[1]!.xml, /callsign="Plan arrowhead"/);
  });
  void it("uses native FOV flags by presence, preserves parameters, falls back for unsupported precision", () => {
    const source = object({ type: "Point", coordinates: [8, 50] }, { sector: { heading: 90, sweep: 120, radius: 1000, rangeLines: 50, displayLabels: false, visible: true } });
    const xml = objectToCot(source, time);
    assert.match(xml, /<sensor/);
    assert.doesNotMatch(xml, /hideFov|fovLabels/);
    assert.deepEqual(candidate(xml).style.sector, source.style.sector);
    const hidden = objectToCot({ ...source, style: { ...source.style, sector: { ...source.style.sector!, visible: false, displayLabels: true } } }, time);
    assert.match(hidden, /hideFov="true"/); assert.match(hidden, /fovLabels="true"/);
    for (const sector of [{ heading: 90.5, sweep: 120, radius: 1000 }, { heading: 90, sweep: 360, radius: 1000 }, { heading: 90, sweep: 120, radius: 60001 }]) {
      const polygon = objectToCot({ ...source, style: { ...source.style, sector } }, time);
      assert.doesNotMatch(polygon, /<sensor/);
      assert.deepEqual(candidate(polygon).style.sector, sector);
    }
  });
  void it("encodes corridor half-width as native MSD and retains navigable route IDs/cues", () => {
    const source = object(line, { corridorWidth: 50 });
    const xml = objectToCot(source, time);
    assert.match(xml, /msd range="25"/);
    assert.deepEqual(candidate(xml).geometry, line);
    const route: PackageGeometry = { type: "Route", coordinates: line.coordinates, points: [{ id: "a", type: "waypoint", name: "A", remarks: "" }, { id: "b", type: "checkpoint", name: "B", remarks: "" }], options: {}, navigationCues: [{ pointId: "b", text: "Turn", voice: "Turn", triggers: [{ mode: "d", value: 20 }] }] };
    const events = objectToCotEvents(object(route, { corridorWidth: 50 }), time);
    assert.deepEqual(events.map(({ uid }) => uid), ["source", "source.corridor"]);
    assert.match(events[0]!.xml, /type="b-m-r"/);
    assert.doesNotMatch(events[0]!.xml, /<msd/);
    assert.deepEqual(candidate(events[0]!.xml).geometry, route);
    assert.equal(convertCotEvent(events[1]!.xml, fallback).outcome, "skipped");
    const snapshot = { schema: 3, name: "Mission", description: null, layers: [], objects: [object(route, { corridorWidth: 50 })] };
    const changed = changesBetween(snapshot, { ...snapshot, objects: [object(route)] }, time);
    assert.ok(changed.some(({ type, object: item }) => type === "REMOVE_CONTENT" && item.id === "source.corridor"));
    assert.equal(changed.filter(({ type, object: item }) => type === "ADD_CONTENT" && item.geometry.type === "Route").length, 1);
  });
  void it("uses range-circle ARGB and bullseye compatibility IDs without external marker references", () => {
    const geometry: PackageGeometry = { type: "Circle", coordinates: [8, 50], radius: 100 };
    const circle = object(geometry, { rangeCircle: true, rangeRings: 3 });
    const xml = objectToCot(circle, time), event = (parser.parse(xml) as { event: NativeEvent }).event;
    assert.equal(event.type, "u-r-b-c-c");
    assert.equal(event.detail.shape.ellipse.length, 3);
    assert.equal(event.detail.shape.link.Style.LineStyle.color, "ff123456");
    const external = candidate(xml.replace(/<openmeshtak[^>]*\/>/, ""));
    assert.equal(external.style.color, "#123456"); assert.equal(external.style.rangeRings, 3);
    const bull = object(geometry, { bullseye: { ringDistance: 50, ringCount: 4, ringsVisible: true, edgeToCenter: true } });
    const exported = objectToCot(bull, time);
    assert.match(exported, /type="u-r-b-bullseye"/); assert.match(exported, /bullseyeUID="source.COMPAT"/);
    assert.doesNotMatch(exported, /markerUID/);
    assert.deepEqual(candidate(exported).style.bullseye, bull.style.bullseye);
  });
  void it("rejects malformed units, negative range and malicious source metadata", () => {
    const xml = objectToCot(object(line, { rangeBearing: true }), time);
    assert.equal(convertCotEvent(xml.replace('rangeUnits value="1"', 'rangeUnits value="bad"'), fallback).outcome, "rejected");
    assert.equal(convertCotEvent(xml.replace(/<range value="[^"]+"/, '<range value="-1"'), fallback).outcome, "rejected");
    const invalid = objectToCot(object(line, { rangeBearing: true, dashPattern: [1, 2, 3] }), time);
    assert.equal(convertCotEvent(invalid, fallback).outcome, "rejected");
    assert.equal(completeStyle(fallback).rangeCircle, false);
  });
  void it("round-trips native 2525D control measures and modifiers, rejecting unsupported symbols/point counts", () => {
    const graphic = { sidc: "11032500001403000000", modifiers: { T: "  PL & ALPHA  " } };
    const source = object(line, { tacticalGraphic: graphic });
    const xml = objectToCot(source, time);
    assert.match(xml, /<__milsym id="11032500001403000000">/);
    assert.match(xml, /unitmodifier code="T"/);
    assert.deepEqual(candidate(xml).style.tacticalGraphic, graphic);
    assert.deepEqual(candidate(xml.replace(/<openmeshtak[^>]*\/>/, "")).style.tacticalGraphic, graphic);
    const empty = objectToCot(object(line, { tacticalGraphic: { ...graphic, modifiers: { T: "" } } }), time).replace(/<openmeshtak[^>]*\/>/, "");
    assert.deepEqual(candidate(empty).style.tacticalGraphic?.modifiers, { T: "" });
    assert.deepEqual(directionStyleProblems(source.style, line), []);
    assert.ok(directionStyleProblems({ ...source.style, tacticalGraphic: { ...graphic, modifiers: { invented: "X" } } }, line).length > 0);
    assert.ok(directionStyleProblems({ ...source.style, tacticalGraphic: { ...graphic, sidc: "11032500001514040000" } }, line).length > 0);
    assert.equal(convertCotEvent(xml.replace('id="11032500001403000000"', 'id="11032500009999990000"').replace(/<openmeshtak[^>]*\/>/, ""), fallback).outcome, "rejected");
  });
});
