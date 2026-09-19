import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meshtasticChannelUrl } from "../src/modules/meshtastic-channels/channel-url.js";

void describe("Meshtastic channel URLs", () => {
  void it("encodes the official single-channel ChannelSet shape as an additive URL", () => {
    const url = meshtasticChannelUrl({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Command",
      psk: Buffer.from("000102030405060708090a0b0c0d0e0f", "hex"),
      pskVersion: 3,
      primary: false,
      uplinkEnabled: true,
      downlinkEnabled: false,
      positionPrecision: 13,
    });

    assert.equal(
      url,
      "https://meshtastic.org/e/?add=true#CiYSEAABAgMEBQYHCAkKCwwNDg8aB0NvbW1hbmQlivwkQygBOgIIDQ",
    );
  });

  void it("uses the canonical replacement URL for a primary channel", () => {
    const url = meshtasticChannelUrl({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Primary",
      psk: Buffer.alloc(32, 4),
      pskVersion: 1,
      primary: true,
      uplinkEnabled: false,
      downlinkEnabled: false,
      positionPrecision: 0,
    });

    assert.match(url, /^https:\/\/meshtastic\.org\/e\/#[-_A-Za-z0-9]+$/);
  });
});
