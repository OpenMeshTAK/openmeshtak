import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { FirmwareReleaseFeed, parseFlasherReleases } from "../src/modules/meshtastic-firmware/firmware-release-feed.js";
import type { FirmwareReleaseListDto } from "../src/modules/meshtastic-firmware/firmware-release.dto.js";
import { useFirmwareReleaseFeed } from "../src/modules/meshtastic-firmware/firmware-releases.service.js";
import { disconnectDatabase } from "../src/shared/database/database.js";
import { clearDatabase, createUser, type TestUser } from "./support/identity.js";

/** Shaped like https://api.meshtastic.org/github/firmware/list on 2026-10-07, shortened. */
const FLASHER_LIST = {
  releases: {
    stable: [
      { id: "v2.7.26.54e0d8d", title: "Meshtastic Firmware 2.7.26.54e0d8d Beta", page_url: "https://example.org", zip_url: "x", release_notes: "<b>" },
      { id: "v2.7.15.567b8ea", title: "Meshtastic Firmware 2.7.15.567b8ea Beta" },
    ],
    alpha: [
      { id: "v2.8.2.abcdef1", title: "Meshtastic Firmware 2.8.2.abcdef1 Alpha" },
      { id: "v2.8.1.8e6a88d", title: "Meshtastic Firmware 2.8.1.8e6a88d Alpha" },
      { id: "v2.8.0.47db0e3", title: "Meshtastic Firmware 2.8.0.47db0e3 Alpha (Revoked)" },
      { id: "v2.7.25.104df5f", title: "Meshtastic Firmware 2.7.25.104df5f Alpha" },
      { id: "not-a-release", title: "Something else" },
    ],
  },
  pullRequests: [{ id: "12097", title: "Elecrow ThinkNode M5 InkHUD port" }],
};

function fakeFetcher(responses: Array<() => Response>): { fetcher: typeof fetch; calls: () => number } {
  let calls = 0;
  const fetcher = (() => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls += 1;
    return next === undefined ? Promise.reject(new Error("no response")) : Promise.resolve(next());
  }) as typeof fetch;
  return { fetcher, calls: () => calls };
}

const ok = (): Response => new Response(JSON.stringify(FLASHER_LIST), { status: 200 });
const offline = (): Response => {
  throw new TypeError("fetch failed");
};

void describe("firmware release feed", () => {
  void it("keeps full releases only, newest first, with the channel from the title", () => {
    const releases = parseFlasherReleases(FLASHER_LIST).map(({ version, build, channel }) => [
      `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`,
      build,
      channel,
    ]);
    assert.deepEqual(releases, [
      ["2.8.2", "abcdef1", "alpha"],
      ["2.8.1", "8e6a88d", "alpha"],
      ["2.7.26", "54e0d8d", "beta"],
      ["2.7.25", "104df5f", "alpha"],
      ["2.7.15", "567b8ea", "beta"],
    ]);
  });

  void it("keeps the last list when a later lookup fails and retries only after a pause", async () => {
    let now = 0;
    const { fetcher, calls } = fakeFetcher([ok, offline]);
    const feed = new FirmwareReleaseFeed(fetcher, () => now);

    const first = await feed.state();
    assert.equal(first.snapshot?.releases.length, 5);
    assert.equal(first.lastLookupFailed, false);

    now += 7 * 60 * 60 * 1000;
    await feed.state(); // returns the cached list and refreshes in the background
    await new Promise((resolve) => setImmediate(resolve));
    const afterFailure = await feed.state();
    assert.equal(afterFailure.lastLookupFailed, true);
    assert.equal(afterFailure.snapshot?.releases.length, 5);
    assert.equal(calls(), 2);

    now += 60 * 1000;
    await feed.state();
    assert.equal(calls(), 2);
  });

  void it("reports no list while the flasher has never been reached", async () => {
    const { fetcher } = fakeFetcher([offline]);
    const state = await new FirmwareReleaseFeed(fetcher).state();
    assert.equal(state.snapshot, null);
    assert.equal(state.lastLookupFailed, true);
  });
});

let app: Express;
let admin: TestUser;

void describe("firmware releases API", () => {
  beforeEach(async () => {
    await clearDatabase();
    app = createApp();
    admin = await createUser("Admin", [{ permission: "settings.manage" }, { permission: "events.manage" }]);
  });

  after(async () => {
    await clearDatabase();
    await disconnectDatabase();
  });

  void it("marks releases against the shipped profiles", async () => {
    useFirmwareReleaseFeed(new FirmwareReleaseFeed(fakeFetcher([ok]).fetcher));
    const list = (await request(app).get("/api/v1/meshtastic/firmware-releases").set("Cookie", admin.cookie).expect(200)).body as FirmwareReleaseListDto;
    assert.equal(list.status, "current");
    assert.ok(list.fetchedAt !== null);
    assert.deepEqual(
      list.releases.map(({ version, support, profileId }) => [version, support, profileId]),
      [
        ["2.8.2", "supported", "meshtastic-2.8"],
        ["2.8.1", "tested", "meshtastic-2.8"],
        ["2.7.26", "unsupported", null],
        ["2.7.25", "unsupported", null],
        ["2.7.15", "unsupported", null],
      ],
    );
    assert.equal(list.releases[1]?.releaseUrl, "https://github.com/meshtastic/firmware/releases/tag/v2.8.1.8e6a88d");
  });

  void it("returns an unknown list when the flasher cannot be reached", async () => {
    useFirmwareReleaseFeed(new FirmwareReleaseFeed(fakeFetcher([offline]).fetcher));
    const list = (await request(app).get("/api/v1/meshtastic/firmware-releases").set("Cookie", admin.cookie).expect(200)).body as FirmwareReleaseListDto;
    assert.deepEqual(list, { status: "unknown", fetchedAt: null, releases: [] });
  });

  void it("stops looking up releases once switched off", async () => {
    const { fetcher, calls } = fakeFetcher([ok]);
    useFirmwareReleaseFeed(new FirmwareReleaseFeed(fetcher));
    const settings = (await request(app).get("/api/v1/meshtastic/firmware-releases/settings").set("Cookie", admin.cookie).expect(200)).body as unknown;
    assert.deepEqual(settings, { checkEnabled: true, version: 0 });

    await request(app).put("/api/v1/meshtastic/firmware-releases/settings").set("Cookie", admin.cookie).send({ version: 0, checkEnabled: false }).expect(200);
    const list = (await request(app).get("/api/v1/meshtastic/firmware-releases").set("Cookie", admin.cookie).expect(200)).body as FirmwareReleaseListDto;
    assert.deepEqual(list, { status: "disabled", fetchedAt: null, releases: [] });
    assert.equal(calls(), 0);

    await request(app).put("/api/v1/meshtastic/firmware-releases/settings").set("Cookie", admin.cookie).send({ version: 0, checkEnabled: true }).expect(409);
  });

  void it("limits the list to event editors and the switch to settings managers", async () => {
    const participant = await createUser("Peter", []);
    await request(app).get("/api/v1/meshtastic/firmware-releases").set("Cookie", participant.cookie).expect(403);
    await request(app).get("/api/v1/meshtastic/firmware-releases/settings").set("Cookie", participant.cookie).expect(403);
    await request(app).put("/api/v1/meshtastic/firmware-releases/settings").set("Cookie", participant.cookie).send({ version: 0, checkEnabled: false }).expect(403);
    await request(app).get("/api/v1/meshtastic/firmware-releases").expect(401);
  });
});
