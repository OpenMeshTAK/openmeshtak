import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";

const bootstrapToken = `omtk_bootstrap_${"A".repeat(43)}`;

interface ProblemBody {
  code?: unknown;
}

interface SessionBody {
  user?: {
    email?: unknown;
  };
}

interface SetupBody {
  user?: {
    email?: unknown;
    username?: unknown;
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function clearIdentityData(): Promise<void> {
  await database.$transaction([
    database.permissionGrant.deleteMany(),
    database.userGroupMembership.deleteMany(),
    database.userGroup.deleteMany(),
    database.domainUser.deleteMany(),
    database.session.deleteMany(),
    database.account.deleteMany(),
    database.user.deleteMany(),
    database.verification.deleteMany(),
    database.bootstrapChallenge.deleteMany(),
  ]);
}

async function createBootstrapChallenge(): Promise<void> {
  await database.bootstrapChallenge.create({
    data: {
      id: randomUUID(),
      tokenHash: hashToken(bootstrapToken),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
}

void describe("first-administrator setup", () => {
  beforeEach(async () => {
    await clearIdentityData();
  });

  after(async () => {
    await clearIdentityData();
    await disconnectDatabase();
  });

  void it("keeps Better Auth email sign-up private", async () => {
    const response = await request(createApp())
      .post("/api/auth/sign-up/email")
      .send({
        email: "bypass@example.test",
        name: "Bypass",
        username: "bypass",
        password: "ThisIsNotAllowed123!",
      })
      .expect(404);

    const body = response.body as ProblemBody;
    assert.equal(body.code, "NOT_FOUND");
    assert.equal(await database.user.count(), 0);
  });

  void it("rejects an invalid operator token without creating identity data", async () => {
    await createBootstrapChallenge();

    const response = await request(createApp())
      .post("/api/v1/setup")
      .send({
        email: "admin@example.test",
        name: "Initial Admin",
        username: "admin",
        password: "A-secure-test-password-123!",
        token: `omtk_bootstrap_${"B".repeat(43)}`,
      })
      .expect(401);

    const body = response.body as ProblemBody;
    assert.equal(body.code, "INVALID_BOOTSTRAP_TOKEN");
    assert.equal(await database.user.count(), 0);
    assert.equal(await database.domainUser.count(), 0);
  });

  void it("creates one fully authorized administrator and an interactive session", async () => {
    await createBootstrapChallenge();
    const agent = request.agent(createApp());

    const setupResponse = await agent
      .post("/api/v1/setup")
      .send({
        email: "admin@example.test",
        name: "Initial Admin",
        username: "admin",
        password: "A-secure-test-password-123!",
        token: bootstrapToken,
      })
      .expect(201);

    assert.equal(setupResponse.headers["cache-control"], "no-store");
    assert.ok(setupResponse.headers["set-cookie"]);
    const setupBody = setupResponse.body as SetupBody;
    assert.equal(setupBody.user?.email, "admin@example.test");
    assert.equal(setupBody.user?.username, "admin");

    const domainUser = await database.domainUser.findFirstOrThrow({
      include: {
        authSubject: {
          include: {
            accounts: true,
          },
        },
        memberships: {
          include: {
            userGroup: {
              include: {
                permissionGrants: true,
              },
            },
          },
        },
      },
    });

    assert.equal(domainUser.authSubject?.email, "admin@example.test");
    assert.notEqual(
      domainUser.authSubject?.accounts[0]?.password,
      "A-secure-test-password-123!",
    );
    assert.equal(domainUser.memberships[0]?.userGroup.slug, "admin");
    assert.equal(domainUser.memberships[0]?.userGroup.systemKey, "administrators");
    assert.deepEqual(
      domainUser.memberships[0]?.userGroup.permissionGrants
        .map(({ permission }) => permission)
        .sort(),
      [...PERMISSIONS].sort(),
    );
    assert.ok((await database.bootstrapChallenge.findFirstOrThrow()).consumedAt);

    const sessionResponse = await agent.get("/api/auth/get-session").expect(200);
    const sessionBody = sessionResponse.body as SessionBody;
    assert.equal(sessionBody.user?.email, "admin@example.test");

    const repeatedResponse = await agent
      .post("/api/v1/setup")
      .send({
        email: "second@example.test",
        name: "Second Admin",
        username: "second",
        password: "Another-secure-password-123!",
        token: bootstrapToken,
      })
      .expect(409);
    const repeatedBody = repeatedResponse.body as ProblemBody;
    assert.equal(repeatedBody.code, "ALREADY_CONFIGURED");
    assert.equal(await database.user.count(), 1);
  });

  void it("reports whether setup is complete", async () => {
    const before = await request(createApp()).get("/api/v1/setup").expect(200);
    assert.deepEqual(before.body, { configured: false });

    await createBootstrapChallenge();
    const agent = request.agent(createApp());
    await agent
      .post("/api/v1/setup")
      .send({
        email: "admin@example.test",
        name: "Initial Admin",
        username: "admin",
        password: "A-secure-test-password-123!",
        token: bootstrapToken,
      })
      .expect(201);

    const after = await agent.get("/api/v1/setup").expect(200);
    assert.deepEqual(after.body, { configured: true });
  });

  void it("rate-limits repeated setup attempts", async () => {
    await createBootstrapChallenge();
    const app = createApp();
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await request(app).post("/api/v1/setup").send({
        email: "admin@example.test",
        name: "Initial Admin",
        username: "admin",
        password: "A-secure-test-password-123!",
        token: `omtk_bootstrap_${"C".repeat(43)}`,
      });
      statuses.push(response.status);
    }

    assert.ok(statuses.includes(429));
  });
});
