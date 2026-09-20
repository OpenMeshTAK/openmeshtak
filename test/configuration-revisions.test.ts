import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
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

interface RevisionBody {
  id: string;
  number: number;
  reason: string;
  snapshot: {
    schemaVersion: number;
    roles: Array<{ slug: string }>;
    groups: Array<{ slug: string; provisioning: { tak: { team: string } } }>;
  };
}

interface GroupBody {
  id: string;
  version: number;
  provisioning: Record<string, unknown> & { tak: Record<string, unknown> };
}

let app: Express;
let admin: TestUser;
let eventId: string;
let group: GroupBody;

function url(path = ""): string {
  return `/api/v1/events/${eventId}${path}`;
}

async function transition(name: string, version: number): Promise<void> {
  await request(app).post(url(`/${name}`)).set("Cookie", admin.cookie).send({ version }).expect(200);
}

function publish(): request.Test {
  return request(app).post(url("/configuration-revisions")).set("Cookie", admin.cookie);
}

async function revisions(): Promise<Array<{ number: number; reason: string }>> {
  const response = await request(app)
    .get(url("/configuration-revisions"))
    .set("Cookie", admin.cookie)
    .expect(200);
  return (response.body as { items: Array<{ number: number; reason: string }> }).items;
}

void describe("event configuration revisions", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();

    await request(app)
      .post(url("/roles"))
      .set("Cookie", admin.cookie)
      .send({ name: "Participant", slug: "participant" })
      .expect(201);
    group = (
      await request(app)
        .post(url("/groups"))
        .set("Cookie", admin.cookie)
        .send({ name: "Bravo", slug: "bravo" })
        .expect(201)
    ).body as GroupBody;
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("snapshots the configuration on activation", async () => {
    await transition("activate", 1);
    const [first] = await revisions();
    assert.deepEqual(first && { number: first.number, reason: first.reason }, {
      number: 1,
      reason: "activation",
    });

    const listed = await request(app).get(url("/configuration-revisions")).set("Cookie", admin.cookie);
    const id = (listed.body as { items: Array<{ id: string }> }).items[0]?.id ?? "";
    const detail = (
      await request(app).get(url(`/configuration-revisions/${id}`)).set("Cookie", admin.cookie).expect(200)
    ).body as RevisionBody;
    assert.equal(detail.snapshot.schemaVersion, 4);
    assert.deepEqual(detail.snapshot.roles.map(({ slug }) => slug), ["participant"]);
    assert.equal(detail.snapshot.groups[0]?.provisioning.tak.team, "Cyan");
  });

  void it("refuses to activate or publish a secondary channel without an audience", async () => {
    const createChannel = (name: string, groupIds: string[]) =>
      request(app)
        .post(url("/meshtastic/channels"))
        .set("Cookie", admin.cookie)
        .send({ name, audience: { groupIds, roleIds: [], memberIds: [] } })
        .expect(201);
    await createChannel("Event", []);
    await createChannel("Bravo", [group.id]);
    await createChannel("Empty", []);

    const refused = await request(app)
      .post(url("/activate"))
      .set("Cookie", admin.cookie)
      .send({ version: 1 })
      .expect(409);
    assert.deepEqual(
      (refused.body as { errors: Array<{ field: string }> }).errors.map(({ field }) => field),
      ["channels.Empty.audience"],
    );

    const channels = (await request(app).get(url("/meshtastic/channels")).set("Cookie", admin.cookie))
      .body as { items: Array<{ id: string; name: string }> };
    const empty = channels.items.find(({ name }) => name === "Empty");
    await request(app).delete(url(`/meshtastic/channels/${empty?.id ?? ""}`)).set("Cookie", admin.cookie).expect(204);
    await transition("activate", 1);

    await request(app).delete(url(`/groups/${group.id}`)).set("Cookie", admin.cookie).expect(204);
    const unpublishable = await publish().expect(409);
    assert.equal((unpublishable.body as { code: string }).code, "EVENT_NOT_READY");
  });

  void it("publishes changes, skips unchanged configurations and keeps old snapshots immutable", async () => {
    await transition("activate", 1);

    const unchanged = (await publish().expect(200)).body as { created: boolean; revision: RevisionBody };
    assert.equal(unchanged.created, false);
    assert.equal(unchanged.revision.number, 1);

    await request(app)
      .put(url(`/groups/${group.id}`))
      .set("Cookie", admin.cookie)
      .send({
        version: group.version,
        name: "Bravo",
        slug: "bravo",
        description: null,
        provisioning: { ...group.provisioning, tak: { ...group.provisioning.tak, team: "Purple" } },
      })
      .expect(200);

    const published = (await publish().expect(200)).body as { created: boolean; revision: RevisionBody };
    assert.equal(published.created, true);
    assert.equal(published.revision.number, 2);
    assert.equal(published.revision.snapshot.groups[0]?.provisioning.tak.team, "Purple");

    const all = await revisions();
    assert.deepEqual(all.map(({ number, reason }) => `${String(number)}:${reason}`), [
      "1:activation",
      "2:publish",
    ]);
  });

  void it("creates a reactivation revision and refuses to publish inactive events", async () => {
    const draft = await publish().expect(409);
    assert.equal((draft.body as ProblemBody).code, "EVENT_NOT_ACTIVE");

    await transition("activate", 1);
    await transition("archive", 2);
    await publish().expect(409);
    await transition("reactivate", 3);

    assert.deepEqual((await revisions()).map(({ reason }) => reason), ["activation", "reactivation"]);
  });

  void it("requires events.manage to publish", async () => {
    await transition("activate", 1);
    const reader = await createServiceAccountKey([{ permission: "events.read", eventId }]);

    await request(app)
      .post(url("/configuration-revisions"))
      .set("Authorization", `Bearer ${reader}`)
      .expect(403);
    await request(app)
      .get(url("/configuration-revisions"))
      .set("Authorization", `Bearer ${reader}`)
      .expect(200);
  });
});
