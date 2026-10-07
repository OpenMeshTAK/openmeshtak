import { randomUUID } from "node:crypto";
import { auth } from "../../src/modules/auth/auth.js";
import { generateApiKey } from "../../src/modules/api-clients/api-key-secret.js";
import { scopeKeyFor, type Permission } from "../../src/shared/auth/permissions.js";
import { database } from "../../src/shared/database/database.js";
import { assignMissingUsername } from "../../src/modules/users/usernames.js";

export interface TestGrant {
  permission: Permission;
  eventId?: string | null;
}

export interface TestUser {
  id: string;
  authSubjectId: string;
  /** Value for a `Cookie` request header carrying the user's Better Auth session. */
  cookie: string;
}

export async function clearDatabase(): Promise<void> {
  await database.$transaction([
    database.auditEvent.deleteMany(),
    database.memberClaim.deleteMany(),
    database.accountInvite.deleteMany(),
    database.registrationSettings.deleteMany(),
    database.instanceSettings.deleteMany(),
    database.dataPackage.deleteMany(),
    database.storageBlob.deleteMany(),
    database.eventConfigurationRevision.deleteMany(),
    database.syncIssue.deleteMany(),
    database.eventMember.deleteMany(),
    database.externalIdentity.deleteMany(),
    database.eventRole.deleteMany(),
    database.eventGroup.deleteMany(),
    database.apiKey.deleteMany(),
    database.apiClientPermissionGrant.deleteMany(),
    database.apiClient.deleteMany(),
    database.permissionGrant.deleteMany(),
    database.userGroupMembership.deleteMany(),
    database.userGroup.deleteMany(),
    database.domainUser.deleteMany(),
    database.passkey.deleteMany(),
    database.session.deleteMany(),
    database.account.deleteMany(),
    database.user.deleteMany(),
    database.verification.deleteMany(),
    database.bootstrapChallenge.deleteMany(),
    database.event.deleteMany(),
    database.takCertificateAuthority.deleteMany(),
    database.takServerCertificate.deleteMany(),
    database.takAcmeSettings.deleteMany(),
    database.takServerSettings.deleteMany(),
    database.takEnrollmentToken.deleteMany(),
    database.takClientCertificate.deleteMany(),
    database.emailSettings.deleteMany(),
    database.takTrafficItem.deleteMany(),
    database.takTrafficRecording.deleteMany(),
    database.mapSettings.deleteMany(),
    database.downloadGrant.deleteMany(),
    database.idempotencyRecord.deleteMany(),
  ]);
}

/**
 * Creates a signed-in user through Better Auth's server API. Server-side calls bypass the HTTP
 * sign-in rate limit, which keeps tests independent of each other.
 */
export async function createUser(
  name: string,
  grants: TestGrant[],
  options: { systemKey?: string } = {},
): Promise<TestUser> {
  const signUp = await auth.api.signUpEmail({
    body: {
      email: `${randomUUID()}@example.test`,
      name,
      password: "A-secure-test-password-123!",
    },
    returnHeaders: true,
  });

  await assignMissingUsername(signUp.response.user.id);
  const id = randomUUID();
  await database.domainUser.create({
    data: { id, displayName: name, authSubjectId: signUp.response.user.id },
  });
  await database.userGroup.create({
    data: {
      id: randomUUID(),
      name: `${name} group`,
      slug: `group-${id}`,
      systemKey: options.systemKey ?? null,
      memberships: { create: { userId: id } },
      permissionGrants: {
        create: grants.map(({ permission, eventId = null }) => ({
          id: randomUUID(),
          permission,
          scopeKey: scopeKeyFor(eventId),
          eventId,
        })),
      },
    },
  });

  const cookie = signUp.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

  return { id, authSubjectId: signUp.response.user.id, cookie };
}

export async function createEvent(): Promise<string> {
  const id = randomUUID();
  await database.event.create({
    data: { id, name: "Test event", slug: `event-${id}`, timeZone: "Europe/Berlin" },
  });
  return id;
}

/** Creates an active API client with one API key and returns the bearer value. */
export async function createApiClientKey(grants: TestGrant[]): Promise<string> {
  const apiClientId = randomUUID();
  const key = generateApiKey();

  await database.apiClient.create({
    data: {
      id: apiClientId,
      name: "Test integration",
      permissionGrants: {
        create: grants.map(({ permission, eventId = null }) => ({
          id: randomUUID(),
          permission,
          scopeKey: scopeKeyFor(eventId),
          eventId,
        })),
      },
      apiKeys: {
        create: {
          id: randomUUID(),
          name: "test",
          publicKeyId: key.publicKeyId,
          secretHash: key.secretHash,
        },
      },
    },
  });

  return key.plaintext;
}
