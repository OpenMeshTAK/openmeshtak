import { CURSOR_ORDER } from "../../shared/pagination/cursor.js";

/**
 * Device order of an event's channels. The first channel is the primary channel; creation order
 * breaks ties so the order is always total.
 */
export const CHANNEL_DEVICE_ORDER = [{ sortOrder: "asc" }, ...CURSOR_ORDER] as const;
