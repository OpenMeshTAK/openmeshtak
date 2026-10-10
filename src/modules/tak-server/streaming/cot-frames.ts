/** Largest single CoT event a client may send; real position and marker events are a few KB. */
export const MAX_EVENT_BYTES = 64 * 1024;

export class CotFrameError extends Error {}

const EVENT_END = "</event>";

/**
 * Splits the TAK streaming protocol into events. The protocol has no length prefix: clients
 * write complete `<event>` documents back to back, optionally each with an XML declaration, and
 * TCP may cut them anywhere. Everything up to each `</event>` is one event.
 */
export class CotFrameReader {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const events: string[] = [];
    let end = this.buffer.indexOf(EVENT_END);
    while (end !== -1) {
      const raw = this.buffer.slice(0, end + EVENT_END.length);
      // A complete oversized event must be rejected too, before it leaves the pending buffer.
      if (Buffer.byteLength(raw, "utf8") > MAX_EVENT_BYTES) {
        throw new CotFrameError("event too large");
      }
      this.buffer = this.buffer.slice(end + EVENT_END.length);
      const start = raw.indexOf("<event");
      if (start !== -1) {
        events.push(raw.slice(start));
      }
      end = this.buffer.indexOf(EVENT_END);
    }
    if (Buffer.byteLength(this.buffer, "utf8") > MAX_EVENT_BYTES) {
      throw new CotFrameError("event too large");
    }
    return events;
  }
}

/** First byte of every TAK Protocol frame. */
const MAGIC = 0xbf;
/** A length above `MAX_EVENT_BYTES` never needs more varint bytes than this. */
const MAX_LENGTH_BYTES = 4;

/**
 * Splits a TAK Protocol stream into payloads. After negotiation every message is the magic byte
 * 0xbf, the payload length as an unsigned varint and the payload, with nothing in between.
 */
export class ProtobufFrameReader {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): Uint8Array[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const payloads: Uint8Array[] = [];
    for (;;) {
      if (this.buffer.length === 0) {
        return payloads;
      }
      if (this.buffer[0] !== MAGIC) {
        throw new CotFrameError("missing TAK Protocol magic byte");
      }
      let length = 0;
      let offset = 1;
      let complete = false;
      while (offset < this.buffer.length && offset <= MAX_LENGTH_BYTES) {
        const byte = this.buffer[offset] ?? 0;
        length += (byte & 0x7f) * 2 ** (7 * (offset - 1));
        offset += 1;
        if ((byte & 0x80) === 0) {
          complete = true;
          break;
        }
      }
      if (!complete) {
        if (offset > MAX_LENGTH_BYTES) {
          throw new CotFrameError("invalid TAK Protocol length");
        }
        return payloads;
      }
      if (length > MAX_EVENT_BYTES) {
        throw new CotFrameError("event too large");
      }
      if (this.buffer.length < offset + length) {
        return payloads;
      }
      payloads.push(Uint8Array.prototype.slice.call(this.buffer, offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
    }
  }
}

/** Frames one payload for a TAK Protocol stream. */
export function frameTakMessage(payload: Uint8Array): Buffer {
  const header = [MAGIC];
  let length = payload.length;
  while (length > 0x7f) {
    header.push((length & 0x7f) | 0x80);
    length = Math.floor(length / 128);
  }
  header.push(length);
  return Buffer.concat([Buffer.from(header), payload]);
}
