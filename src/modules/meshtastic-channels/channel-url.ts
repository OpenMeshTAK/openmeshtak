import { createHash } from "node:crypto";
import protobuf from "protobufjs";

export interface ChannelUrlInput {
  id: string;
  name: string;
  psk: Uint8Array;
  pskVersion: number;
  primary: boolean;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  positionPrecision: number;
}

/*
 * This deliberately models only the upstream ChannelSet fields used by a channel handout. The
 * schema stays behind this boundary so feature code never has to know protobuf field numbers.
 * A complete device profile will add LoRaConfig separately once a real target has been declared.
 */
const channelSet = protobuf.Root.fromJSON({
  nested: {
    ModuleSettings: {
      fields: {
        positionPrecision: { type: "uint32", id: 1 },
      },
    },
    ChannelSettings: {
      fields: {
        psk: { type: "bytes", id: 2 },
        name: { type: "string", id: 3 },
        id: { type: "fixed32", id: 4 },
        uplinkEnabled: { type: "bool", id: 5 },
        downlinkEnabled: { type: "bool", id: 6 },
        moduleSettings: { type: "ModuleSettings", id: 7 },
      },
    },
    ChannelSet: {
      fields: {
        settings: { rule: "repeated", type: "ChannelSettings", id: 1 },
      },
    },
  },
}).lookupType("ChannelSet");

/**
 * Meshtastic asks for a new fixed32 channel ID after a wire-incompatible settings change. The
 * OpenMeshTak channel UUID plus key version gives every rotation a stable, non-secret ID without
 * adding another mutable database field.
 */
function protocolChannelId(id: string, pskVersion: number): number {
  return createHash("sha256").update(`${id}:${String(pskVersion)}`, "utf8").digest().readUInt32LE(0);
}

/** Builds the canonical Meshtastic /e/ URL containing one ChannelSet protobuf. */
export function meshtasticChannelUrl(input: ChannelUrlInput): string {
  const bytes = channelSet.encode({
    settings: [
      {
        psk: input.psk,
        name: input.name,
        id: protocolChannelId(input.id, input.pskVersion),
        uplinkEnabled: input.uplinkEnabled,
        downlinkEnabled: input.downlinkEnabled,
        moduleSettings: { positionPrecision: input.positionPrecision },
      },
    ],
  }).finish();
  const operation = input.primary ? "" : "?add=true";
  return `https://meshtastic.org/e/${operation}#${Buffer.from(bytes).toString("base64url")}`;
}
