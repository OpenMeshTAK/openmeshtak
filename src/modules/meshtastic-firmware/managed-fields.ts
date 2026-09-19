/**
 * Profile fields whose values OpenMeshTak resolves per member. A profile may mark only these keys
 * as `managedBy: "openmeshtak"`, because the generator has to know where each value comes from.
 * Supporting another managed value is a deliberate code change.
 */
export const MANAGED_FIELD_KEYS = ["longName", "shortName", "config.device.role"] as const;

export type ManagedFieldKey = (typeof MANAGED_FIELD_KEYS)[number];

export function isManagedFieldKey(key: string): key is ManagedFieldKey {
  return (MANAGED_FIELD_KEYS as readonly string[]).includes(key);
}
