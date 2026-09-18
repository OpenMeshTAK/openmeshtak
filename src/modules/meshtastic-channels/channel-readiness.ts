import { database } from "../../shared/database/database.js";
import type { ProblemFieldError } from "../../shared/errors/problem-error.js";
import { CHANNEL_DEVICE_ORDER } from "./channel-order.js";

/**
 * Channel rules that depend on the whole event rather than one request: a secondary channel
 * without an audience would reach nobody, for example after its only group was deleted.
 */
export async function channelReadinessProblems(eventId: string): Promise<ProblemFieldError[]> {
  const channels = await database.meshtasticChannel.findMany({
    where: { eventId },
    orderBy: [...CHANNEL_DEVICE_ORDER],
    select: { name: true, audience: { where: { keyHolder: false }, select: { id: true } } },
  });

  return channels.slice(1).flatMap(({ name, audience }) =>
    audience.length > 0
      ? []
      : [
          {
            field: `channels.${name}.audience`,
            code: "REQUIRED",
            message: "Select the groups, roles or members who receive this channel.",
          },
        ],
  );
}
