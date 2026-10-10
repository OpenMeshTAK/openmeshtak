import type { Server } from "socket.io";
import { authenticateSession } from "../../shared/auth/authorization.js";
import { authorizeNamespace } from "../../shared/realtime/realtime-server.js";
import { requireAnyPackageRead } from "./data-package-access.js";
import { onEventChange, type EventChange } from "../events/event-changes.js";
import { attachEditorPresence, type EditorSocketData } from "./editor-presence.js";

export const DATA_PACKAGES_NAMESPACE = "/data-packages";

export interface PackageChange {
  eventId: string;
  /** The changed package, or `null` when the event's package list itself changed. */
  packageId: string | null;
  /** Route below the package, e.g. `objects/<id>`, `layers` or empty for the package itself. */
  path: string;
  method: string;
  /** ID of a created object or layer. */
  createdId: string | null;
  /** The browser tab that made the change, if it said so. */
  tabId: string | null;
}

const PACKAGE_PATH = /^data-packages\/([0-9a-f-]{36})(?:\/(.*))?$/;
/** Creating, copying, importing, deleting and reordering change the package list. */
const LIST_PATH = /^(?:data-packages|data-package-copies|data-package-imports(?:\/.*)?|data-package-order)$/;

/** Which package a change below the event touched; `undefined` for unrelated changes. */
export function packageOfChange(path: string): string | null | undefined {
  const packageId = PACKAGE_PATH.exec(path)?.[1];
  if (packageId !== undefined) {
    return packageId;
  }
  return LIST_PATH.test(path) ? null : undefined;
}

/** The notice for one change, or `null` when it does not concern the map editors. */
export function packageChangeOf(change: EventChange): PackageChange | null {
  const packageId = packageOfChange(change.path);
  if (packageId === undefined) {
    return null;
  }
  const below = packageId === null ? "" : (PACKAGE_PATH.exec(change.path)?.[2] ?? "");
  // Deleting a package changes the event's package list, not the package.
  const listChange = packageId !== null && below === "" && change.method === "DELETE";
  return {
    eventId: change.eventId,
    packageId: listChange ? null : packageId,
    path: listChange ? "" : below,
    method: change.method,
    createdId: change.createdId,
    tabId: change.tabId,
  };
}

/**
 * The map editors' live channel for one event: which object, layer or package another tab or
 * person changed, so editors apply just that, and who else is editing (see `editor-presence`).
 * The client names the event in the handshake `auth` payload and needs `data-packages.read` or `missions.read`.
 */
export function attachPackageChangeStream(io: Server): void {
  const namespace = io.of(DATA_PACKAGES_NAMESPACE);
  authorizeNamespace(namespace, async (socket) => {
    const eventId: unknown = (socket.handshake.auth as Record<string, unknown>).eventId;
    if (typeof eventId !== "string" || eventId.length > 64) {
      throw new Error("Missing event");
    }
    const principal = await authenticateSession(socket.request.headers);
    await requireAnyPackageRead(principal, eventId);
    socket.data = { eventId: eventId.toLowerCase(), userId: principal.id } satisfies EditorSocketData;
    await socket.join(eventId.toLowerCase());
  });
  attachEditorPresence(namespace);

  onEventChange(io.httpServer, (change) => {
    const notice = packageChangeOf(change);
    if (notice !== null) {
      namespace.to(notice.eventId).emit("changed", notice);
    }
  });
}
