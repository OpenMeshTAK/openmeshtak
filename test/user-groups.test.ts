import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  ADMINISTRATORS_SYSTEM_KEY,
  ensureAdministratorGrants,
} from "../src/modules/user-groups/system-groups.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createEvent,
  createServiceAccountKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface ProblemBody {
  code?: string;
}

interface GrantBody {
  permission: string;
  eventId: string | null;
}

interface UserGroupBody {
  id: string;
  slug: string;
  name: string;
  system: boolean;
  version: number;
  memberCount: number;
  permissions: GrantBody[];
}

let app: Express;
let admin: TestUser;

async function adminGroup(): Promise<UserGroupBody> {
  const group = await database.userGroup.findUniqueOrThrow({
    where: { systemKey: ADMINISTRATORS_SYSTEM_KEY },
  });
  const response = await request(app)
    .get(`/api/v1/user-groups/${group.id}`)
    .set("Cookie", admin.cookie)
    .expect(200);
  return response.body as UserGroupBody;
}

function createGroup(slug: string, permissions: GrantBody[], user: TestUser = admin): request.Test {
  return request(app)
    .post("/api/v1/user-groups")
    .set("Cookie", user.cookie)
    .send({ name: slug, slug, permissions });
}

void describe("user groups", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })), {
      systemKey: ADMINISTRATORS_SYSTEM_KEY,
    });
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("creates, lists and audits groups with instance and event grants", async () => {
    const eventId = await createEvent();
    const created = (
      await createGroup("editors", [
        { permission: "missions.edit", eventId },
        { permission: "events.read", eventId: null },
      ]).expect(201)
    ).body as UserGroupBody;

    assert.equal(created.system, false);
    assert.equal(created.memberCount, 0);
    assert.equal(created.permissions.length, 2);

    const list = await request(app).get("/api/v1/user-groups").set("Cookie", admin.cookie).expect(200);
    assert.deepEqual(
      (list.body as { items: UserGroupBody[] }).items.map(({ slug }) => slug).sort(),
      [(await adminGroup()).slug, "editors"].sort(),
    );

    const audit = await database.auditEvent.findFirstOrThrow({ where: { action: "user-group.created" } });
    assert.equal(audit.targetId, created.id);
  });

  void it("prevents granting permissions the actor does not hold", async () => {
    const manager = await createUser("Manager", [
      { permission: "user-groups.manage" },
      { permission: "events.read" },
    ]);

    await createGroup("readers", [{ permission: "events.read", eventId: null }], manager).expect(201);
    const response = await createGroup(
      "escalation",
      [{ permission: "users.manage", eventId: null }],
      manager,
    ).expect(403);
    assert.equal((response.body as ProblemBody).code, "FORBIDDEN");
  });

  void it("updates with optimistic concurrency and unique slugs", async () => {
    const created = (await createGroup("editors", []).expect(201)).body as UserGroupBody;
    await createGroup("viewers", []).expect(201);
    const update = { version: 1, name: "Editors", slug: "editors", permissions: [] };

    await request(app)
      .put(`/api/v1/user-groups/${created.id}`)
      .set("Cookie", admin.cookie)
      .send(update)
      .expect(200);
    const stale = await request(app)
      .put(`/api/v1/user-groups/${created.id}`)
      .set("Cookie", admin.cookie)
      .send(update)
      .expect(409);
    assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");

    const conflict = await request(app)
      .put(`/api/v1/user-groups/${created.id}`)
      .set("Cookie", admin.cookie)
      .send({ ...update, version: 2, slug: "viewers" })
      .expect(409);
    assert.equal((conflict.body as ProblemBody).code, "SLUG_CONFLICT");
  });

  void it("protects the Admin system group", async () => {
    const group = await adminGroup();
    assert.equal(group.system, true);

    const deletion = await request(app)
      .delete(`/api/v1/user-groups/${group.id}`)
      .set("Cookie", admin.cookie)
      .expect(409);
    assert.equal((deletion.body as ProblemBody).code, "SYSTEM_GROUP_PROTECTED");

    await request(app)
      .put(`/api/v1/user-groups/${group.id}`)
      .set("Cookie", admin.cookie)
      .send({ version: group.version, name: "Admins", slug: group.slug, permissions: [] })
      .expect(409);

    const renamed = await request(app)
      .put(`/api/v1/user-groups/${group.id}`)
      .set("Cookie", admin.cookie)
      .send({
        version: group.version,
        name: "Administrators",
        slug: group.slug,
        permissions: group.permissions,
      })
      .expect(200);
    assert.equal((renamed.body as UserGroupBody).name, "Administrators");
  });

  void it("removes access immediately when a group is deleted", async () => {
    const reader = await createUser("Reader", [{ permission: "users.read" }]);
    await request(app).get("/api/v1/users").set("Cookie", reader.cookie).expect(200);

    const membership = await database.userGroupMembership.findFirstOrThrow({
      where: { userId: reader.id },
    });
    await request(app)
      .delete(`/api/v1/user-groups/${membership.userGroupId}`)
      .set("Cookie", admin.cookie)
      .expect(204);

    await request(app).get("/api/v1/users").set("Cookie", reader.cookie).expect(403);
  });

  void it("is not available to API keys", async () => {
    const key = await createServiceAccountKey([{ permission: "events.read" }]);
    await request(app).get("/api/v1/user-groups").set("Authorization", `Bearer ${key}`).expect(401);
  });

  void it("adds permissions introduced after setup to the Admin group", async () => {
    const group = await database.userGroup.findUniqueOrThrow({
      where: { systemKey: ADMINISTRATORS_SYSTEM_KEY },
    });
    await database.permissionGrant.deleteMany({
      where: { userGroupId: group.id, permission: "audit.read" },
    });

    await ensureAdministratorGrants();
    await ensureAdministratorGrants();

    assert.equal(
      await database.permissionGrant.count({ where: { userGroupId: group.id } }),
      PERMISSIONS.length,
    );
  });
});
