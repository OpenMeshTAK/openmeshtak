import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PERMISSIONS } from "../src/shared/auth/permissions.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { sanitizeLogMetadata } from "../src/shared/logging/sanitize.js";
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

interface CreatedClaimBody {
  claim: { id: string; status: string };
  token: string;
  claimUrl: string;
}

interface PrincipalBody {
  type: string;
  id: string;
  permissions: unknown[];
}

let app: Express;
let admin: TestUser;
let eventId: string;
let memberId: string;
let peterUserId: string;

function claimsUrl(): string {
  return `/api/v1/events/${eventId}/members/${memberId}/claims`;
}

async function issueClaim(): Promise<CreatedClaimBody> {
  const response = await request(app).post(claimsUrl()).set("Cookie", admin.cookie).expect(201);
  assert.equal(response.headers["cache-control"], "no-store");
  return response.body as CreatedClaimBody;
}

function exchange(token: string): request.Test {
  return request(app).post("/api/v1/auth/claims/exchange").send({ token });
}

async function expectInvalid(token: string): Promise<void> {
  const response = await exchange(token).expect(401);
  assert.equal((response.body as ProblemBody).code, "INVALID_CLAIM");
}

void describe("participant claims", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", PERMISSIONS.map((permission) => ({ permission })));
    eventId = await createEvent();

    for (const kind of ["roles", "groups"]) {
      await request(app)
        .post(`/api/v1/events/${eventId}/${kind}`)
        .set("Cookie", admin.cookie)
        .send({ name: "Default", slug: kind === "roles" ? "participant" : "bravo" })
        .expect(201);
    }
    const bot = await createServiceAccountKey([{ permission: "members.sync", eventId }]);
    const synced = await request(app)
      .put(`/api/v1/events/${eventId}/external-members/discord/123456789`)
      .set("Authorization", `Bearer ${bot}`)
      .send({ username: "Peter", eventRole: "participant", group: "bravo" })
      .expect(200);
    const member = (synced.body as { member: { id: string; userId: string } }).member;
    memberId = member.id;
    peterUserId = member.userId;

    await request(app)
      .post(`/api/v1/events/${eventId}/activate`)
      .set("Cookie", admin.cookie)
      .send({ version: 1 })
      .expect(200);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("issues a one-time token that is stored only as a hash", async () => {
    const created = await issueClaim();

    assert.match(created.token, /^omtk_claim_[A-Za-z0-9_-]{43}$/);
    assert.ok(created.claimUrl.endsWith(`/claim#${created.token}`));
    assert.equal(created.claim.status, "open");

    const stored = await database.memberClaim.findUniqueOrThrow({ where: { id: created.claim.id } });
    assert.ok(!JSON.stringify(stored).includes(created.token));
    assert.ok(!JSON.stringify(await database.auditEvent.findMany()).includes(created.token));
    assert.deepEqual(sanitizeLogMetadata({ note: `link ${created.token}` }), { note: "link [REDACTED]" });
  });

  void it("exchanges a claim for a session of the member without extra rights", async () => {
    const { token } = await issueClaim();
    const response = await exchange(token).expect(200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal((response.body as { user: { id: string } }).user.id, peterUserId);

    const cookie = (response.headers["set-cookie"] as unknown as string[])
      .map((value) => value.split(";")[0])
      .join("; ");
    const principal = (await request(app).get("/api/v1/principal").set("Cookie", cookie).expect(200))
      .body as PrincipalBody;
    assert.equal(principal.type, "user");
    assert.equal(principal.id, peterUserId);
    assert.deepEqual(principal.permissions, []);

    const peter = await database.domainUser.findUniqueOrThrow({
      where: { id: peterUserId },
      include: { authSubject: { include: { accounts: true } } },
    });
    assert.ok(peter.authSubject);
    assert.equal(peter.authSubject.accounts.length, 0, "a claim never creates a password");

    const users = await request(app).get(`/api/v1/users/${peterUserId}`).set("Cookie", admin.cookie);
    assert.equal((users.body as { email: string | null }).email, null);
  });

  void it("rejects replay, superseded, revoked, expired and malformed claims alike", async () => {
    const consumed = await issueClaim();
    await exchange(consumed.token).expect(200);
    await expectInvalid(consumed.token);

    const superseded = await issueClaim();
    const current = await issueClaim();
    await expectInvalid(superseded.token);

    await request(app)
      .post(`${claimsUrl()}/${current.claim.id}/revoke`)
      .set("Cookie", admin.cookie)
      .expect(200);
    await expectInvalid(current.token);

    const expired = await issueClaim();
    await database.memberClaim.update({
      where: { id: expired.claim.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expectInvalid(expired.token);

    await expectInvalid("omtk_claim_short");
    await expectInvalid("not-a-claim");

    assert.ok((await database.auditEvent.count({ where: { action: "member-claim.exchange-failed" } })) >= 4);
  });

  void it("reuses the authentication subject on later claims", async () => {
    await exchange((await issueClaim()).token).expect(200);
    const subjects = await database.user.count();

    await exchange((await issueClaim()).token).expect(200);
    assert.equal(await database.user.count(), subjects);
  });

  void it("revokes open claims when the event is archived and only issues for active events", async () => {
    const open = await issueClaim();
    await request(app)
      .post(`/api/v1/events/${eventId}/archive`)
      .set("Cookie", admin.cookie)
      .send({ version: 2 })
      .expect(200);

    await expectInvalid(open.token);
    const response = await request(app).post(claimsUrl()).set("Cookie", admin.cookie).expect(409);
    assert.equal((response.body as ProblemBody).code, "EVENT_NOT_ACTIVE");

    await request(app)
      .post(`/api/v1/events/${eventId}/reactivate`)
      .set("Cookie", admin.cookie)
      .send({ version: 3 })
      .expect(200);
    await expectInvalid(open.token);
  });

  void it("keeps the internal session endpoint off the HTTP router", async () => {
    const response = await request(app)
      .post("/api/auth/openmeshtak/claim-session")
      .send({ authSubjectId: admin.authSubjectId, name: "Attacker", placeholderEmail: "x@example.test" });

    assert.equal(response.status, 404);
    assert.equal(response.headers["set-cookie"], undefined);
  });

  void it("requires member-claims.create to issue claims", async () => {
    const reader = await createUser("Reader", [{ permission: "members.read", eventId }]);
    await request(app).post(claimsUrl()).set("Cookie", reader.cookie).expect(403);
    await request(app).get(claimsUrl()).set("Cookie", reader.cookie).expect(200);
  });
});
