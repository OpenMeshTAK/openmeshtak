import { recordAudit } from "../../shared/audit/audit.js";
import { forbidden } from "../../shared/auth/permission-check.js";
import type { ActorContext } from "../../shared/auth/principal.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { buildConnectionPackage } from "./connection-package.js";
import { serverTrustAnchors } from "./server-certificate.js";
import { hasAnyTakAccess, takAccessFor } from "./tak-access.js";
import { loadTakServerSettings } from "./tak-server-settings.js";

/** The connection Data Package for the signed-in user's TAK app; contains no secrets. */
export async function createConnectionPackage(actor: ActorContext): Promise<{ fileName: string; bytes: Uint8Array }> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  if (!hasAnyTakAccess(await takAccessFor(actor.principal.id))) {
    throw forbidden();
  }
  const settings = await loadTakServerSettings();
  if (!settings.enabled || settings.hostName === null) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:tak-server-not-ready",
      title: "TAK server not ready",
      status: 409,
      detail: "The TAK server is not enabled yet. Ask an administrator to set it up.",
      code: "TAK_SERVER_NOT_READY",
    });
  }
  const artifact = buildConnectionPackage({
    hostName: settings.hostName,
    streamingPort: settings.streamingPort,
    martiPort: settings.martiPort,
    caPems: await serverTrustAnchors(settings.hostName),
  });
  await recordAudit({
    actor: actor.principal,
    action: "tak-server.connection-package-downloaded",
    targetType: "tak-server",
    targetId: "tak-server",
    result: "success",
    traceId: actor.traceId,
    // The settings version identifies the endpoint the package points to.
    metadata: { hostName: settings.hostName, settingsVersion: settings.version },
  });
  return artifact;
}
