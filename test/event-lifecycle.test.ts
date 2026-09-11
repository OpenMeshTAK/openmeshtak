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

interface EventBody {
  status: string;
  version: number;
}

let app: Express;
let admin: TestUser;
let eventId: string;

function transition(
  name: "activate" | "archive" | "reactivate",
  version: number,
  user: TestUser = admin,
): request.Test {
  return request(app)
    .post(`/api/v1/events/${eventId}/${name}`)
    .set("Cookie", user.cookie)
    .send({ version });
}

async function addRoleAndGroup(): Promise<void> {
  for (const kind of ["roles", "groups"]) {
    await request(app)
      .post(`/api/v1/events/${eventId}/${kind}`)
      .set("Cookie", admin.cookie)
      .send({ name: "Default", slug: "default" })
      .expect(201);
  }
}

void describe("event lifecycle", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("lists every unmet activation requirement and keeps the draft", async () => {
    const response = await transition("activate", 1).expect(409);
    const body = response.body as ProblemBody;

    assert.equal(body.code, "EVENT_NOT_READY");
    assert.deepEqual(body.errors?.map(({ field }) => field), ["roles", "groups"]);
    assert.equal((await database.event.findUniqueOrThrow({ where: { id: eventId } })).status, "draft");
  });

  void it("runs draft -> active -> archived -> active with audited transitions", async () => {
    await addRoleAndGroup();

    const active = (await transition("activate", 1).expect(200)).body as EventBody;
    assert.deepEqual(active, { ...active, status: "active", version: 2 });

    const archived = (await transition("archive", 2).expect(200)).body as EventBody;
    assert.deepEqual(archived, { ...archived, status: "archived", version: 3 });

    const reactivated = (await transition("reactivate", 3).expect(200)).body as EventBody;
    assert.deepEqual(reactivated, { ...reactivated, status: "active", version: 4 });

    const audits = await database.auditEvent.findMany({
      where: { targetType: "event", targetId: eventId },
      orderBy: { occurredAt: "asc" },
    });
    assert.deepEqual(
      audits.map(({ action, metadata }) => [action, metadata]),
      [
        ["event.activated", { previousStatus: "draft", status: "active" }],
        ["event.archived", { previousStatus: "active", status: "archived" }],
        ["event.reactivated", { previousStatus: "archived", status: "active" }],
      ],
    );
  });

  void it("rejects transitions that are not part of the lifecycle", async () => {
    await addRoleAndGroup();

    const draftToArchived = await transition("archive", 1).expect(409);
    assert.equal((draftToArchived.body as ProblemBody).code, "INVALID_EVENT_TRANSITION");
    await transition("reactivate", 1).expect(409);

    await transition("activate", 1).expect(200);
    const activeAgain = await transition("activate", 2).expect(409);
    assert.equal((activeAgain.body as ProblemBody).code, "INVALID_EVENT_TRANSITION");
  });

  void it("rejects stale versions", async () => {
    await addRoleAndGroup();
    await database.event.update({ where: { id: eventId }, data: { version: 5 } });

    const response = await transition("activate", 1).expect(409);
    assert.equal((response.body as ProblemBody).code, "VERSION_CONFLICT");
    assert.equal((response.body as ProblemBody).currentVersion, 5);
  });

  void it("requires events.reactivate in addition to events.manage", async () => {
    await addRoleAndGroup();
    const manager = await createUser("Manager", [
      { permission: "events.read", eventId },
      { permission: "events.manage", eventId },
    ]);

    await transition("activate", 1, manager).expect(200);
    await transition("archive", 2, manager).expect(200);
    const response = await transition("reactivate", 3, manager).expect(403);
    assert.equal((response.body as ProblemBody).code, "FORBIDDEN");

    const reactivator = await createUser("Reactivator", [
      { permission: "events.read", eventId },
      { permission: "events.reactivate", eventId },
    ]);
    await transition("reactivate", 3, reactivator).expect(200);
  });

  void it("repeats activation validation on reactivation", async () => {
    await addRoleAndGroup();
    await transition("activate", 1).expect(200);
    await transition("archive", 2).expect(200);
    await database.eventRole.deleteMany({ where: { eventId } });

    const response = await transition("reactivate", 3).expect(409);
    assert.equal((response.body as ProblemBody).code, "EVENT_NOT_READY");
    assert.deepEqual((response.body as ProblemBody).errors?.map(({ field }) => field), ["roles"]);
  });

  void it("requires a short-name prefix for every group before activation", async () => {
    await addRoleAndGroup();
    await database.eventGroup.updateMany({ where: { eventId }, data: { shortNamePrefix: null } });

    const response = await transition("activate", 1).expect(409);
    assert.deepEqual((response.body as ProblemBody).errors?.map(({ field }) => field), [
      "groups.default.provisioning.shortNamePrefix",
    ]);
  });

  void it("conceals events outside the caller's scope", async () => {
    const outsider = await createUser("Outsider", [{ permission: "events.manage", eventId: await createEvent() }]);
    await transition("activate", 1, outsider).expect(404);
  });
});
