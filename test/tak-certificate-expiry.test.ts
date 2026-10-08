import assert from "node:assert/strict";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { setEmailDeliveryForTests, type OutgoingEmail } from "../src/modules/email/mailer.js";
import { dueExpiryWarning, warnAboutExpiringCertificate } from "../src/modules/tak-server/certificate-expiry.js";
import { database, disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

const DAY = 86_400_000;
const now = new Date("2026-10-08T12:00:00Z");

async function verify(user: TestUser): Promise<void> {
  await database.user.update({ where: { id: user.authSubjectId }, data: { emailVerified: true } });
}

async function activeCertificate(source: string, daysLeft: number): Promise<void> {
  await database.takServerCertificate.create({
    data: {
      id: "certificate",
      source,
      hostName: "tak.example.org",
      certificateChainPem: "chain",
      keyEnvelope: "key",
      fingerprintSha256: "00",
      subject: "CN=tak.example.org",
      notAfter: new Date(now.getTime() + daysLeft * DAY),
      activeSlot: "active",
    },
  });
}

void describe("TAK certificate expiry warning", () => {
  let outbox: OutgoingEmail[];
  let admin: TestUser;

  beforeEach(async () => {
    await clearDatabase();
    admin = await createUser("Admin", [{ permission: "tak-server.manage" }]);
    await verify(admin);
    await createUser("Unverified admin", [{ permission: "tak-server.manage" }]);
    await verify(await createUser("Editor", [{ permission: "events.manage" }]));
    await database.emailSettings.create({
      data: { id: "email", enabled: true, host: "smtp.example.org", fromAddress: "noreply@example.org" },
    });
    outbox = [];
    setEmailDeliveryForTests((_settings, message) => {
      outbox.push(message);
      return Promise.resolve();
    });
  });

  afterEach(() => {
    setEmailDeliveryForTests(null);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("chooses each warning level once per certificate", () => {
    const notAfter = new Date(now.getTime() + 10 * DAY);
    assert.equal(dueExpiryWarning({ notAfter: new Date(now.getTime() + 20 * DAY), expiryWarningSentAt: null }, now), null);
    assert.equal(dueExpiryWarning({ notAfter, expiryWarningSentAt: null }, now), 14);
    assert.equal(dueExpiryWarning({ notAfter, expiryWarningSentAt: now }, now), null);
    const twoDaysLeft = new Date(notAfter.getTime() - 2 * DAY);
    assert.equal(dueExpiryWarning({ notAfter, expiryWarningSentAt: now }, twoDaysLeft), 3);
  });

  void it("emails verified TAK administrators once per level", async () => {
    await activeCertificate("added", 10);
    const adminEmail = (await database.user.findUniqueOrThrow({ where: { id: admin.authSubjectId } })).email;

    await warnAboutExpiringCertificate(now);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(outbox.map(({ to }) => to), [adminEmail]);
    assert.match(outbox[0]?.text ?? "", /Upload the renewed one/);

    await warnAboutExpiringCertificate(new Date(now.getTime() + DAY));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(outbox.length, 1, "the 14-day level is sent only once");

    await warnAboutExpiringCertificate(new Date(now.getTime() + 8 * DAY));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(outbox.length, 2, "the 3-day level follows");
  });

  void it("ignores certificates issued by the OpenMeshTak CA", async () => {
    await activeCertificate("issued", 2);
    await warnAboutExpiringCertificate(now);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(outbox.length, 0);
  });
});
