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
