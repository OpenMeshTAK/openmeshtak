import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createEvent, createUser, type TestUser } from "./support/identity.js";

interface ProblemBody {
  code?: string;
  errors?: Array<{ field: string; code: string }>;
}

interface GroupBody {
  id: string;
  version: number;
  provisioning: {
    callsignFormat: string;
    shortNamePrefix: string | null;
    tak: { team: string; role: string; serverGroups: string[] };
  };
}

const bravo = {
  callsignFormat: "{username} [Bravo]",
  shortNamePrefix: "B",
  tak: { team: "Purple", role: "Team Member", serverGroups: ["global", "bravo"] },
};

let app: Express;
let admin: TestUser;
let eventId: string;

function createGroup(slug: string, provisioning?: unknown): request.Test {
  return request(app)
    .post(`/api/v1/events/${eventId}/groups`)
    .set("Cookie", admin.cookie)
    .send({ name: slug, slug, ...(provisioning === undefined ? {} : { provisioning }) });
}

void describe("event group provisioning", () => {
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

  void it("stores the Bravo example settings", async () => {
    const group = (await createGroup("bravo", bravo).expect(201)).body as GroupBody;
    assert.deepEqual(group.provisioning, bravo);
  });

  void it("applies defaults and leaves a colliding default prefix unset", async () => {
    const first = (await createGroup("bravo").expect(201)).body as GroupBody;
    assert.deepEqual(first.provisioning, {
      callsignFormat: "{username}",
      shortNamePrefix: "B",
      tak: { team: "Cyan", role: "Team Member", serverGroups: [] },
    });

    const second = (await createGroup("blue").expect(201)).body as GroupBody;
    assert.equal(second.provisioning.shortNamePrefix, null);

    const conflict = await createGroup("black", { ...bravo, shortNamePrefix: "B" }).expect(409);
    assert.equal((conflict.body as ProblemBody).code, "SHORT_NAME_PREFIX_CONFLICT");
  });

  void it("rejects values outside the upstream TAK and Meshtastic sets", async () => {
    for (const provisioning of [
      { ...bravo, tak: { ...bravo.tak, team: "Pink" } },
      { ...bravo, tak: { ...bravo.tak, role: "Admiral" } },
      { ...bravo, shortNamePrefix: "BRAV" },
      { ...bravo, shortNamePrefix: "b" },
    ]) {
      await createGroup("bravo", provisioning).expect(422);
    }
  });

  void it("validates callsign placeholders and duplicates", async () => {
    const response = await createGroup("bravo", {
      ...bravo,
      callsignFormat: "{name} [Bravo]",
      tak: { ...bravo.tak, serverGroups: ["global", "global"] },
    }).expect(422);

    assert.deepEqual(
      (response.body as ProblemBody).errors?.map(({ code }) => code),
      ["UNKNOWN_PLACEHOLDER", "USERNAME_REQUIRED", "DUPLICATE"],
    );
  });

  void it("replaces settings on update and checks prefix uniqueness against other groups", async () => {
    const alpha = (await createGroup("alpha").expect(201)).body as GroupBody;
    const group = (await createGroup("bravo", bravo).expect(201)).body as GroupBody;

    const updated = await request(app)
      .put(`/api/v1/events/${eventId}/groups/${group.id}`)
      .set("Cookie", admin.cookie)
      .send({
        version: group.version,
        name: "Bravo",
        slug: "bravo",
        description: null,
        provisioning: { ...bravo, tak: { ...bravo.tak, role: "Team Lead" } },
      })
      .expect(200);
    assert.equal((updated.body as GroupBody).provisioning.tak.role, "Team Lead");

    const conflict = await request(app)
      .put(`/api/v1/events/${eventId}/groups/${group.id}`)
      .set("Cookie", admin.cookie)
      .send({
        version: 2,
        name: "Bravo",
        slug: "bravo",
        description: null,
        provisioning: { ...bravo, shortNamePrefix: alpha.provisioning.shortNamePrefix },
      })
      .expect(409);
    assert.equal((conflict.body as ProblemBody).code, "SHORT_NAME_PREFIX_CONFLICT");
  });
});
