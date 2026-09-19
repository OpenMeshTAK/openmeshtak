import { createHash } from "node:crypto";
import { create, toBinary } from "@bufbuild/protobuf";
import { AppOnly } from "@meshtastic/protobufs";

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
  const bytes = toBinary(
    AppOnly.ChannelSetSchema,
    create(AppOnly.ChannelSetSchema, {
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
    }),
  );
  const operation = input.primary ? "" : "?add=true";
  return `https://meshtastic.org/e/${operation}#${Buffer.from(bytes).toString("base64url")}`;
}
