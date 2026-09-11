import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { auth } from "../auth/auth.js";
import { ADMINISTRATORS_SYSTEM_KEY } from "../user-groups/system-groups.js";
import { INSTANCE_SCOPE_KEY, PERMISSIONS } from "../../shared/auth/permissions.js";
import { config } from "../../shared/config/config.js";
import { database } from "../../shared/database/database.js";
import { ProblemError } from "../../shared/errors/problem-error.js";

const ADMIN_GROUP_SLUG = "admin";

const BOOTSTRAP_TOKEN_PREFIX = "omtk_bootstrap_";

let setupInProgress = false;

export interface BootstrapChallengeNotice {
  token: string;
  expiresAt: Date;
}

export interface CreateInitialAdministratorInput {
  token: string;
  name: string;
  email: string;
  password: string;
}

export interface InitialAdministratorResult {
  id: string;
  name: string;
  email: string;
  responseHeaders: Headers;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function isConfigured(): Promise<boolean> {
  const administrator = await database.userGroupMembership.findFirst({
    where: {
      userGroup: {
        systemKey: ADMINISTRATORS_SYSTEM_KEY,
      },
    },
    select: {
      userId: true,
    },
  });

  return administrator !== null;
}

export async function rotateBootstrapChallenge(): Promise<BootstrapChallengeNotice | null> {
  const now = new Date();

  if (await isConfigured()) {
    await database.bootstrapChallenge.updateMany({
      where: {
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
    return null;
  }

  const token = `${BOOTSTRAP_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(now.getTime() + config.bootstrapTokenTtlMinutes * 60_000);

  await database.$transaction(async (transaction) => {
    await transaction.bootstrapChallenge.updateMany({
      where: {
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
    await transaction.bootstrapChallenge.create({
      data: {
        id: randomUUID(),
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

function invalidBootstrapToken(): ProblemError {
  return new ProblemError({
    type: "urn:openmeshtak:problem:invalid-bootstrap-token",
    title: "Setup authentication failed",
    status: 401,
    detail: "The setup token is invalid or no longer usable.",
    code: "INVALID_BOOTSTRAP_TOKEN",
  });
}

async function findValidChallenge(token: string): Promise<{ id: string } | null> {
  const challenge = await database.bootstrapChallenge.findFirst({
    where: {
      consumedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      tokenHash: true,
    },
  });

  if (challenge === null || !tokenMatches(token, challenge.tokenHash)) {
    return null;
  }

  return { id: challenge.id };
}

async function removeIncompleteAuthSubject(authSubjectId: string): Promise<void> {
  await database.$transaction([
    database.session.deleteMany({ where: { userId: authSubjectId } }),
    database.account.deleteMany({ where: { userId: authSubjectId } }),
    database.user.deleteMany({ where: { id: authSubjectId } }),
  ]);
}

export async function createInitialAdministrator(
  input: CreateInitialAdministratorInput,
): Promise<InitialAdministratorResult> {
  if (setupInProgress) {
    throw new ProblemError({
      type: "urn:openmeshtak:problem:setup-in-progress",
      title: "Setup is already in progress",
      status: 409,
      detail: "Another setup request is currently being processed.",
      code: "SETUP_IN_PROGRESS",
    });
  }

  setupInProgress = true;
  let authSubjectId: string | undefined;

  try {
    if (await isConfigured()) {
      throw new ProblemError({
        type: "urn:openmeshtak:problem:already-configured",
        title: "Setup is already complete",
        status: 409,
        detail: "The first administrator has already been created.",
        code: "ALREADY_CONFIGURED",
      });
    }

    const challenge = await findValidChallenge(input.token);
    if (challenge === null) {
      throw invalidBootstrapToken();
    }

    const signUp = await auth.api.signUpEmail({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
      },
      returnHeaders: true,
    });

    const createdAuthSubjectId = signUp.response.user.id;
    if (typeof createdAuthSubjectId !== "string") {
      throw new Error("Better Auth did not return an authentication subject ID.");
    }

    authSubjectId = createdAuthSubjectId;
    const domainUserId = randomUUID();
    const adminGroupId = randomUUID();
    const now = new Date();

    const consumed = await database.$transaction(async (transaction) => {
      const challengeUpdate = await transaction.bootstrapChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      });

      if (challengeUpdate.count !== 1) {
        return false;
      }

      await transaction.domainUser.create({
        data: {
          id: domainUserId,
          displayName: input.name,
          authSubject: {
            connect: {
              id: createdAuthSubjectId,
            },
          },
        },
      });

      await transaction.userGroup.create({
        data: {
          id: adminGroupId,
          name: "Admin",
          slug: ADMIN_GROUP_SLUG,
          systemKey: ADMINISTRATORS_SYSTEM_KEY,
          memberships: {
            create: {
              userId: domainUserId,
            },
          },
          permissionGrants: {
            create: PERMISSIONS.map((permission) => ({
              id: randomUUID(),
              permission,
              scopeKey: INSTANCE_SCOPE_KEY,
            })),
          },
        },
      });

      return true;
    });

    if (!consumed) {
      throw invalidBootstrapToken();
    }

    return {
      id: domainUserId,
      name: input.name,
      email: input.email,
      responseHeaders: signUp.headers,
    };
  } catch (error: unknown) {
    if (authSubjectId !== undefined) {
      await removeIncompleteAuthSubject(authSubjectId);
    }
    throw error;
  } finally {
    setupInProgress = false;
  }
}
