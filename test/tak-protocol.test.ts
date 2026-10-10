import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BinaryWriter, WireType } from "@bufbuild/protobuf/wire";
import { parseCotEvent } from "../src/modules/tak-server/streaming/cot-event.js";
import { CotFrameError, ProtobufFrameReader, frameTakMessage } from "../src/modules/tak-server/streaming/cot-frames.js";
import { takMessageToXml, xmlToTakMessage } from "../src/modules/tak-server/streaming/cot-protobuf.js";
import { protobufPing } from "./support/tak-protocol.js";

const marker =
  '<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="MARKER-1" type="a-h-G" how="h-g-i-g-o" ' +
  'time="2026-10-09T10:00:00.000Z" start="2026-10-09T10:00:00.000Z" stale="2026-10-09T11:00:00.000Z">' +
  '<point lat="52.4" lon="11.6" hae="50" ce="9999999" le="9999999"/>' +
  '<detail><contact callsign="Enemy &amp; Co"/><link uid="ANDROID-1" relation="p-p" type="a-f-G-U-C"/><remarks>left &lt;bridge&gt;</remarks></detail></event>';

/** A Protobuf client's position with typed contact and takv messages, as ATAK sends it. */
function positionPayload(xmlDetail: string, numericDetails = false): Uint8Array {
  const writer = new BinaryWriter();
  writer.tag(2, WireType.LengthDelimited).fork();
  writer.tag(1, WireType.LengthDelimited).string("a-f-G-U-C");
  writer.tag(5, WireType.LengthDelimited).string("ANDROID-2");
  writer.tag(6, WireType.Varint).uint64(Date.parse("2026-10-09T10:00:00.000Z"));
  writer.tag(7, WireType.Varint).uint64(Date.parse("2026-10-09T10:00:00.000Z"));
  writer.tag(8, WireType.Varint).uint64(Date.parse("2026-10-09T10:02:00.000Z"));
  writer.tag(9, WireType.LengthDelimited).string("m-g");
  writer.tag(10, WireType.Bit64).double(52.5);
  writer.tag(11, WireType.Bit64).double(13.4);
  writer.tag(15, WireType.LengthDelimited).fork();
  if (xmlDetail !== "") {
    writer.tag(1, WireType.LengthDelimited).string(xmlDetail);
  }
  writer.tag(2, WireType.LengthDelimited).fork().tag(1, WireType.LengthDelimited).string("*:-1:stcp").tag(2, WireType.LengthDelimited).string("BRAVO").join();
  writer.tag(6, WireType.LengthDelimited).fork().tag(2, WireType.LengthDelimited).string("ATAK-CIV").tag(4, WireType.LengthDelimited).string("5.6.0").join();
  if (numericDetails) {
    // Present messages whose numeric fields are all zero have an empty proto3 body.
    writer.tag(5, WireType.LengthDelimited).fork().join();
    writer.tag(7, WireType.LengthDelimited).fork().join();
  }
  writer.join();
  writer.join();
  return writer.finish();
}

