import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  currentVersion?: number;
  errors?: Array<{ field: string; code: string }>;
}

interface GrantBody {
  permission: string;
  eventId: string | null;
}

interface ServiceAccountBody {
  id: string;
  version: number;
  status: string;
  permissions: GrantBody[];
}

interface ApiKeyBody {
  id: string;
  status: string;
  displayPrefix: string;
}

interface CreatedKeyBody {
  apiKey: ApiKeyBody;
  key: string;
}

interface PageBody<T> {
  items: T[];
  page: { nextCursor: string | null; hasMore: boolean };
}

interface PrincipalBody {
  type: string;
  id: string;
  permissions: GrantBody[];
}

let app: Express;
let admin: TestUser;

async function createServiceAccount(
  user: TestUser,
  permissions: GrantBody[] = [{ permission: "members.sync", eventId: null }],
): Promise<ServiceAccountBody> {
  const response = await request(app)
    .post("/api/v1/service-accounts")
    .set("Cookie", user.cookie)
    .send({ name: "Discord bot", permissions })
    .expect(201);
  return response.body as ServiceAccountBody;
}

async function createKey(serviceAccountId: string): Promise<CreatedKeyBody> {
  const response = await request(app)
    .post(`/api/v1/service-accounts/${serviceAccountId}/api-keys`)
    .set("Cookie", admin.cookie)
    .send({ name: "production" })
    .expect(201);
  assert.equal(response.headers["cache-control"], "no-store");
  return response.body as CreatedKeyBody;
}

function principalWithKey(key: string): request.Test {
  return request(app).get("/api/v1/principal").set("Authorization", `Bearer ${key}`);
}

