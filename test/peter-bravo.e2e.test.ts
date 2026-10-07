import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import {
  clearDatabase,
  createEvent,
  createApiClientKey,
  createUser,
  type TestUser,
} from "./support/identity.js";

interface ProfileBody {
  source: string;
  configurationRevision: { number: number } | null;
  callsign: string;
  eventRole: { slug: string };
  group: { slug: string };
  tak: { callsign: string; team: string; role: string; serverGroups: string[] };
  meshtastic: {
    longName: string;
    shortName: string | null;
    channels: Array<{ name: string; primary: boolean; delivery: string; keyHolder: boolean }>;
    firmware: Record<string, unknown> & { flashingNotes?: string | null } | null;
  };
}

const bravoProvisioning = {
  callsignFormat: "{username} [Bravo]",
  shortNamePrefix: "B",
  tak: { team: "Purple", role: "Team Member", serverGroups: ["global", "bravo"] },
};

let app: Express;
let admin: TestUser;
let eventId: string;
let bravoId: string;
let memberId: string;
let commandId: string;
let peterCookie: string;

function profileUrl(): string {
  return `/api/v1/events/${eventId}/members/${memberId}/profile`;
}

function channelSummary(profile: ProfileBody): string[] {
  return profile.meshtastic.channels.map(
    ({ name, primary, delivery }) => `${name}${primary ? "*" : ""}:${delivery}`,
  );
}

function createChannel(body: Record<string, unknown>): request.Test {
  return request(app)
    .post(`/api/v1/events/${eventId}/meshtastic/channels`)
    .set("Cookie", admin.cookie)
    .send(body)
    .expect(201);
}

async function profileAs(cookie: string, status = 200): Promise<ProfileBody> {
  return (await request(app).get(profileUrl()).set("Cookie", cookie).expect(status)).body as ProfileBody;
}

/**
 * The end-to-end acceptance example: a bot synchronizes Peter into Bravo and Peter sees the resolved
 * profile after claiming access. Steps build on each other and run in order.
 */
