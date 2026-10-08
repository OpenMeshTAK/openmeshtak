import { createHash } from "node:crypto";
import { recordAudit } from "../../shared/audit/audit.js";
import { hasPermission } from "../../shared/auth/permission-check.js";
import type { ActorContext, Principal } from "../../shared/auth/principal.js";
import { database } from "../../shared/database/database.js";
import { notFoundProblem } from "../../shared/errors/problem-error.js";
import { buildAtakExport, type AtakExport } from "../data-packages/package-atak.service.js";
import { audienceFromSelectors, audienceIncludes, type AudienceRecipient } from "../event-audience/event-audience.js";
import { requireMemberArtifactAccess } from "../member-artifacts/member-artifact-access.js";
import type { MemberDataPackageDto } from "./member-data-package.dto.js";

interface MemberContext {
  recipient: AudienceRecipient;
  userId: string;
  active: boolean;
}

async function loadMember(eventId: string, memberId: string): Promise<MemberContext | null> {
  const member = await database.eventMember.findFirst({
    where: { id: memberId, eventId },
    select: { id: true, userId: true, eventRoleId: true, eventGroupId: true, event: { select: { status: true } } },
  });
  return member === null
    ? null
    : {
        recipient: { memberId: member.id, eventRoleId: member.eventRoleId, eventGroupId: member.eventGroupId },
        userId: member.userId,
        active: member.event.status === "active",
      };
}

function isOwnActiveMembership(principal: Principal, member: MemberContext | null): member is MemberContext {
  return member !== null && principal.type === "user" && member.userId === principal.id && member.active;
}

async function canListFor(principal: Principal, eventId: string, member: MemberContext): Promise<boolean> {
  const { active } = member;
  if (isOwnActiveMembership(principal, member) || (await hasPermission(principal, "members.read", eventId))) {
    return true;
  }
  return active && principal.type === "user" && (await hasPermission(principal, "member-artifacts.download", eventId));
}

/**
 * Published packages whose audience includes the member, each at its newest revision. Packages
 * outside the audience are absent, and drafts never reach participants.
 */
export async function receivedPackages(eventId: string, recipient: AudienceRecipient) {
  const packages = await database.dataPackage.findMany({
    where: { eventId, revisions: { some: {} } },
    orderBy: { name: "asc" },
    include: { audience: true, revisions: { orderBy: { number: "desc" }, take: 1 } },
  });
  return packages.flatMap((dataPackage) => {
    const latest = dataPackage.revisions[0];
    const receives = dataPackage.audienceAll || audienceIncludes(audienceFromSelectors(dataPackage.audience), recipient);
    return latest !== undefined && receives ? [{ dataPackage, latest }] : [];
  });
}

/**
 * The member sees their own list while the event is active; `members.read` may preview it and
 * an on-behalf operator sees what they could download for the member.
 */
export async function listMemberDataPackages(
  principal: Principal,
  eventId: string,
  memberId: string,
): Promise<MemberDataPackageDto[]> {
  const member = await loadMember(eventId, memberId);
  if (member === null || !(await canListFor(principal, eventId, member))) {
    throw notFoundProblem();
  }
  return (await receivedPackages(eventId, member.recipient)).map(({ dataPackage, latest }) => ({
    id: dataPackage.id,
    name: dataPackage.name,
    description: dataPackage.description,
    revision: latest.number,
    publishedAt: latest.createdAt.toISOString(),
    installOnEnrollment: dataPackage.installOnEnrollment,
    installOnConnection: dataPackage.installOnConnection,
  }));
}

/**
 * The member downloads packages they receive; an operator with `member-artifacts.download` may
 * download exactly those packages on the member's behalf. Every download is audited.
 */
export async function downloadMemberDataPackage(
  actor: ActorContext,
  eventId: string,
  memberId: string,
  packageId: string,
): Promise<AtakExport> {
  const { onBehalf } = await requireMemberArtifactAccess(actor.principal, eventId, memberId);
  const member = await loadMember(eventId, memberId);
  if (member === null) {
    throw notFoundProblem();
  }
  const received = (await receivedPackages(eventId, member.recipient)).find(
    ({ dataPackage }) => dataPackage.id === packageId,
  );
  if (received === undefined) {
    throw notFoundProblem();
  }

  const artifact = await buildAtakExport(packageId, received.latest);
  await recordAudit({
    actor: actor.principal,
    action: "data-package.downloaded",
    targetType: "data-package",
    targetId: packageId,
    result: "success",
    traceId: actor.traceId,
    metadata: {
      eventId,
      memberId,
      revision: received.latest.number,
      onBehalf,
      artifactSha256: createHash("sha256").update(artifact.bytes).digest("hex"),
    },
  });
  return artifact;
}
