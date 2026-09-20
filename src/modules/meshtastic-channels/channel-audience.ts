import { randomUUID } from "node:crypto";
import type { MeshtasticChannelAudience, Prisma } from "../../generated/prisma/client.js";
import {
  audienceFromSelectors,
  audienceSelectors,
  type EventAudience,
} from "../event-audience/event-audience.js";

/** Key-holder selectors share the table with audience selectors and differ only by the flag. */
export function audienceRows(
  channelId: string,
  audience: EventAudience,
  keyHolder = false,
): Prisma.MeshtasticChannelAudienceCreateManyInput[] {
  return audienceSelectors(audience).map((target) => ({ id: randomUUID(), channelId, keyHolder, ...target }));
}

export function toAudience(rows: MeshtasticChannelAudience[], keyHolder = false): EventAudience {
  return audienceFromSelectors(rows.filter((row) => row.keyHolder === keyHolder));
}
