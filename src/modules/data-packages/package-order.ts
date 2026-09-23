import type { Prisma } from "../../generated/prisma/client.js";

/** New packages are drawn on top of the existing ones. */
export async function nextPackageSortOrder(
  transaction: Pick<Prisma.TransactionClient, "dataPackage">,
  eventId: string,
): Promise<number> {
  const highest = await transaction.dataPackage.aggregate({ where: { eventId }, _max: { sortOrder: true } });
  return (highest._max.sortOrder ?? -1) + 1;
}
