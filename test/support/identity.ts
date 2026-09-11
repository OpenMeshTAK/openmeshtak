import { randomUUID } from "node:crypto";
import { auth } from "../../src/modules/auth/auth.js";
import { generateApiKey } from "../../src/modules/service-accounts/api-key-secret.js";
import { scopeKeyFor, type Permission } from "../../src/shared/auth/permissions.js";
import { database } from "../../src/shared/database/database.js";

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
    database.eventConfigurationRevision.deleteMany(),
    database.syncIssue.deleteMany(),
    database.eventMember.deleteMany(),
    database.externalIdentity.deleteMany(),
    database.eventRole.deleteMany(),
    database.eventGroup.deleteMany(),
    database.apiKey.deleteMany(),
    database.serviceAccountPermissionGrant.deleteMany(),
    database.serviceAccount.deleteMany(),
    database.permissionGrant.deleteMany(),
    database.userGroupMembership.deleteMany(),
    database.userGroup.deleteMany(),
    database.domainUser.deleteMany(),
    database.session.deleteMany(),
    database.account.deleteMany(),
    database.user.deleteMany(),
    database.verification.deleteMany(),
    database.bootstrapChallenge.deleteMany(),
    database.event.deleteMany(),
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

/** Creates an active service account with one API key and returns the bearer value. */
export async function createServiceAccountKey(grants: TestGrant[]): Promise<string> {
  const serviceAccountId = randomUUID();
  const key = generateApiKey();

  await database.serviceAccount.create({
    data: {
      id: serviceAccountId,
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
