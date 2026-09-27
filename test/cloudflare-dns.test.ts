import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encryptAcmeApiToken } from "../src/modules/tak-server/acme-settings.js";
import { CloudflareDnsChallengeSolver } from "../src/modules/tak-server/cloudflare-dns.js";

void describe("Cloudflare ACME DNS solver", () => {
  void it("creates and removes only its DNS-01 TXT record with the scoped bearer token", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher = ((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ url, init });
      return Promise.resolve(
        init?.method === "POST"
          ? new Response(JSON.stringify({ success: true, result: { id: "record-id" } }), { status: 200 })
          : new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
    }) as typeof fetch;
    const solver = new CloudflareDnsChallengeSolver(
      "0123456789abcdef0123456789abcdef",
      encryptAcmeApiToken("cloudflare-secret"),
      fetcher,
    );

    const presented = await solver.present({
      identifier: "tak.example.org",
      challengeType: "dns-01",
      keyAuthorization: "dns-proof",
    });
    await presented.remove();

    assert.equal(calls.length, 2);
    assert.match(calls[0]?.url ?? "", /zones\/0123456789abcdef0123456789abcdef\/dns_records$/);
    assert.equal(new Headers(calls[0]?.init?.headers).get("authorization"), "Bearer cloudflare-secret");
    const requestBody = calls[0]?.init?.body;
    if (typeof requestBody !== "string") {
      assert.fail("Cloudflare request body must be JSON text");
    }
    assert.deepEqual(JSON.parse(requestBody), {
      type: "TXT",
      name: "_acme-challenge.tak.example.org",
      content: "dns-proof",
      ttl: 60,
      comment: "OpenMeshTak ACME challenge",
    });
    assert.match(calls[1]?.url ?? "", /dns_records\/record-id$/);
    assert.equal(new Headers(calls[1]?.init?.headers).get("authorization"), "Bearer cloudflare-secret");
  });
});