void describe("service accounts and API keys", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("denies unauthenticated management requests", async () => {
    const response = await request(app).get("/api/v1/service-accounts").expect(401);
    assert.equal((response.body as ProblemBody).code, "AUTHENTICATION_REQUIRED");
  });

  void it("creates, reads and audits a scoped service account", async () => {
    const eventId = await createEvent();
    const created = await createServiceAccount(admin, [
      { permission: "members.sync", eventId },
      { permission: "events.read", eventId: null },
    ]);

    assert.equal(created.status, "active");
    assert.equal(created.version, 1);
    assert.deepEqual(
      created.permissions.map(({ permission, eventId: scope }) => `${permission}@${String(scope)}`).sort(),
      ["events.read@null", `members.sync@${eventId}`],
    );

    await request(app)
      .get(`/api/v1/service-accounts/${created.id}`)
      .set("Cookie", admin.cookie)
      .expect(200);

    const audit = await database.auditEvent.findFirstOrThrow({
      where: { action: "service-account.created" },
    });
    assert.equal(audit.actorId, admin.id);
    assert.equal(audit.targetId, created.id);
  });

  void it("rejects invalid permission scopes and unknown events", async () => {
    const response = await request(app)
      .post("/api/v1/service-accounts")
      .set("Cookie", admin.cookie)
      .send({
        name: "Invalid",
        permissions: [
          { permission: "audit.read", eventId: await createEvent() },
          { permission: "members.sync", eventId: "00000000-0000-4000-8000-000000000000" },
        ],
      })
      .expect(422);

    assert.deepEqual(
      (response.body as ProblemBody).errors?.map(({ code }) => code),
      ["SCOPE_NOT_SUPPORTED", "NOT_FOUND"],
    );
    assert.equal(await database.serviceAccount.count(), 0);
  });

  void it("rejects unknown permissions and unknown fields", async () => {
    await request(app)
      .post("/api/v1/service-accounts")
      .set("Cookie", admin.cookie)
      .send({ name: "Invalid", permissions: [{ permission: "root", eventId: null }] })
      .expect(422);

    await request(app)
      .post("/api/v1/service-accounts")
      .set("Cookie", admin.cookie)
      .send({ name: "Invalid", permissions: [], isAdmin: true })
      .expect(422);
  });

  void it("prevents granting permissions the actor does not hold", async () => {
    const manager = await createUser("Manager", [
      { permission: "service-accounts.manage" },
      { permission: "members.sync" },
    ]);

    await createServiceAccount(manager, [{ permission: "members.sync", eventId: null }]);

    const response = await request(app)
      .post("/api/v1/service-accounts")
      .set("Cookie", manager.cookie)
      .send({ name: "Escalation", permissions: [{ permission: "users.manage", eventId: null }] })
      .expect(403);
    assert.equal((response.body as ProblemBody).code, "FORBIDDEN");
  });

  void it("denies users without service-account management permission", async () => {
    const viewer = await createUser("Viewer", [{ permission: "events.read" }]);
    await request(app).get("/api/v1/service-accounts").set("Cookie", viewer.cookie).expect(403);
  });

  void it("returns an API key once and stores only its digest", async () => {
    const account = await createServiceAccount(admin);
    const created = await createKey(account.id);

    assert.match(created.key, /^omtk_sa_[0-9a-f]{24}_[A-Za-z0-9_-]{43}$/);
    assert.ok(created.key.startsWith(`${created.apiKey.displayPrefix}_`));

    const stored = await database.apiKey.findUniqueOrThrow({ where: { id: created.apiKey.id } });
    const secret = created.key.slice(created.apiKey.displayPrefix.length + 1);
    assert.ok(!JSON.stringify(stored).includes(secret));

    const list = await request(app)
      .get(`/api/v1/service-accounts/${account.id}/api-keys`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.ok(!JSON.stringify(list.body).includes(secret));
    assert.equal((list.body as PageBody<ApiKeyBody>).items[0]?.status, "active");

    const audits = await database.auditEvent.findMany();
    assert.ok(!JSON.stringify(audits).includes(secret));
  });

  void it("authenticates a service account by bearer key with its own grants only", async () => {
    const account = await createServiceAccount(admin);
    const { key } = await createKey(account.id);

    const response = await principalWithKey(key).expect(200);
    const principal = response.body as PrincipalBody;
    assert.equal(principal.type, "service-account");
    assert.equal(principal.id, account.id);
    assert.deepEqual(principal.permissions, [{ permission: "members.sync", eventId: null }]);

    // Credential management is session-only, even for a key whose account could be granted it.
    await request(app)
      .get("/api/v1/service-accounts")
      .set("Authorization", `Bearer ${key}`)
      .expect(401);
  });

  void it("supports overlapping rotation and immediate revocation", async () => {
    const account = await createServiceAccount(admin);
    const first = await createKey(account.id);
    const second = await createKey(account.id);

    await principalWithKey(first.key).expect(200);
    await principalWithKey(second.key).expect(200);
    assert.equal(await database.auditEvent.count({ where: { action: "api-key.rotated" } }), 1);

    const revoked = await request(app)
      .post(`/api/v1/service-accounts/${account.id}/api-keys/${first.apiKey.id}/revoke`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.equal((revoked.body as ApiKeyBody).status, "revoked");

    await principalWithKey(first.key).expect(401);
    await principalWithKey(second.key).expect(200);

    const failure = await database.auditEvent.findFirstOrThrow({
      where: { action: "api-key.authentication-failed" },
    });
    assert.equal(failure.targetId, first.apiKey.id);
    assert.equal(failure.result, "failure");
  });

  void it("rejects tampered and expired keys with the same generic problem", async () => {
    const account = await createServiceAccount(admin);
    const { key, apiKey } = await createKey(account.id);
    const tampered = `${key.slice(0, -1)}${key.endsWith("A") ? "B" : "A"}`;

    const tamperedResponse = await principalWithKey(tampered).expect(401);
    assert.equal((tamperedResponse.body as ProblemBody).code, "AUTHENTICATION_REQUIRED");

    await database.apiKey.update({
      where: { id: apiKey.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expiredResponse = await principalWithKey(key).expect(401);
    assert.equal(
      (expiredResponse.body as ProblemBody).code,
      (tamperedResponse.body as ProblemBody).code,
    );
  });

  void it("disables every key when the service account is disabled", async () => {
    const account = await createServiceAccount(admin);
    const { key } = await createKey(account.id);

    const updated = await request(app)
      .put(`/api/v1/service-accounts/${account.id}`)
      .set("Cookie", admin.cookie)
      .send({
        version: account.version,
        name: "Discord bot",
        description: null,
        status: "disabled",
        permissions: account.permissions,
      })
      .expect(200);
    assert.equal((updated.body as ServiceAccountBody).version, 2);

    await principalWithKey(key).expect(401);
  });

  void it("detects stale updates through the version", async () => {
    const account = await createServiceAccount(admin);
    const update = {
      version: account.version,
      name: "Renamed",
      description: null,
      status: "active",
      permissions: account.permissions,
    };

    await request(app)
      .put(`/api/v1/service-accounts/${account.id}`)
      .set("Cookie", admin.cookie)
      .send(update)
      .expect(200);
    const stale = await request(app)
      .put(`/api/v1/service-accounts/${account.id}`)
      .set("Cookie", admin.cookie)
      .send(update)
      .expect(409);

    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");
    assert.equal((stale.body as ProblemBody).currentVersion, 2);
  });

  void it("requires a recent sign-in before creating API keys", async () => {
    const account = await createServiceAccount(admin);
    await database.session.updateMany({
      where: { userId: admin.authSubjectId },
      data: { createdAt: new Date(Date.now() - 60 * 60_000) },
    });

    const response = await request(app)
      .post(`/api/v1/service-accounts/${account.id}/api-keys`)
      .set("Cookie", admin.cookie)
      .send({ name: "late" })
      .expect(403);
    assert.equal((response.body as ProblemBody).code, "RECENT_AUTHENTICATION_REQUIRED");
    assert.equal(await database.apiKey.count(), 0);
  });

  void it("paginates with opaque cursors and rejects unknown query parameters", async () => {
    for (let index = 0; index < 3; index += 1) {
      await createServiceAccount(admin);
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: Record<string, string> = { limit: "2" };
      if (cursor !== null) {
        query.cursor = cursor;
      }
      const response = await request(app)
        .get("/api/v1/service-accounts")
        .query(query)
        .set("Cookie", admin.cookie)
        .expect(200);
      const page = response.body as PageBody<ServiceAccountBody>;
      seen.push(...page.items.map(({ id }) => id));
      cursor = page.page.nextCursor;
    } while (cursor !== null);

    assert.equal(new Set(seen).size, 3);

    await request(app)
      .get("/api/v1/service-accounts?cursor=not-a-cursor")
      .set("Cookie", admin.cookie)
      .expect(400);
    await request(app)
      .get("/api/v1/service-accounts?status=active")
      .set("Cookie", admin.cookie)
      .expect(422);
    await request(app)
      .get("/api/v1/service-accounts?limit=101")
      .set("Cookie", admin.cookie)
      .expect(422);
  });
});
