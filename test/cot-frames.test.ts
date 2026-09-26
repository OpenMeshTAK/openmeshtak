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
});
