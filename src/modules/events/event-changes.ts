import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";

/** Header the Web app sends with every API call, so a tab can ignore notices about its own changes. */
export const TAB_HEADER = "x-openmeshtak-tab";

export interface EventChange {
  eventId: string;
  /** Lowercase route below the event without leading slash, e.g. `data-packages/<id>/layers`; empty for the event itself. */
  path: string;
  /** HTTP method of the change, e.g. `DELETE`. */
  method: string;
  /** ID of the entity a `POST` created, taken from the response, so viewers can load just that. */
  createdId: string | null;
  /** The browser tab that made the change, if it said so. */
  tabId: string | null;
}

/** Every successful change below `/events/{eventId}`, for the realtime streams that care about it. */
export const eventChanges = new EventEmitter<{ changed: [EventChange] }>();

const EVENT_PATH = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/(.*?))?\/?$/i;
const TAB_ID = /^[A-Za-z0-9_-]{1,64}$/;
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Announces every successful write below `/api/v1/events/{eventId}`, whichever endpoint made it,
 * so open views can update. Mounted on `/api/v1/events`. Listeners only forward IDs and route
 * names to sockets that are authorized for that event; no request data leaves Core here.
 */
export function announceEventChanges(request: Request, response: Response, next: NextFunction): void {
  const match = READ_METHODS.has(request.method) ? null : EVENT_PATH.exec(request.path);
  if (match?.[1] !== undefined) {
    const eventId = match[1].toLowerCase();
    const path = (match[2] ?? "").toLowerCase();
    const tab = request.get(TAB_HEADER);
    const tabId = tab !== undefined && TAB_ID.test(tab) ? tab : null;
    const method = request.method;
    let createdId: string | null = null;
    if (method === "POST") {
      const sendJson = response.json.bind(response);
      response.json = (body: unknown) => {
        const id = (body as { id?: unknown } | null)?.id;
        createdId = typeof id === "string" ? id : null;
        return sendJson(body);
      };
    }
    response.once("finish", () => {
      if (response.statusCode < 400) {
        eventChanges.emit("changed", { eventId, path, method, createdId, tabId });
      }
    });
  }
  next();
}

/** Subscribes until the realtime server closes, so tests that start several servers do not pile up listeners. */
export function onEventChange(httpServer: { once(event: "close", listener: () => void): unknown }, listener: (change: EventChange) => void): void {
  eventChanges.on("changed", listener);
  httpServer.once("close", () => eventChanges.off("changed", listener));
}
