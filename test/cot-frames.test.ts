import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CotFrameError, CotFrameReader, MAX_EVENT_BYTES } from "../src/modules/tak-server/streaming/cot-frames.js";

void describe("CoT stream framing", () => {
  void it("splits back-to-back events cut anywhere by TCP", () => {
    const reader = new CotFrameReader();
    const stream = '<?xml version="1.0"?><event uid="a"></event><event uid="b"><detail/></event><event uid="c">';
    const events = [...reader.push(stream.slice(0, 30)), ...reader.push(stream.slice(30)), ...reader.push("</event>")];
    assert.deepEqual(events, ['<event uid="a"></event>', '<event uid="b"><detail/></event>', '<event uid="c"></event>']);
  });

  void it("refuses an event larger than the limit", () => {
    const reader = new CotFrameReader();
    assert.throws(() => reader.push(`<event uid="a">${"x".repeat(MAX_EVENT_BYTES)}`), CotFrameError);
  });

  void it("refuses completed oversized events regardless of TCP chunking and UTF-8 character count", () => {
    const xml = `<event uid="a">${"é".repeat(MAX_EVENT_BYTES / 2)}</event>`;
    assert.ok(xml.length < MAX_EVENT_BYTES);
    for (const chunks of [[xml], [xml.slice(0, 100), xml.slice(100)]]) {
      const reader = new CotFrameReader();
      assert.throws(() => chunks.flatMap((chunk) => reader.push(chunk)), CotFrameError);
    }
  });

  void it("accepts several individually bounded events even when their combined chunk exceeds the limit", () => {
    const prefix = '<event uid="a">';
    const suffix = "</event>";
    const xml = prefix + "x".repeat(MAX_EVENT_BYTES - prefix.length - suffix.length) + suffix;
    assert.deepEqual(new CotFrameReader().push(xml + xml), [xml, xml]);
  });
});
