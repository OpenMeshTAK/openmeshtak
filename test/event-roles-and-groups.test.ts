import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
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

interface ItemBody {
  id: string;
  eventId: string;
  slug: string;
  version: number;
}

interface PageBody {
  items: ItemBody[];
}

let app: Express;
let admin: TestUser;

after(async () => {
  await clearDatabase();
  await disconnectDatabase();
});

for (const kind of ["roles", "groups"] as const) {
  const auditPrefix = kind === "roles" ? "event-role" : "event-group";
  // Groups additionally carry provisioning settings that updates must replace completely.
  const extra =
    kind === "groups"
      ? {
          provisioning: {
            callsignFormat: "{username} [Bravo]",
            shortNamePrefix: "B",
            tak: { team: "Purple", role: "Team Member", serverGroups: ["global", "bravo"] },
            meshtastic: { deviceRole: "CLIENT", channels: ["global", "bravo"] },
            missionGroups: ["global", "bravo"],
          },
        }
      : {};

  void describe(`event ${kind}`, () => {
    let eventId: string;
    let base: string;

    beforeEach(async () => {
      await clearDatabase();
      app = createApp();
      admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
      eventId = await createEvent();
      base = `/api/v1/events/${eventId}/${kind}`;
    });

    function createItem(slug: string, user: TestUser = admin): request.Test {
      return request(app).post(base).set("Cookie", user.cookie).send({ name: slug, slug });
    }

    void it("creates, lists, updates and deletes with audit records", async () => {
      const created = (await createItem("bravo").expect(201)).body as ItemBody;
      assert.equal(created.eventId, eventId);
      assert.equal(created.version, 1);

      const list = await request(app).get(base).set("Cookie", admin.cookie).expect(200);
      assert.deepEqual((list.body as PageBody).items.map(({ id }) => id), [created.id]);

      const updated = await request(app)
        .put(`${base}/${created.id}`)
        .set("Cookie", admin.cookie)
        .send({ version: 1, name: "Bravo", slug: "bravo-team", description: "Second squad", ...extra })
        .expect(200);
      assert.equal((updated.body as ItemBody).version, 2);

      const stale = await request(app)
        .put(`${base}/${created.id}`)
        .set("Cookie", admin.cookie)
        .send({ version: 1, name: "Stale", slug: "bravo", description: null, ...extra })
        .expect(409);
      assert.equal((stale.body as ProblemBody).code, "VERSION_CONFLICT");

      await request(app).delete(`${base}/${created.id}`).set("Cookie", admin.cookie).expect(204);
      await request(app).get(`${base}/${created.id}`).set("Cookie", admin.cookie).expect(404);

      const actions = (await database.auditEvent.findMany({ orderBy: { occurredAt: "asc" } })).map(
        ({ action }) => action,
      );
      assert.deepEqual(actions.filter((action) => action.startsWith(auditPrefix)), [
        `${auditPrefix}.created`,
        `${auditPrefix}.updated`,
        `${auditPrefix}.deleted`,
      ]);
    });

    void it("keeps slugs unique per event but allows reuse across events", async () => {
      await createItem("bravo").expect(201);
      const duplicate = await createItem("bravo").expect(409);
      assert.equal((duplicate.body as ProblemBody).code, "SLUG_CONFLICT");

      const otherEvent = await createEvent();
      await request(app)
        .post(`/api/v1/events/${otherEvent}/${kind}`)
        .set("Cookie", admin.cookie)
        .send({ name: "Bravo", slug: "bravo" })
        .expect(201);
    });

    void it("does not reach items through a different event", async () => {
      const created = (await createItem("bravo").expect(201)).body as ItemBody;
      const otherEvent = await createEvent();

      await request(app)
        .get(`/api/v1/events/${otherEvent}/${kind}/${created.id}`)
        .set("Cookie", admin.cookie)
        .expect(404);
    });

    void it("rejects changes to archived events", async () => {
      const created = (await createItem("bravo").expect(201)).body as ItemBody;
      await database.event.update({ where: { id: eventId }, data: { status: "archived" } });

      await request(app).get(base).set("Cookie", admin.cookie).expect(200);
      const response = await createItem("charlie").expect(409);
      assert.equal((response.body as ProblemBody).code, "EVENT_ARCHIVED");
      await request(app).delete(`${base}/${created.id}`).set("Cookie", admin.cookie).expect(409);
    });

    void it("enforces event-scoped read and manage permissions", async () => {
      const otherEvent = await createEvent();
      const reader = await createUser("Reader", [{ permission: "events.read", eventId }]);

      await request(app).get(base).set("Cookie", reader.cookie).expect(200);
      await createItem("bravo", reader).expect(403);
      await request(app)
        .get(`/api/v1/events/${otherEvent}/${kind}`)
        .set("Cookie", reader.cookie)
        .expect(404);

      const key = await createServiceAccountKey([
        { permission: "events.read", eventId },
        { permission: "events.manage", eventId },
      ]);
      await request(app)
        .post(base)
        .set("Authorization", `Bearer ${key}`)
        .send({ name: "Alpha", slug: "alpha" })
        .expect(201);
      await request(app)
        .post(`/api/v1/events/${otherEvent}/${kind}`)
        .set("Authorization", `Bearer ${key}`)
        .send({ name: "Alpha", slug: "alpha" })
        .expect(404);
    });
  });
}