void describe("TAK Protocol version 1", () => {
  void it("restores zero track and battery values only when their typed messages are present", () => {
    const xml = takMessageToXml(positionPayload("", true));
    assert.ok(xml);
    const event = parseCotEvent(xml);
    assert.ok(event);
    assert.deepEqual([event.speed, event.course], [0, 0]);
    assert.match(xml, /<status battery="0"\/>/);

    const absentXml = takMessageToXml(positionPayload(""));
    assert.ok(absentXml);
    const absent = parseCotEvent(absentXml);
    assert.ok(absent);
    assert.deepEqual([absent.speed, absent.course], [null, null]);
    assert.doesNotMatch(absentXml, /<status|<track/);

    const override = takMessageToXml(positionPayload('<track speed="2" course="90"/><status battery="50"/>', true));
    assert.ok(override);
    const overridden = parseCotEvent(override);
    assert.ok(overridden);
    assert.deepEqual([overridden.speed, overridden.course], [2, 90]);
    assert.match(override, /<status battery="50"\/>/);
    assert.doesNotMatch(override, /battery="0"|speed="0"|course="0"/);
  });

  void it("restores proto3 zero coordinates omitted by real TAK client pings", () => {
    const xml = takMessageToXml(protobufPing("WINTAK-ping"));
    assert.ok(xml);
    const event = parseCotEvent(xml);
    assert.ok(event, "zero coordinates are valid even when absent from the wire");
    assert.equal(event.isPing, true);
    assert.deepEqual([event.lat, event.lon], [0, 0]);
    assert.match(xml, /hae="0"/);
    assert.equal(event.ce, null, "unknown accuracy keeps its original sentinel");
  });

  void it("restores zero-valued timestamps and points without accepting events missing their identity", () => {
    const writer = new BinaryWriter();
    writer.tag(2, WireType.LengthDelimited).fork();
    writer.tag(1, WireType.LengthDelimited).string("t-x-c-t");
    writer.tag(5, WireType.LengthDelimited).string("EPOCH-ping");
    writer.tag(9, WireType.LengthDelimited).string("m-g");
    writer.join();
    const event = parseCotEvent(takMessageToXml(writer.finish()) ?? "");
    assert.ok(event);
    assert.deepEqual([event.time.getTime(), event.stale.getTime(), event.lat, event.lon, event.ce], [0, 0, 0, 0, 0]);
    const empty = new BinaryWriter().tag(2, WireType.LengthDelimited).fork().join().finish();
    assert.equal(parseCotEvent(takMessageToXml(empty) ?? ""), null);
  });

  void it("converts XML to a payload and back without losing event, point or detail data", () => {
    const payload = xmlToTakMessage(marker);
    assert.ok(payload);
    const xml = takMessageToXml(payload);
    assert.ok(xml);
    const event = parseCotEvent(xml);
    assert.ok(event);
    assert.equal(event.uid, "MARKER-1");
    assert.equal(event.type, "a-h-G");
    assert.equal(event.callsign, "Enemy & Co");
    assert.equal(event.stale.toISOString(), "2026-10-09T11:00:00.000Z");
    assert.deepEqual([event.lat, event.lon], [52.4, 11.6]);
    assert.match(xml, /<link uid="ANDROID-1" relation="p-p" type="a-f-G-U-C"\/><remarks>left &lt;bridge&gt;<\/remarks>/);
  });

  void it("turns typed detail messages into their XML elements", () => {
    const xml = takMessageToXml(positionPayload('<__group name="Cyan" role="Team Member"/>'));
    assert.ok(xml);
    const event = parseCotEvent(xml);
    assert.ok(event);
    assert.equal(event.isSituationalAwareness, true);
    assert.equal(event.callsign, "BRAVO");
    assert.match(xml, /<contact endpoint="\*:-1:stcp" callsign="BRAVO"\/>/);
    assert.match(xml, /<takv platform="ATAK-CIV" version="5.6.0"\/>/);
    assert.match(xml, /<__group name="Cyan" role="Team Member"\/>/);
  });

  void it("reads the direction of travel from the typed track message", () => {
    const writer = new BinaryWriter();
    writer.tag(2, WireType.LengthDelimited).fork();
    writer.tag(1, WireType.LengthDelimited).string("a-f-G-U-C");
    writer.tag(5, WireType.LengthDelimited).string("ANDROID-3");
    writer.tag(6, WireType.Varint).uint64(Date.parse("2026-10-09T10:00:00.000Z"));
    writer.tag(7, WireType.Varint).uint64(Date.parse("2026-10-09T10:00:00.000Z"));
    writer.tag(8, WireType.Varint).uint64(Date.parse("2026-10-09T10:02:00.000Z"));
    writer.tag(9, WireType.LengthDelimited).string("m-g");
    writer.tag(15, WireType.LengthDelimited).fork();
    writer.tag(7, WireType.LengthDelimited).fork().tag(1, WireType.Bit64).double(1.4).tag(2, WireType.Bit64).double(271.5).join();
    writer.join();
    writer.join();
    const event = parseCotEvent(takMessageToXml(writer.finish()) ?? "");
    assert.ok(event);
    assert.deepEqual([event.course, event.speed], [271.5, 1.4]);
    assert.deepEqual([parseCotEvent(marker)?.course, parseCotEvent(marker)?.speed], [null, null], "no track, no direction");
  });

  void it("rejects xmlDetail that would break out of its detail element", () => {
    assert.equal(takMessageToXml(positionPayload('</detail></event><event uid="X" type="a-f-G"><detail>')), null);
    assert.equal(takMessageToXml(positionPayload('<!DOCTYPE x [<!ENTITY a "b">]><remarks>&a;</remarks>')), null);
    assert.equal(takMessageToXml(new Uint8Array([0x12, 0x05, 0x01])), null, "truncated payload");
  });

  void it("frames payloads with the magic byte and a varint length, also across chunk borders", () => {
    const small = new Uint8Array([1, 2, 3]);
    const large = new Uint8Array(300).fill(7);
    const stream = Buffer.concat([frameTakMessage(small), frameTakMessage(large)]);
    assert.deepEqual([...stream.subarray(0, 2)], [0xbf, 3]);

    const reader = new ProtobufFrameReader();
    const payloads = [...reader.push(stream.subarray(0, 6)), ...reader.push(stream.subarray(6, 7)), ...reader.push(stream.subarray(7))];
    assert.deepEqual(
      payloads.map((payload) => payload.length),
      [3, 300],
    );
    assert.deepEqual([...(payloads[0] ?? [])], [1, 2, 3]);
  });

  void it("refuses frames without the magic byte or longer than an event may be", () => {
    assert.throws(() => new ProtobufFrameReader().push(Buffer.from([0x3c, 0x01])), CotFrameError);
    assert.throws(() => new ProtobufFrameReader().push(Buffer.from([0xbf, 0x81, 0x80, 0x08])), CotFrameError);
  });
});
