import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { ADMINISTRATORS_SYSTEM_KEY } from "../src/modules/user-groups/system-groups.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
}

let app: Express;
let admin: TestUser;
let adminGroupId: string;

async function groupOf(user: TestUser): Promise<string> {
  const membership = await database.userGroupMembership.findFirstOrThrow({ where: { userId: user.id } });
  return membership.userGroupId;
}

function member(groupId: string, userId: string, method: "put" | "delete", actor = admin): request.Test {
  return request(app)[method](`/api/v1/user-groups/${groupId}/members/${userId}`).set("Cookie", actor.cookie);
}

void describe("user-group members", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })), {
      systemKey: ADMINISTRATORS_SYSTEM_KEY,
    });
    adminGroupId = await groupOf(admin);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("adds members idempotently, grants access and lists them", async () => {
    const readers = await createUser("Readers owner", [{ permission: "users.read" }]);
    const readersGroupId = await groupOf(readers);
    const newcomer = await createUser("Newcomer", []);

    await request(app).get("/api/v1/users").set("Cookie", newcomer.cookie).expect(403);
    await member(readersGroupId, newcomer.id, "put").expect(204);
    await member(readersGroupId, newcomer.id, "put").expect(204);
    await request(app).get("/api/v1/users").set("Cookie", newcomer.cookie).expect(200);

    const list = await request(app)
      .get(`/api/v1/user-groups/${readersGroupId}/members`)
      .set("Cookie", admin.cookie)
      .expect(200);
    assert.deepEqual(
      (list.body as { items: Array<{ id: string }> }).items.map(({ id }) => id).sort(),
      [readers.id, newcomer.id].sort(),
    );
    assert.equal(await database.auditEvent.count({ where: { action: "user-group.member-added" } }), 1);
  });

  void it("removes members and their access immediately", async () => {
    const reader = await createUser("Reader", [{ permission: "users.read" }]);
    await member(await groupOf(reader), reader.id, "delete").expect(204);
    await request(app).get("/api/v1/users").set("Cookie", reader.cookie).expect(403);
    await member(await groupOf(admin), reader.id, "delete").expect(404);
  });

  void it("refuses membership in groups whose grants the actor does not hold", async () => {
    const manager = await createUser("Manager", [{ permission: "user-groups.manage" }]);
    const newcomer = await createUser("Newcomer", []);

    const response = await member(adminGroupId, newcomer.id, "put", manager).expect(403);
    assert.equal((response.body as ProblemBody).code, "FORBIDDEN");
    await member(adminGroupId, manager.id, "put", manager).expect(403);
  });

  void it("keeps at least one member in the Admin system group", async () => {
    const second = await createUser("Second admin", []);
    await member(adminGroupId, second.id, "put").expect(204);
    await member(adminGroupId, second.id, "delete").expect(204);

    const response = await member(adminGroupId, admin.id, "delete").expect(409);
    assert.equal((response.body as ProblemBody).code, "SYSTEM_GROUP_PROTECTED");
    assert.equal(await database.userGroupMembership.count({ where: { userGroupId: adminGroupId } }), 1);
  });

  void it("returns 404 for unknown users and groups", async () => {
    const unknown = "00000000-0000-4000-8000-000000000000";
    await member(adminGroupId, unknown, "put").expect(404);
    await member(unknown, admin.id, "put").expect(404);
  });
});