void describe("Peter/Bravo end to end", () => {
  before(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("configures the event, synchronizes Peter and previews the draft profile", async () => {
    await request(app)
      .post(`/api/v1/events/${eventId}/roles`)
      .set("Cookie", admin.cookie)
      .send({ name: "Participant", slug: "participant" })
      .expect(201);
    const bravo = await request(app)
      .post(`/api/v1/events/${eventId}/groups`)
      .set("Cookie", admin.cookie)
      .send({ name: "Bravo", slug: "bravo", provisioning: bravoProvisioning })
      .expect(201);
    bravoId = (bravo.body as { id: string }).id;
    const charlie = await request(app)
      .post(`/api/v1/events/${eventId}/groups`)
      .set("Cookie", admin.cookie)
      .send({ name: "Charlie", slug: "charlie" })
      .expect(201);
    const charlieId = (charlie.body as { id: string }).id;

    const only = (groupIds: string[]) => ({ groupIds, roleIds: [], memberIds: [] });
    await createChannel({ name: "Event" });
    await createChannel({ name: "Bravo", audience: only([bravoId]) });
    await createChannel({ name: "Charlie", audience: only([charlieId]) });
    const command = await createChannel({
      name: "Command",
      secret: true,
      audience: only([bravoId, charlieId]),
    });
    commandId = (command.body as { id: string }).id;

    const bot = await createApiClientKey([{ permission: "members.sync", eventId }]);
    const synced = await request(app)
      .put(`/api/v1/events/${eventId}/external-members/discord/123456789`)
      .set("Authorization", `Bearer ${bot}`)
      .send({ username: "Peter", eventRole: "participant", group: "bravo" })
      .expect(200);
    memberId = (synced.body as { member: { id: string } }).member.id;

    const preview = await profileAs(admin.cookie);
    assert.equal(preview.source, "preview");
    assert.equal(preview.configurationRevision, null);
  });

  void it("activates the event and resolves the published Peter [Bravo] profile", async () => {
    await request(app)
      .post(`/api/v1/events/${eventId}/activate`)
      .set("Cookie", admin.cookie)
      .send({ version: 1 })
      .expect(200);

    const profile = await profileAs(admin.cookie);
    assert.deepEqual(profile, {
      ...profile,
      source: "published",
      configurationRevision: { ...profile.configurationRevision, number: 1 },
      callsign: "Peter [Bravo]",
      eventRole: { slug: "participant", name: "Participant" },
      group: { slug: "bravo", name: "Bravo" },
      tak: { callsign: "Peter [Bravo]", team: "Purple", role: "Team Member", serverGroups: ["global", "bravo"], connection: null },
      meshtastic: {
        ...profile.meshtastic,
        longName: "Peter [Bravo]",
        shortName: "B1",
      },
    });
    assert.deepEqual(profile.meshtastic.firmware, {
      recommendedVersion: "2.8",
      line: "2.8",
      minimumVersion: "2.8.1",
      channel: "alpha",
      verified: true,
      flasherUrl: "https://flasher.meshtastic.org/",
      flashingNotes: profile.meshtastic.firmware?.flashingNotes ?? null,
    });
    assert.deepEqual(channelSummary(profile), [
      "Event*:included",
      "Bravo:included",
      "Command:on-site",
    ]);
  });

  void it("hands the secret channel to Peter once it is released", async () => {
    const command = await request(app)
      .get(`/api/v1/events/${eventId}/meshtastic/channels/${commandId}`)
      .set("Cookie", admin.cookie);
    await request(app)
      .post(`/api/v1/events/${eventId}/meshtastic/channels/${commandId}/release`)
      .set("Cookie", admin.cookie)
      .send({ version: (command.body as { version: number }).version })
      .expect(200);

    assert.deepEqual(channelSummary(await profileAs(admin.cookie)), [
      "Event*:included",
      "Bravo:included",
      "Command:included",
    ]);
  });

  void it("lets Peter claim access and read only his own profile", async () => {
    const claim = await request(app)
      .post(`/api/v1/events/${eventId}/members/${memberId}/claims`)
      .set("Cookie", admin.cookie)
      .expect(201);
    const exchanged = await request(app)
      .post("/api/v1/auth/claims/exchange")
      .send({ token: (claim.body as { token: string }).token })
      .expect(200);
    peterCookie = (exchanged.headers["set-cookie"] as unknown as string[])
      .map((value) => value.split(";")[0])
      .join("; ");

    const memberships = await request(app)
      .get("/api/v1/me/event-memberships")
      .set("Cookie", peterCookie)
      .expect(200);
    assert.deepEqual(
      (memberships.body as Array<{ memberId: string; callsign: string }>).map(({ memberId: id, callsign }) => [id, callsign]),
      [[memberId, "Peter [Bravo]"]],
    );

    assert.equal((await profileAs(peterCookie)).callsign, "Peter [Bravo]");
    await request(app).get("/api/v1/events").set("Cookie", peterCookie).expect(200);
    await request(app)
      .get(`/api/v1/events/${eventId}/members`)
      .set("Cookie", peterCookie)
      .expect(404);
  });

  void it("shows group changes to Peter only after they are published", async () => {
    const group = await request(app).get(`/api/v1/events/${eventId}/groups/${bravoId}`).set("Cookie", admin.cookie);
    await request(app)
      .put(`/api/v1/events/${eventId}/groups/${bravoId}`)
      .set("Cookie", admin.cookie)
      .send({
        version: (group.body as { version: number }).version,
        name: "Bravo",
        slug: "bravo",
        description: null,
        provisioning: { ...bravoProvisioning, tak: { ...bravoProvisioning.tak, team: "Dark Blue" } },
      })
      .expect(200);

    assert.equal((await profileAs(peterCookie)).tak.team, "Purple");
    await request(app)
      .post(`/api/v1/events/${eventId}/configuration-revisions`)
      .set("Cookie", admin.cookie)
      .expect(200);
    const updated = await profileAs(peterCookie);
    assert.equal(updated.tak.team, "Dark Blue");
    assert.equal(updated.configurationRevision?.number, 2);
  });

  void it("deletes Peter's event account once the event is archived", async () => {
    await request(app)
      .post(`/api/v1/events/${eventId}/archive`)
      .set("Cookie", admin.cookie)
      .send({ version: 2 })
      .expect(200);

    await profileAs(peterCookie, 401);
    assert.equal(await database.externalIdentity.count(), 0);
    await profileAs(admin.cookie, 404);
  });
});
