/** Meshtastic node numbers are unsigned 32-bit; 0 is unset and 0xffffffff is the broadcast address. */
export const MAX_NODE_NUM = 0xfffffffe;

/** The node number as Meshtastic shows it, e.g. `!a1b2c3d4`. */
export function nodeIdOf(nodeNum: number): string {
  return `!${nodeNum.toString(16).padStart(8, "0")}`;
}

export function nodeNumOf(nodeId: string): number {
  return Number.parseInt(nodeId.slice(1), 16);
}

/**
 * The CoT UID of a node no member is bound to. It depends only on the node, so its recorded track
 * stays one track; binding the node later does not rewrite it.
 */
export function unboundNodeUid(nodeId: string): string {
  return `meshtastic-${nodeId.slice(1)}`;
}
