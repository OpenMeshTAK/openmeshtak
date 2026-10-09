import { logger } from "../../shared/logging/logger.js";

type RevisionListener = (packageId: string) => Promise<void>;

const listeners = new Set<RevisionListener>();

/**
 * Lets other modules react to a new revision, such as missions announcing it to subscribed TAK
 * apps, without the data package module depending on them. Listeners run after the revision is
 * committed; their failures are logged and never undo the revision.
 */
export function onRevisionCreated(listener: RevisionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announceRevisionCreated(packageId: string): void {
  for (const listener of listeners) {
    listener(packageId).catch((error: unknown) => {
      logger.error({ error, event: "package_revision_listener_failed", packageId }, "A revision listener failed");
    });
  }
}
