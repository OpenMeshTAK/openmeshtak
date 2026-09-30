import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DownloadGrant } from "../../generated/prisma/client.js";
import { recordAudit } from "../../shared/audit/audit.js";
import type { ActorContext, UserPrincipal } from "../../shared/auth/principal.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem, ProblemError } from "../../shared/errors/problem-error.js";
import { requireMemberArtifactAccess } from "../member-artifacts/member-artifact-access.js";
import { downloadMemberDataPackage, listMemberDataPackages } from "../member-data-packages/member-data-packages.service.js";
import { generateDeviceProfile } from "../meshtastic-artifacts/device-profile.service.js";
import { createConnectionPackage } from "../tak-server/connection-package.service.js";
import { hasAnyTakAccess, takAccessFor } from "../tak-server/tak-access.js";
import type { CreateDownloadGrantRequest, DownloadGrantDto } from "./download-grant.dto.js";

const VALID_MINUTES = 5;
/** Phones sometimes fetch a link twice (preview, then download); a few uses keep that working. */
const MAX_USES = 3;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** A grant that no longer works looks exactly like one that never existed. */
function unavailable(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:download-unavailable",
    title: "Download link not available",
    status: 404,
    detail: "This download link is invalid, used up or expired. Create a new one.",
    code: "DOWNLOAD_UNAVAILABLE",
  });
}

/**
 * Checks the same access the regular download checks, without generating the artifact yet, so a
 * grant is only ever issued for something the caller may download right now.
 */
async function checkAccess(principal: UserPrincipal, input: CreateDownloadGrantRequest): Promise<void> {
  switch (input.kind) {
    case "device-profile":
      await requireMemberArtifactAccess(principal, input.eventId ?? "", input.memberId ?? "");
      return;
    case "member-data-package": {
      // Listing alone also allows a members.read preview; downloading needs real artifact access.
      await requireMemberArtifactAccess(principal, input.eventId ?? "", input.memberId ?? "");
      const packages = await listMemberDataPackages(principal, input.eventId ?? "", input.memberId ?? "");
      if (!packages.some(({ id }) => id === input.packageId)) {
        throw notFoundProblem();
      }
      return;
    }
    case "tak-connection-package":
      if (!hasAnyTakAccess(await takAccessFor(principal.id))) {
        throw notFoundProblem();
      }
  }
}

/** Creates a five-minute link for one artifact the signed-in user may download. */
export async function createDownloadGrant(actor: ActorContext, input: CreateDownloadGrantRequest, now = new Date()): Promise<DownloadGrantDto> {
  if (actor.principal.type !== "user") {
    throw notFoundProblem();
  }
  await checkAccess(actor.principal, input);
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + VALID_MINUTES * 60_000);
  const id = randomUUID();
  await database.$transaction(async (transaction) => {
    await transaction.downloadGrant.create({
      data: {
        id,
        tokenHash: hashToken(token),
        userId: actor.principal.id,
        kind: input.kind,
        eventId: input.eventId ?? null,
        memberId: input.memberId ?? null,
        packageId: input.packageId ?? null,
        expiresAt,
      },
    });
    await recordAudit(
      {
        actor: actor.principal,
        action: "download-grant.created",
        targetType: "download-grant",
        targetId: id,
        result: "success",
        traceId: actor.traceId,
        metadata: { kind: input.kind, eventId: input.eventId ?? null, memberId: input.memberId ?? null, packageId: input.packageId ?? null },
      },
      transaction,
    );
  });
  return {
    url: new URL(`/api/v1/downloads/${token}`, config.publicOrigin).href,
    expiresAt: expiresAt.toISOString(),
  };
}

/** Uses up one download atomically; expired or used-up grants are refused. */
async function consume(token: string, now: Date): Promise<DownloadGrant> {
  const grant = await database.downloadGrant.findUnique({ where: { tokenHash: hashToken(token) } });
  if (grant === null || grant.expiresAt <= now) {
    throw unavailable();
  }
  const used = await database.downloadGrant.updateMany({
    where: { id: grant.id, uses: { lt: MAX_USES }, expiresAt: { gt: now } },
    data: { uses: { increment: 1 } },
  });
  if (used.count !== 1) {
    throw unavailable();
  }
  return grant;
}

/** The grant's user as a principal; the regular services then check their access again. */
async function principalOf(grant: DownloadGrant): Promise<UserPrincipal> {
  const user = await database.domainUser.findUnique({ where: { id: grant.userId }, select: { authSubjectId: true, disabledAt: true } });
  if (user === null || user.disabledAt !== null) {
    throw unavailable();
  }
  return { type: "user", id: grant.userId, authSubjectId: user.authSubjectId ?? "", sessionCreatedAt: grant.createdAt };
}

export interface GrantedFile {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

async function produce(actor: ActorContext, grant: DownloadGrant): Promise<GrantedFile> {
  switch (grant.kind) {
    case "device-profile": {
      const file = await generateDeviceProfile(actor, grant.eventId ?? "", grant.memberId ?? "");
      return { ...file, contentType: "application/octet-stream" };
    }
    case "member-data-package": {
      const file = await downloadMemberDataPackage(actor, grant.eventId ?? "", grant.memberId ?? "", grant.packageId ?? "");
      return { ...file, contentType: "application/zip" };
    }
    case "tak-connection-package": {
      const file = await createConnectionPackage(actor);
      return { ...file, contentType: "application/zip" };
    }
    default:
      throw unavailable();
  }
}

/**
 * Serves a granted download without a session. Access is checked again at this moment through
 * the regular artifact services, which also audit the download itself.
 */
export async function downloadWithGrant(token: string, traceId: string, now = new Date()): Promise<GrantedFile> {
  const grant = await consume(token, now);
  const actor: ActorContext = { principal: await principalOf(grant), traceId };
  try {
    return await produce(actor, grant);
  } catch (error: unknown) {
    // Lost access and missing artifacts look like an unavailable link, never like a reason.
    if (error instanceof ProblemError && [403, 404, 409].includes(error.status)) {
      throw unavailable();
    }
    throw error;
  }
}
